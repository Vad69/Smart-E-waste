import express from 'express';
import { db, nowIso } from '../db.js';

const router = express.Router();

const VENDOR_TYPES = ['recycler', 'hazardous', 'refurbisher'];

function mapVendor(row) {
	if (!row) return null;
	return {
		id: row.id,
		name: row.name,
		contact_name: row.contact_name,
		phone: row.phone,
		email: row.email,
		address: row.address,
		type: row.type,
		license_no: row.license_no,
		authorization_no: row.authorization_no,
		auth_valid_from: row.auth_valid_from,
		auth_valid_to: row.auth_valid_to,
		gst_no: row.gst_no,
		capacity_tpm: row.capacity_tpm,
		categories_handled: row.categories_handled,
		active: row.active ?? 1,
		created_at: row.created_at
	};
}

function ensureActiveColumn() {
	try {
		const cols = db.prepare('PRAGMA table_info(vendors)').all();
		if (!cols.some(c => c.name === 'active')) {
			try { db.exec('ALTER TABLE vendors ADD COLUMN active INTEGER NOT NULL DEFAULT 1'); } catch {}
		}
	} catch {}
}

router.get('/types', (req, res) => {
	res.json({ types: VENDOR_TYPES });
});

router.get('/', (req, res) => {
	ensureActiveColumn();
	const { type, include_inactive } = req.query;
	const where = [];
	const params = [];
	if (include_inactive !== '1') where.push('active = 1');
	if (type) { where.push('type = ?'); params.push(type); }
	try {
		const sql = `SELECT * FROM vendors${where.length ? ' WHERE ' + where.join(' AND ') : ''} ORDER BY name ASC`;
		const rows = db.prepare(sql).all(...params);
		res.json({ vendors: rows.map(mapVendor) });
	} catch (e) {
		const rows = db.prepare('SELECT * FROM vendors ORDER BY name ASC').all();
		res.json({ vendors: rows.map(mapVendor) });
	}
});

router.post('/', (req, res) => {
	const now = nowIso();
	const { name, contact_name = null, phone = null, email = null, address = null, type, license_no = null,
		authorization_no = null, auth_valid_from = null, auth_valid_to = null, gst_no = null, capacity_tpm = null, categories_handled = null } = req.body || {};
	if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
	if (!VENDOR_TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });
	ensureActiveColumn();
	// Generate credentials
	function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12); }
	let base = slugify(name) || 'vendor';
	let candidate = base;
	let suffix = 0;
	while (true) {
		const row = db.prepare('SELECT 1 FROM vendors WHERE username = ?').get(candidate);
		if (!row) break;
		suffix += 1;
		candidate = `${base}${suffix}`;
	}
	const username = candidate;
	import('../services/auth.js').then(({ generateRandomPassword, generateSalt, hashPassword }) => {
		const password = generateRandomPassword(10);
		const salt = generateSalt(16);
		const hash = hashPassword(password, salt);
		const info = db.prepare('INSERT INTO vendors (name, contact_name, phone, email, address, type, license_no, created_at, active, authorization_no, auth_valid_from, auth_valid_to, gst_no, capacity_tpm, categories_handled, username, password_salt, password_hash, password_plain_last) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
			.run(name, contact_name, phone, email, address, type, license_no, now, authorization_no, auth_valid_from, auth_valid_to, gst_no, capacity_tpm, categories_handled, username, salt, hash, password);
		const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(info.lastInsertRowid);
		res.status(201).json({ vendor: mapVendor(row), credentials: { username, password } });
	}).catch(e => {
		res.status(500).json({ error: 'Failed to generate credentials' });
	});
});

router.get('/:id', (req, res) => {
	const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
	if (!row) return res.status(404).json({ error: 'Vendor not found' });
	res.json({ vendor: mapVendor(row) });
});

router.put('/:id', (req, res) => {
	const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
	if (!existing) return res.status(404).json({ error: 'Vendor not found' });
	const updates = { ...existing, ...req.body };
	if (updates.type && !VENDOR_TYPES.includes(updates.type)) return res.status(400).json({ error: 'invalid type' });
	db.prepare('UPDATE vendors SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, type = ?, license_no = ?, authorization_no = ?, auth_valid_from = ?, auth_valid_to = ?, gst_no = ?, capacity_tpm = ?, categories_handled = ? WHERE id = ?')
		.run(updates.name, updates.contact_name, updates.phone, updates.email, updates.address, updates.type, updates.license_no, updates.authorization_no, updates.auth_valid_from, updates.auth_valid_to, updates.gst_no, updates.capacity_tpm, updates.categories_handled, req.params.id);
	const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
	res.json({ vendor: mapVendor(row) });
});

router.delete('/:id', (req, res) => {
	ensureActiveColumn();
	db.prepare('UPDATE vendors SET active = 0 WHERE id = ?').run(req.params.id);
	res.json({ ok: true });
});

router.post('/:id/restore', (req, res) => {
	ensureActiveColumn();
	db.prepare('UPDATE vendors SET active = 1 WHERE id = ?').run(req.params.id);
	res.json({ ok: true });
});

router.get('/:id/credentials', (req, res) => {
	const v = db.prepare('SELECT username, password_plain_last FROM vendors WHERE id = ?').get(req.params.id);
	if (!v) return res.status(404).json({ error: 'Vendor not found' });
	res.json({ username: v.username || null, password: v.password_plain_last || null });
});

router.post('/:id/reset-password', (req, res) => {
	const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
	if (!existing) return res.status(404).json({ error: 'Vendor not found' });
	import('../services/auth.js').then(({ generateRandomPassword, generateSalt, hashPassword }) => {
		const password = generateRandomPassword(10);
		const salt = generateSalt(16);
		const hash = hashPassword(password, salt);
		db.prepare('UPDATE vendors SET password_salt = ?, password_hash = ?, password_plain_last = ? WHERE id = ?').run(salt, hash, password, req.params.id);
		res.json({ username: existing.username, password });
	}).catch(e => {
		res.status(500).json({ error: 'Failed to reset password' });
	});
});

router.get('/:id/items', (req, res) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ error: 'invalid id' });
	const items = db.prepare(`
		SELECT i.* FROM items i
		WHERE EXISTS (
			SELECT 1 FROM pickup_items pi
			JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
		ORDER BY i.updated_at DESC, i.id DESC
	`).all(id);
	res.json({ items: items.map(mapItem) });
});

export default router;