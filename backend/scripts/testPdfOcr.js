#!/usr/bin/env node
/**
 * @file scripts/testPdfOcr.js
 * @brief 扫描件 PDF OCR 功能命令行自动化测试
 *
 * 用法：
 *   node scripts/testPdfOcr.js                 仅跑本地测试（不依赖后端服务，约 30 秒）
 *   node scripts/testPdfOcr.js --api           额外跑 API 全链路（需后端在 3000 端口运行）
 *   node scripts/testPdfOcr.js --pages 3       指定测试样本页数（默认 2）
 *   node scripts/testPdfOcr.js --keep          保留生成的测试样本与 OCR 缓存
 *
 * 覆盖用例：
 *   1. 扫描件检测判定
 *   2. OCR 关闭时的回退报错
 *   3. OCR 提取文本并校验关键词
 *   4. OCR 结果缓存复用
 *   5. 超页数截断
 *   6. (--api) 上传 → 预分析 → 正式分析 全链路
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SAMPLE_PDF = path.join(BACKEND_ROOT, 'scripts', 'sample-scanned.pdf');
const CACHE_FILE = `${SAMPLE_PDF}.ocr.txt`;
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000/api';

// ===== 参数解析 =====
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(name);
const getOpt = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const RUN_API = hasFlag('--api');
const KEEP = hasFlag('--keep');
const PAGES = parseInt(getOpt('--pages', '2'), 10);

// ===== 极简断言与报告 =====
let passed = 0;
let failed = 0;
const results = [];

const check = (name, condition, detail = '') => {
    if (condition) {
        passed += 1;
        results.push(`  ✅ ${name}${detail ? `  ${detail}` : ''}`);
    } else {
        failed += 1;
        results.push(`  ❌ ${name}${detail ? `  ${detail}` : ''}`);
    }
};

const section = (title) => console.log(`\n=== ${title} ===`);

const run = async () => {
    console.log('扫描件 PDF OCR 功能测试');
    console.log(`后端根目录: ${BACKEND_ROOT}`);
    console.log(`测试样本:   ${SAMPLE_PDF} (${PAGES} 页)`);
    if (RUN_API) console.log(`API 地址:   ${API_BASE}`);

    // ===== 1. 生成测试样本 =====
    section('1. 生成扫描件测试样本');
    {
        const sizeBefore = fs.existsSync(SAMPLE_PDF) ? fs.statSync(SAMPLE_PDF).size : 0;
        execFileSync(process.execPath, [path.join(__dirname, 'makeScannedPdf.js'), String(PAGES), SAMPLE_PDF], {
            cwd: BACKEND_ROOT,
            stdio: 'inherit',
        });
        const sizeAfter = fs.statSync(SAMPLE_PDF).size;
        check('样本生成成功', sizeAfter > 1000, `${sizeAfter} bytes`);
        if (sizeBefore) console.log(`  （覆盖已存在的样本）`);
        // 清理旧缓存，保证后续用例从干净状态开始
        if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
    }

    const { extractTextFromFile, detectScannedPdf } = require(path.join(BACKEND_ROOT, 'services/contractAnalysis/fileExtraction'));
    const pdfParse = require(path.join(BACKEND_ROOT, 'node_modules/pdf-parse'));

    // ===== 2. 扫描件检测 =====
    section('2. 扫描件检测判定');
    {
        const info = detectScannedPdf(await pdfParse(fs.readFileSync(SAMPLE_PDF)));
        check('判定为扫描件', info.isScanned === true, JSON.stringify(info));
    }

    // ===== 3. OCR 关闭时的回退行为 =====
    section('3. OCR 关闭时（PDF_OCR_ENABLED=false）应回退报错');
    {
        process.env.PDF_OCR_ENABLED = 'false';
        let code = null;
        try {
            await extractTextFromFile(SAMPLE_PDF, { ocrFallback: true });
        } catch (e) {
            code = e.code;
        }
        check('抛出 SCANNED_PDF', code === 'SCANNED_PDF', `code=${code}`);
        delete process.env.PDF_OCR_ENABLED;
    }

    // ===== 4. OCR 提取并校验关键词 =====
    let ocrText = '';
    section('4. OCR 提取（含逐页进度）');
    {
        const t0 = Date.now();
        let lastProgress = null;
        ocrText = await extractTextFromFile(SAMPLE_PDF, {
            ocrFallback: true,
            onProgress: (p) => { lastProgress = p; },
        });
        const seconds = ((Date.now() - t0) / 1000).toFixed(1);
        check('返回非空文本', ocrText.length > 100, `${ocrText.length} 字, ${seconds}s`);
        check('逐页进度回调', lastProgress && lastProgress.page === PAGES,
            lastProgress ? `最后: 第 ${lastProgress.page}/${lastProgress.totalPages} 页` : '未收到回调');
        check('带人工复核标记', ocrText.startsWith('[OCR 识别文本，关键数字请人工复核'),
            ocrText.slice(0, 24));
        // 条款义务类文字识别稳定，作为关键词断言；大写金额识别不准故不断言
        for (const kw of ['合同价款', '质保金']) {
            check(`识别出关键词「${kw}」`, ocrText.includes(kw));
        }
        console.log(`\n  --- OCR 文本前 200 字 ---\n  ${ocrText.replace(/\n/g, '\n  ').slice(0, 220)}`);
    }

    // ===== 5. 缓存复用 =====
    section('5. OCR 结果缓存复用');
    {
        check('缓存文件已生成', fs.existsSync(CACHE_FILE),
            fs.existsSync(CACHE_FILE) ? `${fs.statSync(CACHE_FILE).size} bytes` : '未找到');
        const t0 = Date.now();
        const cachedText = await extractTextFromFile(SAMPLE_PDF, { ocrFallback: true });
        const ms = Date.now() - t0;
        check('二次调用命中缓存（<1s）', ms < 1000, `${ms} ms`);
        check('缓存内容一致', cachedText === ocrText);
    }

    // ===== 6. 超页数截断 =====
    section('6. 超页数截断（PDF_OCR_MAX_PAGES=1）');
    {
        const { extractTextFromScannedPdf } = require(path.join(BACKEND_ROOT, 'services/contractAnalysis/pdfOcr'));
        const r = await extractTextFromScannedPdf(SAMPLE_PDF, { maxPages: 1 });
        check('正确截断', r.truncated === true, `总页数 ${r.pageCount} / 实际识别 ${r.ocrPages}`);
        check('仅识别 1 页', r.ocrPages === 1);
    }

    // ===== 7. API 全链路（可选） =====
    if (RUN_API) {
        section('7. API 全链路（上传 → 预分析 → 正式分析）');
        try {
            // 探测后端是否在运行
            const probe = await fetch(`${API_BASE}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'admin123' }),
            });
            if (!probe.ok) throw new Error(`登录失败 HTTP ${probe.status}`);
            const login = await probe.json();
            check('admin 登录成功', !!login.userId, `userId=${login.userId} role=${login.role}`);
            const userId = String(login.userId);

            // 上传
            const fileBuf = fs.readFileSync(SAMPLE_PDF);
            const form = new FormData();
            form.append('file', new Blob([fileBuf], { type: 'application/pdf' }), 'sample-scanned.pdf');
            form.append('userId', userId);
            const upRes = await fetch(`${API_BASE}/contracts/upload`, { method: 'POST', body: form });
            const up = await upRes.json();
            check('上传成功', (upRes.status === 200 || upRes.status === 201) && !!up.contractId,
                `HTTP ${upRes.status} / contractId=${up.contractId}`);
            const contractId = up.contractId;

            // 预分析（内部触发 OCR）
            const t0 = Date.now();
            const preRes = await fetch(`${API_BASE}/contracts/pre-analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
                body: JSON.stringify({ contractId }),
            });
            const pre = await preRes.json();
            const preSec = ((Date.now() - t0) / 1000).toFixed(1);
            const charCount = pre.text_stats?.charCount || 0;
            check('预分析成功（扫描件未被拦截）', preRes.status === 200,
                `${pre.contract_type || pre.error} / ${charCount} 字 / ${preSec}s`);
            check('识别出合同类型', !!pre.contract_type, pre.contract_type || '');
            check('文本字数合理', charCount > 100, `${charCount} 字`);

            // 正式分析
            const anaRes = await fetch(`${API_BASE}/contracts/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
                body: JSON.stringify({ contractId, userPerspective: '发包人', preAnalysisData: pre }),
            });
            const ana = await anaRes.json();
            check('分析任务已启动', anaRes.status === 202 && !!ana.jobId, `jobId=${ana.jobId}`);

            // 轮询进度
            console.log('  轮询分析进度（最长 10 分钟）...');
            const deadline = Date.now() + 10 * 60 * 1000;
            let last = null;
            let lastLine = '';
            while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 5000));
                const stRes = await fetch(`${API_BASE}/contracts/analyze-status/${contractId}`, {
                    headers: { 'X-User-ID': userId },
                });
                last = await stRes.json();
                const line = `${String(last.percent).padStart(3)}%  ${last.currentStep || ''}`;
                // llm_review 步骤耗时最长，仅在进度变化时打印，避免刷屏
                if (line !== lastLine) {
                    console.log(`    ${line}`);
                    lastLine = line;
                }
                if (last.status !== 'running') break;
            }
            check('分析正常结束（未因 SCANNED_PDF 失败）', last && last.status !== 'failed',
                last ? `status=${last.status}` : '无状态');
            check('产出分析结果', !!last?.result || last?.percent === 100, `percent=${last?.percent}`);

            console.log(`\n  测试合同 contractId=${contractId}（可在文件库页面删除）`);
        } catch (e) {
            check('API 全链路', false, e.message);
            console.log('  （请确认后端已在 3000 端口运行：npm run dev）');
        }
    }

    // ===== 清理 =====
    if (!KEEP) {
        if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
        console.log('\n（已清理 OCR 缓存；测试样本保留在 scripts/sample-scanned.pdf，可用 --keep 保留缓存）');
    }

    // ===== 汇总 =====
    section('测试结果汇总');
    results.forEach((line) => console.log(line));
    console.log(`\n通过 ${passed} 项，失败 ${failed} 项`);
    process.exit(failed > 0 ? 1 : 0);
};

run().catch((e) => {
    console.error('\n[测试脚本异常]', e);
    process.exit(1);
});
