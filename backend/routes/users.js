/**
 * @file routes/users.js
 * @brief 用户路由：登录认证、角色管理、用户列表、审查历史
 *
 * 核心职责：
 * - /login 用户名密码登录，返回 userId + role
 * - /identify 浏览器指纹识别（兼容旧逻辑）
 * - GET / 用户列表（仅 admin）
 * - PUT /:id/role 修改角色（仅 admin）
 * - GET /:userId/history 审查历史
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../database');

const hashPassword = (pwd) => crypto.createHash('sha256').update(String(pwd)).digest('hex');

const sanitize = (user) => ({
    userId: user.id,
    username: user.username || '',
    displayName: user.display_name || user.username || '',
    role: user.role || 'user',
});

// 确保 admin 账号存在（默认 admin / admin123，可用环境变量覆盖）
const ensureAdminUser = async () => {
    try {
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const existing = await db('users').where({ username }).first();
        if (!existing) {
            await db('users').insert({
                username,
                password_hash: hashPassword(password),
                display_name: '管理员',
                role: 'admin',
            });
            console.log(`[Users] Default admin account created: ${username}`);
        }
    } catch (error) {
        console.warn('[Users] ensureAdminUser failed:', error.message);
    }
};
ensureAdminUser();

// POST /api/users/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const user = await db('users').where({ username }).first();
        if (!user || user.password_hash !== hashPassword(password)) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        res.json({ ...sanitize(user), isNew: false });
    } catch (error) {
        console.error('[ERROR] Login failed:', error);
        res.status(500).json({ error: 'Failed to login.' });
    }
});

// POST /api/users/identify (fingerprint fallback, legacy)
router.post('/identify', async (req, res) => {
    const { fingerprintId } = req.body;
    if (!fingerprintId) {
        return res.status(400).json({ error: 'Fingerprint ID is required.' });
    }
    try {
        let user = await db('users').where({ fingerprint_id: fingerprintId }).first();
        if (user) {
            res.json({ ...sanitize(user), isNew: false });
        } else {
            const [row] = await db('users').insert({ fingerprint_id: fingerprintId, role: 'user' }).returning('*');
            const created = Array.isArray(row) ? row[0] : row;
            const newUser = created && created.id ? created : await db('users').where({ fingerprint_id: fingerprintId }).first();
            res.status(201).json({ ...sanitize(newUser), isNew: true });
        }
    } catch (error) {
        console.error('[ERROR] User identification failed:', error);
        res.status(500).json({ error: 'Failed to identify or create user.' });
    }
});

// GET /api/users — 用户列表（仅 admin）
router.get('/', async (req, res) => {
    const userId = req.header('X-User-ID');
    if (!userId) return res.status(401).json({ error: 'User ID is required.' });
    try {
        const requester = await db('users').where({ id: userId }).first();
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: '需要管理员权限' });
        }
        const users = await db('users')
            .select('id', 'username', 'display_name', 'role', 'created_at')
            .orderBy('created_at', 'asc');
        res.json(users.map((u) => ({
            userId: u.id,
            username: u.username || '',
            displayName: u.display_name || '',
            role: u.role || 'user',
            createdAt: u.created_at,
        })));
    } catch (error) {
        console.error('[ERROR] Failed to list users:', error);
        res.status(500).json({ error: 'Failed to list users.' });
    }
});

// PUT /api/users/:id/role — 修改角色（仅 admin）
router.put('/:id/role', async (req, res) => {
    const userId = req.header('X-User-ID');
    const { id } = req.params;
    const { role } = req.body || {};
    if (!userId) return res.status(401).json({ error: 'User ID is required.' });
    if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'role 必须是 admin 或 user' });
    }
    try {
        const requester = await db('users').where({ id: userId }).first();
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: '需要管理员权限' });
        }
        if (Number(id) === Number(userId) && role !== 'admin') {
            return res.status(400).json({ error: '不能取消自己的管理员权限' });
        }
        await db('users').where({ id }).update({ role });
        res.json({ message: '角色已更新', userId: Number(id), role });
    } catch (error) {
        console.error('[ERROR] Failed to update role:', error);
        res.status(500).json({ error: 'Failed to update role.' });
    }
});

// GET /api/users/:userId/history
router.get('/:userId/history', async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }
    try {
        const contracts = await db('contracts')
            .where({ user_id: userId })
            .select('id', 'original_filename', 'status', 'created_at')
            .orderBy('created_at', 'desc');
        res.json(contracts);
    } catch (error) {
        console.error(`Error fetching history for user ${userId}:`, error);
        res.status(500).json({ error: 'Failed to retrieve history.' });
    }
});

module.exports = router;
