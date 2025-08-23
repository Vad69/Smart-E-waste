import express from 'express';
import { db } from '../db.js';
import { ensureAuthSecret, ensureInitialAdminPassword, hashPassword, verifyPassword, createAdminToken } from '../services/auth.js';

const router = express.Router();

// Ensure secret and initial password exist on first import
ensureAuthSecret();
ensureInitialAdminPassword();

router.post('/login', (req, res) => {
	const { username, password } = req.body || {};
	if (String(username) !== 'admin') return res.status(401).json({ error: 'Invalid credentials' });
	const salt = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password_salt')?.value || '';
	const hash = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_password_hash')?.value || '';
	if (!verifyPassword(String(password || ''), salt, hash)) return res.status(401).json({ error: 'Invalid credentials' });
	const token = createAdminToken();
	res.json({ token, user: { username: 'admin' } });
});

export default router;