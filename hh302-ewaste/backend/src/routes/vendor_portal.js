import express from 'express';
import { db } from '../db.js';
import { verifyPassword, generateSalt, hashPassword } from '../services/auth.js';

const router = express.Router();

function requireVendor(req, res, next) {
	if (req.user?.role !== 'vendor' || !req.user?.vendor_id) return res.status(403).json({ error: 'Forbidden' });
	next();
}

function mapItem(row) {
	if (!row) return null;
	return {
		id: row.id,
		qr_uid: row.qr_uid,
		name: row.name,
		description: row.description,
		category_key: row.category_key,
		status: row.status,
		department_id: row.department_id,
		condition: row.condition,
		purchase_date: row.purchase_date,
		weight_kg: row.weight_kg,
		hazardous: !!row.hazardous,
		recyclable: !!row.recyclable,
		reusable: !!row.reusable,
		serial_number: row.serial_number,
		asset_tag: row.asset_tag,
		reported_by: row.reported_by,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

router.get('/me', requireVendor, (req, res) => {
	const v = db.prepare('SELECT id, name, contact_name, phone, email, address, type, license_no, authorization_no, auth_valid_from, auth_valid_to, gst_no, capacity_tpm, categories_handled, username, active, created_at FROM vendors WHERE id = ?').get(req.user.vendor_id);
	if (!v) return res.status(404).json({ error: 'Vendor not found' });
	res.json({ vendor: v });
});

router.get('/items', requireVendor, (req, res) => {
	const id = Number(req.user.vendor_id);
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

router.get('/items/:id', requireVendor, (req, res) => {
	const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	if (!item) return res.status(404).json({ error: 'Item not found' });
	const has = db.prepare(`
		SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
		WHERE pi.item_id = ? AND p.vendor_id = ? LIMIT 1
	`).get(req.params.id, req.user.vendor_id);
	if (!has) return res.status(403).json({ error: 'Forbidden' });
	res.json({ item: mapItem(item) });
});

router.get('/scan/:code', requireVendor, (req, res) => {
	let code = decodeURIComponent(String(req.params.code || '')).trim();
	if (!code) return res.status(400).json({ error: 'invalid code' });
	try {
		if (/^https?:\/\//i.test(code)) {
			const u = new URL(code);
			code = u.searchParams.get('qr') || u.searchParams.get('uid') || u.searchParams.get('id') || u.pathname.split('/').filter(Boolean).pop() || code;
		}
	} catch (e) {}
	let row = db.prepare('SELECT * FROM items WHERE qr_uid = ?').get(code);
	if (!row && /^\d+$/.test(code)) row = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(code));
	if (!row) return res.status(404).json({ error: 'Not found' });
	const has = db.prepare(`
		SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
		WHERE pi.item_id = ? AND p.vendor_id = ? LIMIT 1
	`).get(row.id, req.user.vendor_id);
	if (!has) return res.status(403).json({ error: 'Forbidden' });
	res.json({ item: mapItem(row) });
});

router.post('/change-password', requireVendor, (req, res) => {
	const { current_password, new_password } = req.body || {};
	if (!current_password || !new_password) return res.status(400).json({ error: 'Missing current or new password' });
	const v = db.prepare('SELECT id, password_salt, password_hash FROM vendors WHERE id = ?').get(req.user.vendor_id);
	if (!v) return res.status(404).json({ error: 'Vendor not found' });
	if (!verifyPassword(current_password, v.password_salt, v.password_hash)) return res.status(401).json({ error: 'Invalid current password' });
	const salt = generateSalt(16);
	const hash = hashPassword(new_password, salt);
	db.prepare('UPDATE vendors SET password_salt = ?, password_hash = ?, password_plain_last = NULL WHERE id = ?').run(salt, hash, req.user.vendor_id);
	res.json({ ok: true });
});

export default router;