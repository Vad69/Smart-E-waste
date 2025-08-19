import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, nowIso } from '../db.js';
import { classifyItem } from '../services/classifier.js';
import { generateQrSvg } from '../services/qr.js';

const router = express.Router();

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

router.get('/', (req, res) => {
	const { q = '', status, department_id, category_key, page = 1, limit = 50 } = req.query;
	const filters = [];
	const params = [];
	if (q) {
		filters.push('(name LIKE ? OR description LIKE ? OR serial_number LIKE ? OR asset_tag LIKE ?)');
		params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
	}
	if (status) { filters.push('status = ?'); params.push(status); }
	if (department_id) { filters.push('department_id = ?'); params.push(department_id); }
	if (category_key) { filters.push('category_key = ?'); params.push(category_key); }

	const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	const total = db.prepare(`SELECT COUNT(*) as c FROM items ${where}`).get(...params).c;
	const rows = db.prepare(`SELECT * FROM items ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), (Number(page) - 1) * Number(limit));
	res.json({ total, page: Number(page), limit: Number(limit), items: rows.map(mapItem) });
});

router.post('/', (req, res) => {
	const now = nowIso();
	const {
		name,
		description = '',
		department_id = null,
		condition = '',
		purchase_date = null,
		weight_kg = 0,
		serial_number = null,
		asset_tag = null,
		reported_by = null,
		category_key: categoryOverride = null
	} = req.body || {};

	if (!name) return res.status(400).json({ error: 'name is required' });

	const qr_uid = uuidv4();
	let category_key = null;
	let meta = null;
	if (['recyclable','reusable','hazardous'].includes(categoryOverride)) {
		category_key = categoryOverride;
		meta = {
			hazardous: categoryOverride === 'hazardous' ? 1 : 0,
			recyclable: categoryOverride === 'recyclable' ? 1 : 0,
			reusable: categoryOverride === 'reusable' ? 1 : 0,
			recommended_vendor_type: categoryOverride === 'hazardous' ? 'hazardous' : (categoryOverride === 'reusable' ? 'refurbisher' : 'recycler')
		};
	} else {
		meta = classifyItem({ name, description, condition, weight_kg });
		category_key = meta.category_key;
	}

	const insert = db.prepare(`INSERT INTO items (
		qr_uid, name, description, category_key, status, department_id, condition, purchase_date,
		weight_kg, hazardous, recyclable, reusable, serial_number, asset_tag, reported_by, created_at, updated_at
	) VALUES (?, ?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
	const info = insert.run(
		qr_uid, name, description, category_key, department_id, condition, purchase_date, weight_kg,
		meta.hazardous, meta.recyclable, meta.reusable, serial_number, asset_tag, reported_by, now, now
	);

	db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
		.run(info.lastInsertRowid, 'reported', 'Item reported and classified', now);

	const row = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
	res.status(201).json({ item: mapItem(row), recommended_vendor_type: meta.recommended_vendor_type });
});

router.get('/scan/:qr_uid', (req, res) => {
	const row = db.prepare('SELECT * FROM items WHERE qr_uid = ?').get(req.params.qr_uid);
	if (!row) return res.status(404).json({ error: 'Item not found' });
	res.json({ item: mapItem(row) });
});

router.get('/:id', (req, res) => {
	const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	if (!row) return res.status(404).json({ error: 'Item not found' });
	res.json({ item: mapItem(row) });
});

router.put('/:id', (req, res) => {
	const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	if (!existing) return res.status(404).json({ error: 'Item not found' });
	const now = nowIso();
	const updates = { ...existing, ...req.body };
	let classification = null;
	if (['recyclable','reusable','hazardous'].includes(req.body?.category_key)) {
		updates.category_key = req.body.category_key;
		updates.hazardous = req.body.category_key === 'hazardous' ? 1 : 0;
		updates.recyclable = req.body.category_key === 'recyclable' ? 1 : 0;
		updates.reusable = req.body.category_key === 'reusable' ? 1 : 0;
	} else if (req.body.name || req.body.description || req.body.condition || req.body.weight_kg !== undefined) {
		classification = classifyItem({ name: updates.name, description: updates.description, condition: updates.condition, weight_kg: updates.weight_kg });
		updates.category_key = classification.category_key;
		updates.hazardous = classification.hazardous;
		updates.recyclable = classification.recyclable;
		updates.reusable = classification.reusable;
	}

	db.prepare(`UPDATE items SET
		name = ?, description = ?, category_key = ?, department_id = ?, condition = ?, purchase_date = ?,
		weight_kg = ?, hazardous = ?, recyclable = ?, reusable = ?, serial_number = ?, asset_tag = ?, reported_by = ?, updated_at = ?
		WHERE id = ?
	`).run(
		updates.name, updates.description, updates.category_key, updates.department_id, updates.condition, updates.purchase_date,
		updates.weight_kg, updates.hazardous, updates.recyclable, updates.reusable, updates.serial_number, updates.asset_tag, updates.reported_by, now, req.params.id
	);

	if (classification) {
		db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
			.run(req.params.id, 'reclassified', `Auto classification updated to ${updates.category_key}`, now);
	}

	const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	res.json({ item: mapItem(row) });
});

router.post('/:id/status', (req, res) => {
	const { status, notes = '' } = req.body || {};
	if (!status) return res.status(400).json({ error: 'status is required' });
	const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	if (!existing) return res.status(404).json({ error: 'Item not found' });
	const now = nowIso();
	db.prepare('UPDATE items SET status = ?, updated_at = ? WHERE id = ?').run(status, now, req.params.id);
	db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
		.run(req.params.id, `status_${status}`, notes, now);
	const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
	res.json({ item: mapItem(row) });
});

router.get('/:id/events', (req, res) => {
	const rows = db.prepare('SELECT * FROM item_events WHERE item_id = ? ORDER BY created_at DESC').all(req.params.id);
	res.json({ events: rows });
});

router.post('/:id/events', (req, res) => {
	const { event_type, notes = '' } = req.body || {};
	if (!event_type) return res.status(400).json({ error: 'event_type is required' });
	const now = nowIso();
	db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
		.run(req.params.id, event_type, notes, now);
	res.status(201).json({ ok: true });
});

router.get('/:id/qr.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const svg = await generateQrSvg(row.qr_uid, 256);
		res.type('image/svg+xml').send(svg);
	} catch (e) {
		next(e);
	}
});

