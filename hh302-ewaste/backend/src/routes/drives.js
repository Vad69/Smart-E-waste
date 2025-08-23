import express from 'express';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { db, nowIso } from '../db.js';
import { generateQrSvg } from '../services/qr.js';
import { formatInTz } from '../time.js';

const router = express.Router();

function normalizeLocalTime(input) {
	if (!input) return null;
	let s = String(input).trim();
	if (!s) return null;
	if (s.includes('T')) s = s.replace('T', ' ');
	const d = dayjs(s);
	if (!d.isValid()) return null;
	return d.format('YYYY-MM-DD HH:mm:ss');
}

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
		created_at: row.created_at,
		qr_uid: row.qr_uid,
		status: row.status,
		count_recyclable: row.count_recyclable || 0,
		count_refurbishable: row.count_refurbishable || 0,
		count_disposable: row.count_disposable || 0
	};
}

router.get('/', (req, res) => {
	const { q = '', status, page = 1, limit = 50 } = req.query;
	const filters = [];
	const params = [];
	if (q) { filters.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
	if (status) { filters.push('status = ?'); params.push(status); }
	const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	const total = db.prepare(`SELECT COUNT(*) as c FROM drives ${where}`).get(...params).c;
	const rows = db.prepare(`SELECT * FROM drives ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), (Number(page) - 1) * Number(limit));
	res.json({ total, page: Number(page), limit: Number(limit), drives: rows.map(mapDrive) });
});

// Create drive (bulk collection)
router.post('/', (req, res) => {
	const now = nowIso();
	const {
		title,
		description = '',
		start_date = null,
		end_date = null,
		location = '',
		capacity = null,
		points = 0,
		campaign_id = null,
		count_recyclable = 0,
		count_refurbishable = 0,
		count_disposable = 0,
		reported_time = null
	} = req.body || {};
	if (!title) return res.status(400).json({ error: 'title is required' });
	const rt = normalizeLocalTime(reported_time);
	const at = rt || now;
	const qr_uid = uuidv4();
	const insert = db.prepare(`INSERT INTO drives (
		title, description, start_date, end_date, location, capacity, points, campaign_id, created_at, qr_uid, status, count_recyclable, count_refurbishable, count_disposable
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reported', ?, ?, ?)`);
	const info = insert.run(title, description, start_date, end_date, location, capacity, points, campaign_id, at, qr_uid, Number(count_recyclable)||0, Number(count_refurbishable)||0, Number(count_disposable)||0);
	db.prepare('INSERT INTO drive_events (drive_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)').run(info.lastInsertRowid, 'reported', 'Drive created', at);
	const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(info.lastInsertRowid);
	res.status(201).json({ drive: mapDrive(row) });
});

// Fetch single drive
router.get('/:id', (req, res) => {
	const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.id);
	if (!row) return res.status(404).json({ error: 'Drive not found' });
	res.json({ drive: mapDrive(row) });
});

// Drive events
router.get('/:id/events', (req, res) => {
	const rows = db.prepare('SELECT * FROM drive_events WHERE drive_id = ? ORDER BY created_at ASC').all(req.params.id);
	res.json({ events: rows });
});

// Update drive status (similar workflow)
router.post('/:id/status', (req, res) => {
	const id = Number(req.params.id);
	const allowed = ['picked_up','recycled','refurbished','disposed'];
	const { status, manual_time, notes = '' } = req.body || {};
	if (!status || !allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
	const at = normalizeLocalTime(manual_time);
	if (!manual_time || !at) return res.status(400).json({ error: 'manual_time is required (use YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm)' });
	const drive = db.prepare('SELECT * FROM drives WHERE id = ?').get(id);
	if (!drive) return res.status(404).json({ error: 'Drive not found' });
	if (status === 'picked_up') {
		if (drive.status !== 'reported' && drive.status !== 'scheduled') return res.status(400).json({ error: 'Drive must be scheduled/reported before picked up' });
	} else {
		if (drive.status !== 'picked_up') return res.status(400).json({ error: 'Drive must be picked up before it can be processed' });
	}
	db.prepare('UPDATE drives SET status = ? WHERE id = ?').run(status, id);
	db.prepare('INSERT INTO drive_events (drive_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
		.run(id, status === 'picked_up' ? 'status_picked_up' : status === 'recycled' ? 'status_recycled' : status === 'refurbished' ? 'status_refurbished' : 'status_disposed', notes || `Status ${status}`, at);
	res.json({ ok: true });
});

// Simple QR-only SVG for drive
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

// Drive label SVG
router.get('/:id/label.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(300, Math.min(800, Number(req.query.size) || 600));
		const labelWidth = size + 420;
		const labelHeight = Math.max(size + 240, 560);
		const textX = size + 40;
		const qrSvg = await generateQrSvg(row.qr_uid, size);
		const qrInner = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
		const counts = {
			recyclable: row.count_recyclable || 0,
			refurbishable: row.count_refurbishable || 0,
			disposable: row.count_disposable || 0
		};
		const label = `<?xml version="1.0" encoding="UTF-8"?>
			<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}">
				<rect width="100%" height="100%" fill="#ffffff"/>
				<svg x="16" y="16" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrInner}</svg>
				<g font-family="Arial, Helvetica, sans-serif" fill="#111827">
					<text x="${textX}" y="36" font-size="16" font-weight="700">${escapeXml(row.title || 'Drive')}</text>
					<text x="${textX}" y="56" font-size="12">Status: ${escapeXml(row.status)}</text>
					<text x="${textX}" y="72" font-size="12">When: ${escapeXml((row.start_date || '—') + (row.end_date ? ' to ' + row.end_date : ''))}</text>
					<text x="${textX}" y="88" font-size="12">Location: ${escapeXml(row.location || '—')}</text>
					<text x="${textX}" y="104" font-size="12">Counts: Rcy=${counts.recyclable} | Rfb=${counts.refurbishable} | Dsp=${counts.disposable}</text>
					<text x="${textX}" y="120" font-size="12">QR UID: ${escapeXml(row.qr_uid || '')}</text>
					<text x="${textX}" y="136" font-size="12">Created: ${escapeXml(row.created_at || '')}</text>
				</g>
			</svg>`;
		res.type('image/svg+xml').send(label);
	} catch (e) { next(e); }
});

// Delete a drive
router.delete('/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ error: 'invalid id' });
	const existing = db.prepare('SELECT * FROM drives WHERE id = ?').get(id);
	if (!existing) return res.status(404).json({ error: 'Drive not found' });
	db.prepare('DELETE FROM drives WHERE id = ?').run(id);
	res.json({ ok: true });
});

export default router;