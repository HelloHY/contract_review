/**
 * @file utils/perfTimer.js
 * @brief 性能计时辅助：包裹关键业务步骤，自动记录开始/结束/耗时
 *
 * 使用方式：
 *   const perf = require('./utils/perfTimer');
 *   const timer = perf.start(logger, { stage: 'knowledge_search', reqId, label: '法条检索' });
 *   try {
 *     const result = await doWork();
 *     timer.end({ count: result.length });
 *   } catch (err) {
 *     timer.fail(err);
 *   }
 */

const start = (logger, { stage, reqId, label = stage } = {}) => {
    const t0 = process.hrtime.bigint();
    const meta = { stage, reqId };
    logger.info(`[PERF] ${label} 开始`, meta);

    const durationMs = () => Number(process.hrtime.bigint() - t0) / 1_000_000;

    return {
        end: (extra = {}) => {
            const ms = durationMs();
            logger.perf(`${label} 完成`, { ...meta, durationMs: Math.round(ms), ...extra });
        },
        fail: (err, extra = {}) => {
            const ms = durationMs();
            logger.perf(`${label} 失败`, { ...meta, durationMs: Math.round(ms), error: err?.message || String(err), ...extra });
            logger.error(`${label} 失败: ${err?.message || String(err)}`, { ...meta, ...extra, stack: err?.stack });
        },
    };
};

module.exports = { start };
