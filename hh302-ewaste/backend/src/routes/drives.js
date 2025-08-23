import express from 'express';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { db, nowIso } from '../db.js';
import { generateQrSvg } from '../services/qr.js';

const router = express.Router();

function mapDrive(row) {
	if (!row) return null;
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		start_date: row.start_date,
		end_date: row.end_date,
		location: row.location,
		capacity: row.capacity,
		points: row.points,
		campaign_id: row.campaign_id,
		qr_uid: row.qr_uid,
		created_at: row.created_at
	};
}

function aggregateCounts(driveId) {
	const counts = db.prepare(`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN category_key='recyclable' THEN 1 ELSE 0 END) as recyclable,
			SUM(CASE WHEN category_key='reusable' THEN 1 ELSE 0 END) as reusable,
			SUM(CASE WHEN category_key='hazardous' THEN 1 ELSE 0 END) as hazardous,
			SUM(CASE WHEN status IN ('recycled','refurbished','disposed') THEN 1 ELSE 0 END) as completed,
			SUM(CASE WHEN status NOT IN ('recycled','refurbished','disposed') THEN 1 ELSE 0 END) as open
		FROM items WHERE drive_id = ?
	`).get(driveId) || { total: 0, recyclable: 0, reusable: 0, hazardous: 0, completed: 0, open: 0 };
	return counts;
}

router.get('/', (req, res) => {
	const { q = '', page = 1, limit = 50 } = req.query;
	const filters = [];
	const params = [];
	if (q) { filters.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
	const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	const total = db.prepare(`SELECT COUNT(*) as c FROM drives ${where}`).get(...params).c;
	const rows = db.prepare(`SELECT * FROM drives ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), (Number(page)-1)*Number(limit));
	const drives = rows.map(r => ({ ...mapDrive(r), stats: aggregateCounts(r.id) }));
	res.json({ total, page: Number(page), limit: Number(limit), drives });
});

router.post('/', (req, res) => {
	const now = nowIso();
	const {
		title,
		description = '',
		department_id = null,
		counts = {}, // { recyclable, reusable, hazardous }
		item_name_prefix = ''
	} = req.body || {};
	if (!title) return res.status(400).json({ error: 'title is required' });
	const qr_uid = uuidv4();
	const info = db.prepare(`INSERT INTO drives (title, description, created_at, qr_uid) VALUES (?, ?, ?, ?)`)
		.run(title, description, now, qr_uid);
	const driveId = Number(info.lastInsertRowid);
	const toCreate = [
		{ key: 'recyclable', n: Number(counts.recyclable) || 0 },
		{ key: 'reusable', n: Number(counts.reusable) || 0 },
		{ key: 'hazardous', n: Number(counts.hazardous) || 0 }
	];
	const insertItem = db.prepare(`INSERT INTO items (
		qr_uid, name, description, category_key, status, department_id, condition, purchase_date,
		weight_kg, hazardous, recyclable, reusable, serial_number, asset_tag, reported_by, created_at, updated_at, drive_id
	) VALUES (?, ?, ?, ?, 'reported', ?, '', NULL, 0, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`);
	for (const { key, n } of toCreate) {
		for (let i = 0; i < n; i++) {
			const itemQr = uuidv4();
			const hazardous = key === 'hazardous' ? 1 : 0;
			const recyclable = key === 'recyclable' ? 1 : 0;
			const reusable = key === 'reusable' ? 1 : 0;
			const name = item_name_prefix ? `${item_name_prefix} - ${key} #${i+1}` : `${title} - ${key} #${i+1}`;
			insertItem.run(itemQr, name, `Drive ${title} item`, key, department_id, hazardous, recyclable, reusable, now, now, driveId);
			const itemId = db.prepare('SELECT last_insert_rowid() as id').get().id;
			db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
				.run(itemId, 'reported', `Item reported in drive ${title}`, now);
		}
	}
	const driveRow = db.prepare('SELECT * FROM drives WHERE id = ?').get(driveId);
	res.status(201).json({ drive: { ...mapDrive(driveRow), stats: aggregateCounts(driveId) } });
});

router.get('/scan/:code', (req, res) => {
	let code = decodeURIComponent(String(req.params.code || '')).trim();
	if (!code) return res.status(400).json({ error: 'invalid code' });
	try {
		if (/^https?:\/\//i.test(code)) {
			const u = new URL(code);
			code = u.searchParams.get('qr') || u.searchParams.get('uid') || u.searchParams.get('id') || u.pathname.split('/').filter(Boolean).pop() || code;
		}
	} catch (e) {}
	let row = db.prepare('SELECT * FROM drives WHERE qr_uid = ?').get(code);
	if (!row && /^\d+$/.test(code)) row = db.prepare('SELECT * FROM drives WHERE id = ?').get(Number(code));
	if (!row) return res.status(404).json({ error: 'Not found' });
	res.json({ drive: { ...mapDrive(row), stats: aggregateCounts(row.id) } });
});

router.get('/:id', (req, res) => {
	const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.id);
	if (!row) return res.status(404).json({ error: 'Drive not found' });
	res.json({ drive: { ...mapDrive(row), stats: aggregateCounts(row.id) } });
});