router.get('/:id/label.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT i.*, d.name as department_name FROM items i LEFT JOIN departments d ON i.department_id = d.id WHERE i.id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(300, Math.min(800, Number(req.query.size) || 600));
		const labelWidth = size + 260;
		const labelHeight = Math.max(size + 80, 320);
		const textX = size + 40;
		const qrSvg = await generateQrSvg(row.qr_uid, size);
		const qrInner = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
		const now = new Date().toISOString();
		const label = `<?xml version="1.0" encoding="UTF-8"?>
			<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}">
				<rect width="100%" height="100%" fill="#ffffff"/>
				<svg x="16" y="16" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrInner}</svg>
				<g font-family="Arial, Helvetica, sans-serif" fill="#111827">
					<text x="${textX}" y="36" font-size="16" font-weight="700">${escapeXml(row.name || 'Item')}</text>
					<text x="${textX}" y="60" font-size="12">Dept: ${escapeXml(row.department_name || 'N/A')}</text>
					<text x="${textX}" y="78" font-size="12">Status: ${escapeXml(row.status)}</text>
					<text x="${textX}" y="96" font-size="12">Category: ${escapeXml(row.category_key || 'N/A')}</text>
					<text x="${textX}" y="114" font-size="12">Condition: ${escapeXml(row.condition || 'N/A')}</text>
					<text x="${textX}" y="132" font-size="12">Desc: ${escapeXml((row.description || 'N/A').slice(0,60))}</text>
					<text x="${textX}" y="150" font-size="12">QR UID: ${escapeXml(row.qr_uid)}</text>
					<text x="${textX}" y="168" font-size="12">Created: ${escapeXml(row.created_at)}</text>
					<text x="${textX}" y="186" font-size="12">Updated: ${escapeXml(row.updated_at)}</text>
					<text x="16" y="${labelHeight - 16}" font-size="10" fill="#6b7280">Printed: ${escapeXml(now)}</text>
				</g>
			</svg>`;
		res.type('image/svg+xml').send(label);
	} catch (e) {
		next(e);
	}
});

function escapeXml(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default router;