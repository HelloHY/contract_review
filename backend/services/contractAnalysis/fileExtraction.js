/**
 * @file services/contractAnalysis/fileExtraction.js
 * @brief 从上传的合同文件中提取文本内容，并识别扫描件 PDF
 *
 * 核心职责：
 * - 解析 .docx 与 .pdf 文件，提取纯文本供后续分析使用
 * - 检测图像型扫描件 PDF，避免无文本可提取的无效分析
 * - 提供合同正文包装标记，便于 LLM 识别合同上下文边界
 *
 * 关键实现：
 * - 使用 mammoth 提取 DOCX 原始文本，空文本时抛出 EMPTY_TEXT
 * - 使用 pdf-parse 解析 PDF，按每页平均字符数判断是否为扫描件
 * - 通过 BEGIN/END_CONTRACT_CONTENT 标记包裹合同正文
 *
 * 依赖关系：
 * - 上游：path、fs、mammoth、pdf-parse
 * - 下游：被分析流程（analysisCore、backgroundAnalysis）及上传接口调用
 */
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const { logger } = require('../../utils/logger');

// 检测 PDF 是否为扫描件（图像型）：文本极少且页数大于0
const detectScannedPdf = (pdfData) => {
    const text = String(pdfData.text || '').replace(/\s+/g, '');
    const pageCount = pdfData.numpages || (pdfData.info && pdfData.info.Pages) || 1;
    // 每页平均有效字符少于 50 视为扫描件
    const avgCharsPerPage = text.length / Math.max(pageCount, 1);
    return {
        isScanned: pageCount > 0 && avgCharsPerPage < 50,
        textLength: text.length,
        pageCount,
        avgCharsPerPage: Math.round(avgCharsPerPage),
    };
};

/**
 * 从文件中提取文本
 * @param {string} filePath 文件路径
 * @param {object} [options]
 * @param {boolean} [options.ocrFallback] 检测到扫描件 PDF 时是否自动走本地 OCR（默认 false，保持原报错行为）
 * @param {(info: {page:number, totalPages:number}) => void} [options.onProgress] OCR 逐页进度回调
 */
const extractTextFromFile = async (filePath, { onProgress = null, ocrFallback = false } = {}) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.docx') {
        const { value } = await mammoth.extractRawText({ path: filePath });
        if (!value || !value.trim()) {
            const err = new Error('DOCX 文本提取为空，文件可能已损坏或为空文档。');
            err.code = 'EMPTY_TEXT';
            throw err;
        }
        return value;
    }
    if (ext === '.pdf') {
        const data = await pdf(fs.readFileSync(filePath));
        const scanInfo = detectScannedPdf(data);
        if (scanInfo.isScanned || !data.text || !data.text.trim()) {
            // 扫描件兜底：调用方显式开启且 OCR 未禁用时，自动走本地 OCR
            if (ocrFallback && process.env.PDF_OCR_ENABLED !== 'false') {
                // mtime 缓存：避免 pre-analyze + analyze 对同一份扫描件重复 OCR
                const cachePath = `${filePath}.ocr.txt`;
                try {
                    if (fs.existsSync(cachePath)) {
                        const cacheStat = fs.statSync(cachePath);
                        const fileStat = fs.statSync(filePath);
                        if (cacheStat.mtimeMs >= fileStat.mtimeMs) {
                            const cached = fs.readFileSync(cachePath, 'utf8');
                            if (cached.trim()) return cached;
                        }
                    }
                    // 惰性加载，避免原生依赖不可用时影响主流程启动
                    const { extractTextFromScannedPdf } = require('./pdfOcr');
                    const ocrResult = await extractTextFromScannedPdf(filePath, { onProgress });
                    if (ocrResult.text && ocrResult.text.trim()) {
                        const note = ocrResult.truncated ? `（仅识别前 ${ocrResult.ocrPages}/${ocrResult.pageCount} 页）` : '';
                        const finalText = `[OCR 识别文本，关键数字请人工复核${note}]\n${ocrResult.text}`;
                        try { fs.writeFileSync(cachePath, finalText, 'utf8'); } catch { /* 缓存写入失败不阻断 */ }
                        return finalText;
                    }
                } catch (ocrError) {
                    logger.error('扫描件 OCR 识别失败', { module: 'fileExtraction', stage: 'ocr', message: ocrError.message, stack: ocrError.stack });
                }
                const err = new Error('该 PDF 为扫描件，OCR 未能识别出有效文本。请检查扫描件清晰度，或上传可复制的文字版 PDF。');
                err.code = 'SCANNED_PDF';
                err.scanInfo = scanInfo;
                throw err;
            }
            const err = new Error('该 PDF 疑似扫描件（图像型），无法提取文本内容。请上传可复制的文字版 PDF，或先用 OCR 工具转换为文字版后再上传。');
            err.code = 'SCANNED_PDF';
            err.scanInfo = scanInfo;
            throw err;
        }
        return data.text;
    }
    const err = new Error(`Unsupported file extension: ${ext}`);
    err.code = 'UNSUPPORTED_FILE_TYPE';
    throw err;
};

const CONTRACT_CONTENT_BEGIN = '[BEGIN_CONTRACT_CONTENT]';
const CONTRACT_CONTENT_END = '[END_CONTRACT_CONTENT]';

const wrapContractContent = (text) => [
    CONTRACT_CONTENT_BEGIN,
    String(text || ''),
    CONTRACT_CONTENT_END,
].join('\n');

module.exports = {
    detectScannedPdf,
    extractTextFromFile,
    CONTRACT_CONTENT_BEGIN,
    CONTRACT_CONTENT_END,
    wrapContractContent,
};
