import express from 'express';
import { db } from '../db.js';
import { verifyPassword, generateSalt, hashPassword } from '../services/auth.js';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { formatInTz, nowInTz, DEFAULT_TZ } from '../time.js';

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

router.get('/cpcb/form6.pdf', requireVendor, (req, res) => {
	const { from, to } = req.query;
	const fromDate = from ? dayjs(from) : dayjs().subtract(7, 'day');
	const toDate = to ? dayjs(to) : dayjs();
	const fromIso = fromDate.toISOString();
	const toIso = toDate.toISOString();

	const settingsRows = db.prepare('SELECT key, value FROM settings').all();
	const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

	const vendor = db.prepare('SELECT id, name, address, authorization_no, gst_no FROM vendors WHERE id = ?').get(req.user.vendor_id);
	if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

	const pickups = db.prepare(`
		SELECT p.*
		FROM pickups p
		WHERE p.vendor_id = ? AND p.scheduled_date BETWEEN ? AND ?
		ORDER BY p.scheduled_date ASC
	`).all(vendor.id, fromIso, toIso);

	// Vendor-handled processed counts and weights within period
	const recycledCount = db.prepare(`
		SELECT COUNT(*) as c FROM items i
		WHERE i.status = 'recycled' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).c;
	const refurbishedCount = db.prepare(`
		SELECT COUNT(*) as c FROM items i
		WHERE i.status = 'refurbished' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).c;
	const disposedCount = db.prepare(`
		SELECT COUNT(*) as c FROM items i
		WHERE i.status = 'disposed' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).c;

	const recycledWeight = db.prepare(`
		SELECT IFNULL(SUM(i.weight_kg),0) as w FROM items i
		WHERE i.status = 'recycled' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).w;
	const refurbishedWeight = db.prepare(`
		SELECT IFNULL(SUM(i.weight_kg),0) as w FROM items i
		WHERE i.status = 'refurbished' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).w;
	const disposedWeight = db.prepare(`
		SELECT IFNULL(SUM(i.weight_kg),0) as w FROM items i
		WHERE i.status = 'disposed' AND i.updated_at BETWEEN ? AND ? AND EXISTS (
			SELECT 1 FROM pickup_items pi JOIN pickups p ON p.id = pi.pickup_id
			WHERE pi.item_id = i.id AND p.vendor_id = ?
		)
	`).get(fromIso, toIso, vendor.id).w;

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="vendor_${vendor.id}_form6_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

	const doc = new PDFDocument({ margin: 36 });
	doc.pipe(res);

	doc.fontSize(16).text('FORM 6 — Vendor Manifest Summary (E-Waste)', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')} | TZ: ${DEFAULT_TZ} | Generated: ${nowInTz()}`, { align: 'center' });
	doc.moveDown(1);

	doc.fontSize(12).text('Facility Details', { underline: true });
	doc.fontSize(10).text(`Name: ${settings.facility_name || ''}`);
	doc.text(`Address: ${settings.facility_address || ''}`);
	doc.text(`Authorization No: ${settings.facility_authorization_no || ''}`);
	doc.moveDown(0.5);

	doc.fontSize(12).text('Vendor Details', { underline: true });
	doc.fontSize(10).text(`Name: ${vendor.name}`);
	doc.text(`Address: ${vendor.address || '—'}`);
	doc.text(`Authorization No: ${vendor.authorization_no || '—'}`);
	doc.text(`GST: ${vendor.gst_no || '—'}`);
	doc.moveDown(0.5);

	doc.fontSize(12).text('Processed Items (Selected Period)', { underline: true });
	doc.fontSize(10).text(`Recycled: ${recycledCount} | Refurbished: ${refurbishedCount} | Disposed: ${disposedCount}`);
	doc.text(`Weights: Recycled ${Number(recycledWeight).toFixed(2)} kg | Refurbished ${Number(refurbishedWeight).toFixed(2)} kg | Disposed ${Number(disposedWeight).toFixed(2)} kg`);
	doc.moveDown(0.5);

	if (pickups.length === 0) {
		doc.text('No pickups for this vendor in the selected period.');
		doc.end();
		return;
	}

	pickups.forEach(p => {
		doc.fontSize(12).text(`Pickup #${p.id}`);
		doc.fontSize(10).text(`Scheduled: ${p.scheduled_date}`);
		if (p.manifest_no || p.transporter_name || p.vehicle_no) {
			doc.text(`Manifest: ${p.manifest_no || '—'} | Transporter: ${p.transporter_name || '—'} | Vehicle: ${p.vehicle_no || '—'} | Contact: ${p.transporter_contact || '—'}`);
		}
		const items = db.prepare('SELECT i.id, i.name, i.weight_kg, i.category_key, i.status FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ? ORDER BY i.id ASC').all(p.id);
		if (items.length === 0) {
			doc.text('  No items');
		} else {
			items.forEach(it => doc.text(`  - #${it.id} ${it.name} | ${it.category_key} | ${it.weight_kg || 0} kg | ${it.status}`));
		}
		doc.moveDown(0.5);
	});

	doc.end();
});

export default router;