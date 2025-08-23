import express from 'express';
import { db } from '../db.js';
import { verifyPassword, signToken } from '../services/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) {
		return res.status(400).json({ error: 'Missing username or new password' });
	}
	if (username !== 'admin') {
		return res.status(401).json({ error: 'Invalid credentials' });
	}
	const saltRow = db.prepare("SELECT value FROM settings WHERE key='admin_password_salt'").get();
	const hashRow = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get();
	if (!saltRow || !hashRow) {
		return res.status(500).json({ error: 'Admin credentials not initialized' });
	}
	const ok = verifyPassword(password, saltRow.value, hashRow.value);
	if (!ok) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}
	const secretRow = db.prepare("SELECT value FROM settings WHERE key='auth_token_secret'").get();
	const token = signToken({ sub: 'admin', role: 'admin' }, secretRow?.value || 'insecure');
	res.json({ token });
});

export default router;