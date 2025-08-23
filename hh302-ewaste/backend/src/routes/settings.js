import express from 'express';
import { db } from '../db.js';
import { hashPassword } from '../services/auth.js';

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
	res.json({ settings: obj });
});

// Update admin password
router.put('/admin-password', (req, res) => {
	const { new_password } = req.body || {};
	if (!new_password || String(new_password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
	const { salt, hash } = hashPassword(String(new_password));
	db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('admin_password_salt', salt);
	db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('admin_password_hash', hash);
	res.json({ ok: true });
});

export default router;

