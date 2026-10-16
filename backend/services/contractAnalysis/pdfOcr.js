/**
 * @file services/contractAnalysis/pdfOcr.js
 * @brief 扫描件（图像型）PDF 的本地 OCR 文本提取服务
 *
 * 核心职责：
 * - 将扫描件 PDF 逐页渲染为图片（pdfjs-dist legacy + @napi-rs/canvas）
 * - 使用 tesseract.js 本地 OCR 识别中文/英文文本（离线 traineddata）
 * - 逐页回调进度，供分析流程推送实时状态
 *
 * 关键实现：
 * - pdfjs-dist 锁 v3.11.174 legacy 构建以兼容 CommonJS require
 * - NodeCanvasFactory 适配 @napi-rs/canvas（Windows 预编译二进制，免 node-gyp）
 * - 单 tesseract worker 顺序处理所有页面，峰值内存可控（1 页 canvas + worker）
 * - traineddata 从本地 TESSDATA_DIR 读取（tessdata_fast），不访问 CDN
 *
 * 依赖关系：
 * - 上游：pdfjs-dist、@napi-rs/canvas、tesseract.js、fs、path
 * - 下游：被 fileExtraction.js 在检测到扫描件时惰性 require 调用
 *
 * 配置项（.env）：
 * - PDF_OCR_MAX_PAGES：最多 OCR 页数，超出截断（默认 30）
 * - PDF_OCR_SCALE：渲染缩放倍数，2.0 ≈ 144DPI，中文精度与速度平衡点（默认 2.0）
 * - PDF_OCR_LANG：tesseract 语言包（默认 chi_sim+eng）
 * - TESSDATA_DIR：traineddata 目录，相对 backend 根目录（默认 data/tessdata）
 */
const fs = require('fs');
const path = require('path');
const napiCanvas = require('@napi-rs/canvas');
const { logger } = require('../../utils/logger');
// pdfjs-dist v3 在 Node 下会尝试 require('canvas') 来 polyfill 这些全局对象；
// 预先用 @napi-rs/canvas 的实现注入，避免额外引入 node-canvas
for (const key of ['DOMMatrix', 'Path2D', 'ImageData']) {
    if (!globalThis[key] && napiCanvas[key]) globalThis[key] = napiCanvas[key];
}
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = napiCanvas;
const { createWorker, OEM } = require('tesseract.js');

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

const getConfig = (overrides = {}) => ({
    maxPages: Number(overrides.maxPages || process.env.PDF_OCR_MAX_PAGES || 30),
    scale: Number(overrides.scale || process.env.PDF_OCR_SCALE || 2.5),
    lang: overrides.lang || process.env.PDF_OCR_LANG || 'chi_sim+eng',
    langPath: path.resolve(BACKEND_ROOT, process.env.TESSDATA_DIR || 'data/tessdata'),
});

// pdfjs 在 Node 环境的 canvas 工厂适配器
class NodeCanvasFactory {
    create(width, height) {
        const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
        return { canvas, context: canvas.getContext('2d') };
    }
    reset(pair, width, height) {
        pair.canvas.width = Math.ceil(width);
        pair.canvas.height = Math.ceil(height);
    }
    destroy(pair) {
        // 宽高归零释放底层位图内存
        pair.canvas.width = 0;
        pair.canvas.height = 0;
        pair.canvas = null;
        pair.context = null;
    }
}

/**
 * 对扫描件 PDF 执行 OCR 提取全文
 * @param {string} filePath PDF 文件绝对路径
 * @param {object} [options]
 * @param {(info: {page:number, totalPages:number}) => void} [options.onProgress] 每页完成回调
 * @returns {Promise<{text:string, pageCount:number, ocrPages:number, truncated:boolean}>}
 */
const extractTextFromScannedPdf = async (filePath, options = {}) => {
    const config = getConfig(options);
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const log = logger.child({ module: 'pdfOcr', stage: 'ocr', file: path.basename(filePath) });

    const t0 = process.hrtime.bigint();
    log.info('扫描件 OCR 开始', { maxPages: config.maxPages, scale: config.scale, lang: config.lang });

    const data = new Uint8Array(fs.readFileSync(filePath));
    const canvasFactory = new NodeCanvasFactory();
    const loadingTask = pdfjsLib.getDocument({
        data,
        isEvalSupported: false,
        useWorkerFetch: false,
        disableFontFace: true,
        // 传入自定义 canvasFactory，避免 pdfjs 使用内置 NodeCanvasFactory（其硬编码 require('canvas')）
        canvasFactory,
    });
    const doc = await loadingTask.promise;

    const pageCount = doc.numPages;
    const ocrPages = Math.min(pageCount, config.maxPages);
    const truncated = pageCount > config.maxPages;

    // 单 worker 顺序识别所有页面，避免多 worker 并发撑爆内存
    const worker = await createWorker(config.lang, OEM.LSTM_ONLY, {
        langPath: config.langPath,
        cacheMethod: 'none',
        gzip: false,
    });

    const pageTexts = [];

    try {
        for (let pageNum = 1; pageNum <= ocrPages; pageNum += 1) {
            const page = await doc.getPage(pageNum);
            const viewport = page.getViewport({ scale: config.scale });
            const pair = canvasFactory.create(viewport.width, viewport.height);
            try {
                await page.render({
                    canvasContext: pair.context,
                    viewport,
                    canvasFactory,
                }).promise;
                const pngBuffer = pair.canvas.toBuffer('image/png');
                const { data: ocrData } = await worker.recognize(pngBuffer);
                pageTexts.push(String(ocrData?.text || '').trim());
            } finally {
                canvasFactory.destroy(pair);
                page.cleanup();
            }
            if (onProgress) onProgress({ page: pageNum, totalPages: ocrPages });
        }
    } finally {
        await worker.terminate();
        await doc.destroy();
    }

    const durationMs = Math.round(Number(process.hrtime.bigint() - t0) / 1_000_000);
    const totalChars = pageTexts.reduce((sum, t) => sum + t.length, 0);
    log.info('扫描件 OCR 完成', { pageCount, ocrPages, truncated, totalChars, durationMs });

    return {
        text: pageTexts.filter(Boolean).join('\n\n'),
        pageCount,
        ocrPages,
        truncated,
    };
};

module.exports = {
    extractTextFromScannedPdf,
};