router.get('/:id/items', (req, res) => {
	const items = db.prepare('SELECT * FROM items WHERE drive_id = ? ORDER BY id DESC').all(req.params.id);
	res.json({ items });
});

router.get('/:id/qr.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT qr_uid FROM drives WHERE id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(64, Math.min(1024, Number(req.query.size) || 256));
		const svg = await generateQrSvg(row.qr_uid, size);
		res.type('image/svg+xml').send(svg);
	} catch (e) { next(e); }
});

function escapeXml(s) {
	return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/:id/label.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(300, Math.min(800, Number(req.query.size) || 600));
		const labelWidth = size + 380;
		const labelHeight = Math.max(size + 220, 520);
		const textX = size + 40;
		const qrSvg = await generateQrSvg(row.qr_uid || String(row.id), size);
		const qrInner = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
		const stats = aggregateCounts(row.id);

		// Facility settings
		const settingsRows = db.prepare('SELECT key, value FROM settings').all();
		const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

		const label = `<?xml version="1.0" encoding="UTF-8"?>
			<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}">
				<rect width="100%" height="100%" fill="#ffffff"/>
				<svg x="16" y="16" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrInner}</svg>
				<g font-family="Arial, Helvetica, sans-serif" fill="#111827">
					<text x="${textX}" y="36" font-size="16" font-weight="700">${escapeXml(row.title || 'Drive')}</text>
					<text x="${textX}" y="56" font-size="12">Facility: ${escapeXml(settings.facility_name || '')}</text>
					<text x="${textX}" y="72" font-size="12">Auth: ${escapeXml(settings.facility_authorization_no || '')}</text>
					<text x="${textX}" y="88" font-size="12">Contact: ${escapeXml(settings.facility_contact_name || '')} ${settings.facility_contact_phone ? '| ' + escapeXml(settings.facility_contact_phone) : ''}</text>
					<text x="${textX}" y="104" font-size="12">Address: ${escapeXml((settings.facility_address || '').slice(0, 60))}</text>
					<text x="${textX}" y="126" font-size="12">Items: ${stats.total} | Recyclable: ${stats.recyclable} | Refurbishable: ${stats.reusable} | Disposable: ${stats.hazardous}</text>
					<text x="${textX}" y="142" font-size="12">Open: ${stats.open} | Completed: ${stats.completed}</text>
					<text x="${textX}" y="162" font-size="12">Created: ${escapeXml(row.created_at || '')}</text>
					<text x="${textX}" y="178" font-size="12">QR UID: ${escapeXml(row.qr_uid || '')}</text>
					<text x="16" y="${labelHeight - 16}" font-size="10" fill="#6b7280">Printed: ${escapeXml(dayjs().format('YYYY-MM-DD HH:mm:ss'))}</text>
				</g>
			</svg>`;
		res.type('image/svg+xml').send(label);
	} catch (e) { next(e); }
});

export default router;