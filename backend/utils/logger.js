/**
 * @file utils/logger.js
 * @brief 统一日志管理模块
 *
 * 核心职责：
 * - 提供带时间、级别、模块、请求 ID、操作阶段、错误堆栈的结构化日志
 * - 区分普通运行日志、错误日志、性能日志（分别落盘）
 * - 支持按天轮转、保留期限、可配置日志级别
 * - 隐私保护：提供脱敏辅助，不记录完整合同正文、令牌、密码
 *
 * 使用方式：
 *   const logger = require('./utils/logger').child({ module: 'knowledge', reqId });
 *   logger.info('检索完成', { stage: 'knowledge_search', count: 8 });
 *   logger.perf('检索耗时', { stage: 'knowledge_search', durationMs: 1200 });
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const LOG_DIR = process.env.LOG_DIR ? path.resolve(process.env.LOG_DIR) : path.resolve(__dirname, '..', 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_MAX_DAYS = process.env.LOG_MAX_DAYS || '14';

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, json } = winston.format;

// 基础 metadata（模块名、请求 ID、阶段）
const enrichFormat = printf((info) => {
    const ts = info.timestamp || new Date().toISOString();
    const level = info.level.toUpperCase().padStart(5);
    const mod = info.module ? `[${info.module}]` : '[app]';
    const req = info.reqId ? `(${info.reqId})` : '';
    const stage = info.stage ? `<${info.stage}>` : '';
    const msg = info.message || '';
    const extra = [];
    if (info.durationMs !== undefined) extra.push(`durationMs=${info.durationMs}`);
    if (info.count !== undefined) extra.push(`count=${info.count}`);
    if (info.error && typeof info.error === 'string') extra.push(`error="${info.error}"`);
    const extraStr = extra.length ? ` {${extra.join(', ')}}` : '';
    return `${ts} ${level} ${mod}${req}${stage} ${msg}${extraStr}`;
});

const consoleFormat = combine(
    timestamp(),
    colorize({ all: true }),
    enrichFormat
);

const fileFormat = combine(
    timestamp(),
    enrichFormat
);

const jsonFormat = combine(
    timestamp(),
    json()
);

const transports = [];

// Console transport（开发可见）
transports.push(new winston.transports.Console({
    level: LOG_LEVEL,
    format: consoleFormat,
}));

// 普通运行日志（含 info/warn/debug）
transports.push(new DailyRotateFile({
    level: 'info',
    filename: path.join(LOG_DIR, 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${LOG_MAX_DAYS}d`,
    format: fileFormat,
}));

// 错误日志（仅 error）
transports.push(new DailyRotateFile({
    level: 'error',
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${LOG_MAX_DAYS}d`,
    format: fileFormat,
}));

// 性能日志（独立文件，通过 custom level perf 区分；fallback 用 info 级别但独立文件）
transports.push(new DailyRotateFile({
    level: 'info',
    filename: path.join(LOG_DIR, 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: `${LOG_MAX_DAYS}d`,
    format: fileFormat,
}));

const logger = winston.createLogger({
    level: LOG_LEVEL,
    defaultMeta: {},
    transports,
    exitOnError: false,
});

// 自定义 perf 方法，同时写入 performance 文件（利用独立的 transport 过滤困难，改通过 filename 区分已够；
// 这里把 perf 打到独立 logger，避免污染普通 app 日志的读取体验）
const perfLogger = winston.createLogger({
    level: 'info',
    defaultMeta: {},
    transports: [
        new DailyRotateFile({
            filename: path.join(LOG_DIR, 'performance-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxFiles: `${LOG_MAX_DAYS}d`,
            format: fileFormat,
        }),
    ],
    exitOnError: false,
});

// 为根 logger 附加 perf 方法
logger.perf = (message, meta = {}) => {
    perfLogger.info(message, meta);
};

// 保存 winston 原生 child 方法，避免下方覆盖后递归
const winstonChild = logger.child.bind(logger);

// child logger 工厂：注入 module / reqId，并附加 perf 方法
logger.child = (meta = {}) => {
    const child = winstonChild(meta);
    child.perf = (msg, m = {}) => {
        perfLogger.info(msg, { ...meta, ...m });
    };
    return child;
};

// 脱敏辅助
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'jwt'];

const redactSensitive = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    for (const key of Object.keys(clone)) {
        const lower = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sk) => lower.includes(sk))) {
            clone[key] = '[REDACTED]';
        } else if (typeof clone[key] === 'object') {
            clone[key] = redactSensitive(clone[key]);
        }
    }
    return clone;
};

// 合同正文脱敏：只记录长度与哈希前缀，不记录原文
const redactContractText = (text, maxPreview = 0) => {
    const str = String(text || '');
    const len = str.length;
    if (len === 0) return { length: 0, preview: '' };
    const preview = maxPreview > 0 ? str.slice(0, maxPreview).replace(/\s+/g, ' ') + (len > maxPreview ? '...' : '') : '[REDACTED]';
    return { length: len, preview };
};

module.exports = {
    logger,
    perfLogger,
    redactSensitive,
    redactContractText,
    LOG_DIR,
    LOG_LEVEL,
};
