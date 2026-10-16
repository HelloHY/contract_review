/**
 * @file middleware/requestLogger.js
 * @brief Express 请求日志中间件 + 请求 ID 注入
 *
 * - 从请求头复用 x-request-id，或生成新的 UUID
 * - 将 reqId 挂载到 req.requestId，供下游业务链路复用
 * - 记录请求方法、URL、状态码、耗时；对 body 脱敏
 */
const { v4: uuidv4 } = require('uuid');
const { logger, redactSensitive } = require('../utils/logger');

const requestLogger = (req, res, next) => {
    const reqId = req.get('x-request-id') || uuidv4();
    req.requestId = reqId;

    const start = Date.now();
    const log = logger.child({ module: 'http', reqId });

    // 脱敏 body：避免记录密码、合同正文等
    const safeBody = redactSensitive(req.body);
    if (safeBody && typeof safeBody === 'object') {
        // 若 body 含长文本字段（如 contract text），进一步截断
        for (const key of Object.keys(safeBody)) {
            if (typeof safeBody[key] === 'string' && safeBody[key].length > 500) {
                safeBody[key] = `[长度${safeBody[key].length}，已截断]`;
            }
        }
    }

    log.info(`→ ${req.method} ${req.originalUrl || req.url}`, {
        stage: 'request_start',
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        body: safeBody,
    });

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
        log[level](`← ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, {
            stage: 'request_end',
            statusCode: res.statusCode,
            durationMs,
        });
    });

    next();
};

module.exports = requestLogger;
