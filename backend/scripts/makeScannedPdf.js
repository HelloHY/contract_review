/**
 * @file scripts/makeScannedPdf.js
 * @brief 生成"纯图像"扫描件 PDF 测试样本（无文字层），用于验证 OCR 兜底流程
 *
 * 用法：node scripts/makeScannedPdf.js [页数] [输出路径]
 * 原理：@napi-rs/canvas 绘制中文合同条款 -> PNG -> pdfkit 嵌入（不写入任何文本节点）
 */
const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const PDFDocument = require('pdfkit');

const pages = Math.max(1, parseInt(process.argv[2] || '2', 10));
const outPath = process.argv[3] || path.join(__dirname, 'sample-scanned.pdf');

// 注册中文字体（Windows 系统字体）
const fontCandidates = [
    ['C:\\Windows\\Fonts\\simsun.ttc', 'SimSun'],
    ['C:\\Windows\\Fonts\\msyh.ttc', 'Microsoft YaHei'],
];
let fontFamily = 'sans-serif';
for (const [fontPath, family] of fontCandidates) {
    try {
        if (fs.existsSync(fontPath) && GlobalFonts.registerFromPath(fontPath, family)) {
            fontFamily = family;
            break;
        }
    } catch { /* 尝试下一个 */ }
}
console.log(`[makeScannedPdf] 使用字体: ${fontFamily}`);

const LINES = [
    '建 设 工 程 施 工 合 同',
    '',
    '发包人（甲方）：某某建设集团有限公司',
    '承包人（乙方）：某某建筑工程有限公司',
    '',
    '第一条 工程概况',
    '1.1 工程名称：城东安置房项目二期工程',
    '1.2 工程地点：本市城东新区规划路 18 号',
    '1.3 合同价款：人民币 12,580,000.00 元（大写：壹仟贰佰伍拾捌万元整）',
    '',
    '第二条 工期',
    '2.1 开工日期：2026 年 3 月 1 日，竣工日期：2027 年 2 月 28 日',
    '2.2 工期总日历天数：365 天',
    '',
    '第三条 付款方式',
    '3.1 预付款为合同价款的 10%，进度款按月支付已完成工程量的 80%',
    '3.2 质保金为结算价的 3%，缺陷责任期满后 28 日内无息返还',
];

const renderPage = (pageIndex) => {
    const canvas = createCanvas(1190, 1684); // A4 @144dpi
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1190, 1684);
    ctx.fillStyle = '#111111';
    ctx.font = `30px "${fontFamily}"`;
    LINES.forEach((line, i) => {
        const text = pageIndex === 0 ? line : `${line}（第 ${pageIndex + 1} 页）`;
        ctx.fillText(text, 80, 100 + i * 52);
    });
    return canvas.toBuffer('image/png');
};

const main = async () => {
    const doc = new PDFDocument({ size: 'A4', autoFirstPage: false });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    for (let i = 0; i < pages; i += 1) {
        doc.addPage({ margin: 0 });
        doc.image(renderPage(i), 0, 0, { width: 595.28, height: 841.89 });
    }
    doc.end();
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
    console.log(`[makeScannedPdf] 已生成 ${pages} 页纯图像 PDF: ${outPath} (${fs.statSync(outPath).size} bytes)`);
};

main().catch((err) => { console.error(err); process.exit(1); });
