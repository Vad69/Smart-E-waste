import express from 'express';
import { db } from '../db.js';
import { generateSalt, hashPassword, verifyPassword } from '../services/auth.js';

const router = express.Router();

const ALLOWED_KEYS = new Set([
	'facility_name',
	'facility_address',
	'facility_authorization_no',
	'facility_contact_name',
	'facility_contact_phone'
]);

router.get('/', (req, res) => {
	const rows = db.prepare('SELECT key, value FROM settings').all();
	const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
	// Hide sensitive keys
	delete obj.admin_password_hash;
	delete obj.admin_password_salt;
	delete obj.auth_token_secret;
	res.json({ settings: obj });
});

router.put('/', (req, res) => {
	const payload = req.body || {};
	const setStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
	for (const [k, v] of Object.entries(payload)) {
		if (!ALLOWED_KEYS.has(k)) continue;
		setStmt.run(k, String(v ?? ''));
	}
	const rows = db.prepare('SELECT key, value FROM settings').all();
	const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
	delete obj.admin_password_hash;
	delete obj.admin_password_salt;
	delete obj.auth_token_secret;
	res.json({ settings: obj });
});

router.post('/change-password', (req, res) => {
	const { currentPassword, newPassword } = req.body || {};
	if (!currentPassword || !newPassword) {
		return res.status(400).json({ error: 'Missing currentPassword or newPassword' });
	}
	const saltRow = db.prepare("SELECT value FROM settings WHERE key='admin_password_salt'").get();
	const hashRow = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get();
	if (!saltRow || !hashRow) {
		return res.status(500).json({ error: 'Admin credentials not initialized' });
	}
	if (!verifyPassword(currentPassword, saltRow.value, hashRow.value)) {
		return res.status(401).json({ error: 'Invalid current password' });
	}
	const newSalt = generateSalt(16);
	const newHash = hashPassword(newPassword, newSalt);
	const setStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
	setStmt.run('admin_password_salt', newSalt);
	setStmt.run('admin_password_hash', newHash);
	res.json({ ok: true });
});

export default router;

