/**
 * @file middleware/errorLogger.js
 * @brief Express 统一错误日志中间件
 *
 * - 捕获所有未被业务路由处理的错误
 * - 记录请求 ID、错误消息、堆栈、状态码
 * - 不暴露敏感信息到客户端
 * - 对 Multer / 已知错误码做友好返回
 */
const { logger } = require('../utils/logger');

const errorLogger = (err, req, res, next) => {
    const reqId = req.requestId || 'unknown';
    const log = logger.child({ module: 'error', reqId });

    // 已知错误码快速处理
    if (err.code === 'LIMIT_FILE_SIZE') {
        log.warn('文件大小超限', { stage: 'error_handler', code: err.code, maxBytes: '50MB' });
        return res.status(413).json({ error: '文件大小超过 50MB 限制，请压缩或拆分后上传。', code: 'FILE_TOO_LARGE' });
    }
    if (err.message && err.message.startsWith('UNSUPPORTED_FILE_TYPE')) {
        log.warn('不支持的文件类型', { stage: 'error_handler', code: err.code, message: err.message });
        return res.status(400).json({ error: '仅支持 .docx 和 .pdf 格式的文件。', code: 'UNSUPPORTED_FILE_TYPE' });
    }

    const statusCode = err.statusCode || err.status || 500;
    log.error('未捕获的异常', {
        stage: 'error_handler',
        statusCode,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl || req.url,
        method: req.method,
    });

    res.status(statusCode).json({
        error: statusCode >= 500 ? '服务器处理请求时发生错误。' : (err.message || '请求处理失败。'),
        code: err.code || 'INTERNAL_ERROR',
        requestId: reqId,
    });
};

module.exports = errorLogger;
