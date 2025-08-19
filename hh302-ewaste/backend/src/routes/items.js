import express from 'express';
import dayjs from 'dayjs';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { db, nowIso } from '../db.js';
import { classifyItem } from '../services/classifier.js';
import { generateQrSvg, generateQrPngBuffer } from '../services/qr.js';
import { formatInTz, nowInTz } from '../time.js';

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

function getLatestPickupInfoForItem(itemId) {
	const p = db.prepare(`
		SELECT p.*,
		       v.name as vendor_name,
		       v.type as vendor_type,
		       v.license_no as vendor_license,
		       v.contact_name as vendor_contact_name,
		       v.phone as vendor_phone,
		       v.email as vendor_email,
		       v.address as vendor_address,
		       v.authorization_no as vendor_authorization_no,
		       v.auth_valid_from as vendor_auth_valid_from,
		       v.auth_valid_to as vendor_auth_valid_to,
		       v.gst_no as vendor_gst_no,
		       v.capacity_tpm as vendor_capacity_tpm,
		       v.categories_handled as vendor_categories_handled,
		       v.active as vendor_active
		FROM pickups p
		JOIN pickup_items pi ON p.id = pi.pickup_id
		JOIN vendors v ON v.id = p.vendor_id
		WHERE pi.item_id = ?
		ORDER BY p.scheduled_date DESC, p.id DESC
		LIMIT 1
	`).get(itemId);
	return p || null;
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
})

// Create item (Report)
router.post('/', (req, res) => {
    let now = nowIso();
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
        category_key: categoryOverride = null,
        reported_time = null
    } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name is required' });
    const rt = normalizeLocalTime(reported_time);
    if (reported_time && !rt) return res.status(400).json({ error: 'reported_time is invalid. Use YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm' });
    if (rt) now = rt;

    const qr_uid = uuidv4();
    let category_key = categoryOverride || null;
    let hazardous = 0, recyclable = 0, reusable = 0;
    if (categoryOverride && ['recyclable','reusable','hazardous'].includes(categoryOverride)) {
        hazardous = categoryOverride === 'hazardous' ? 1 : 0;
        recyclable = categoryOverride === 'recyclable' ? 1 : 0;
        reusable = categoryOverride === 'reusable' ? 1 : 0;
    } else {
        const meta = classifyItem({ name, description, condition, weight_kg });
        category_key = meta.category_key;
        hazardous = meta.hazardous ? 1 : 0;
        recyclable = meta.recyclable ? 1 : 0;
        reusable = meta.reusable ? 1 : 0;
    }

    const insert = db.prepare(`INSERT INTO items (
        qr_uid, name, description, category_key, status, department_id, condition, purchase_date,
        weight_kg, hazardous, recyclable, reusable, serial_number, asset_tag, reported_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = insert.run(
        qr_uid, name, description, category_key, department_id, condition, purchase_date, Number(weight_kg) || 0,
        hazardous, recyclable, reusable, serial_number, asset_tag, reported_by, now, now
    );

    db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)')
        .run(info.lastInsertRowid, 'reported', 'Item reported', now);

    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ item: mapItem(row) });
});

// Scan by QR UID or ID (supports raw UID or URL containing UID/id)
router.get('/scan/:code', (req, res) => {
	let code = decodeURIComponent(String(req.params.code || '')).trim();
	if (!code) return res.status(400).json({ error: 'invalid code' });
	// If a URL was encoded, try to extract a UID/id
	try {
		if (/^https?:\/\//i.test(code)) {
			const u = new URL(code);
			code = u.searchParams.get('qr') || u.searchParams.get('uid') || u.searchParams.get('id') || u.pathname.split('/').filter(Boolean).pop() || code;
		}
	} catch (e) {}
	let row = db.prepare('SELECT * FROM items WHERE qr_uid = ?').get(code);
	if (!row && /^\d+$/.test(code)) row = db.prepare('SELECT * FROM items WHERE id = ?').get(Number(code));
	if (!row) return res.status(404).json({ error: 'Not found' });
	res.json({ item: mapItem(row) });
});

// Fetch single item
router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Item not found' });
    res.json({ item: mapItem(row) });
});

// Item events (chronological)
router.get('/:id/events', (req, res) => {
    const rows = db.prepare('SELECT * FROM item_events WHERE item_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ events: rows });
});

// Update item status with strict workflow and manual timestamp
router.post('/:id/status', (req, res) => {
	const id = Number(req.params.id);
	const allowed = ['picked_up','recycled','refurbished','disposed'];
	const { status, manual_time, notes = '' } = req.body || {};
	if (!status || !allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });
	const at = normalizeLocalTime(manual_time);
	if (!manual_time || !at) return res.status(400).json({ error: 'manual_time is required (use YYYY-MM-DD HH:mm or YYYY-MM-DDTHH:mm)' });
	const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
	if (!item) return res.status(404).json({ error: 'Item not found' });
	const link = db.prepare('SELECT pickup_id FROM pickup_items WHERE item_id = ? ORDER BY pickup_id DESC LIMIT 1').get(id);
	if (status === 'picked_up') {
		if (item.status !== 'scheduled') return res.status(400).json({ error: 'Item must be scheduled before marking as picked up' });
		if (!link) return res.status(400).json({ error: 'Item must be part of a pickup to mark picked up' });
	} else {
		if (item.status !== 'picked_up') return res.status(400).json({ error: 'Item must be picked up before it can be processed' });
		if (!link) return res.status(400).json({ error: 'Item must be part of a pickup to update status' });
	}
	const eventType = status === 'picked_up' ? 'status_picked_up' :
		status === 'recycled' ? 'status_recycled' :
		status === 'refurbished' ? 'status_refurbished' : 'status_disposed';
	db.prepare('UPDATE items SET status = ?, updated_at = ? WHERE id = ?').run(status, at, id);
	db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)').run(id, eventType, notes || `Status ${status}`, at);
	if (link) {
		const pid = link.pickup_id;
		const rows = db.prepare('SELECT i.status FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ?').all(pid);
		const allTerminal = rows.length > 0 && rows.every(r => ['recycled','refurbished','disposed'].includes(r.status));
		if (allTerminal) {
			db.prepare('UPDATE pickups SET status = ? WHERE id = ?').run('completed', pid);
		}
	}
	res.json({ ok: true });
});

// Hard delete an item and recompute pickup statuses
router.delete('/:id', (req, res) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ error: 'invalid id' });
	const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
	if (!existing) return res.status(404).json({ error: 'Item not found' });
	const pickupIds = db.prepare('SELECT DISTINCT pickup_id as id FROM pickup_items WHERE item_id = ?').all(id).map(r => r.id);
	// Delete item (cascades to pickup_items and item_events)
	db.prepare('DELETE FROM items WHERE id = ?').run(id);
	// Recompute pickup statuses
	for (const pid of pickupIds) {
		const statuses = db.prepare('SELECT i.status FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ?').all(pid).map(r => r.status);
		let newStatus = 'scheduled';
		if (statuses.length > 0) {
			const allTerminal = statuses.every(s => ['recycled','refurbished','disposed'].includes(s));
			newStatus = allTerminal ? 'completed' : 'scheduled';
		}
		db.prepare('UPDATE pickups SET status = ? WHERE id = ?').run(newStatus, pid);
	}
	res.json({ ok: true });
});

router.get('/:id/pickup-info', (req, res) => {
	const id = Number(req.params.id);
	if (!id) return res.status(400).json({ error: 'invalid id' });
	const p = getLatestPickupInfoForItem(id);
	if (!p) return res.json({ pickup: null });
	res.json({ pickup: {
		id: p.id,
		vendor_id: p.vendor_id,
		vendor_name: p.vendor_name,
		vendor_type: p.vendor_type,
		vendor_license: p.vendor_license,
		vendor_contact_name: p.vendor_contact_name,
		vendor_phone: p.vendor_phone,
		vendor_email: p.vendor_email,
		vendor_address: p.vendor_address,
		vendor_authorization_no: p.vendor_authorization_no,
		vendor_auth_valid_from: p.vendor_auth_valid_from,
		vendor_auth_valid_to: p.vendor_auth_valid_to,
		vendor_gst_no: p.vendor_gst_no,
		vendor_capacity_tpm: p.vendor_capacity_tpm,
		vendor_categories_handled: p.vendor_categories_handled,
		vendor_active: p.vendor_active,
		manifest_no: p.manifest_no,
		transporter_name: p.transporter_name,
		vehicle_no: p.vehicle_no,
		transporter_contact: p.transporter_contact,
		scheduled_date: p.scheduled_date
	} });
});

// Simple QR-only SVG for item
router.get('/:id/qr.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT qr_uid FROM items WHERE id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(64, Math.min(1024, Number(req.query.size) || 256));
		const svg = await generateQrSvg(row.qr_uid, size);
		res.type('image/svg+xml').send(svg);
	} catch (e) {
		next(e);
	}
});

function escapeXml(s) {
	return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

router.get('/:id/label.svg', async (req, res, next) => {
	try {
		const row = db.prepare('SELECT i.*, d.name as department_name FROM items i LEFT JOIN departments d ON i.department_id = d.id WHERE i.id = ?').get(req.params.id);
		if (!row) return res.status(404).send('Not found');
		const size = Math.max(300, Math.min(800, Number(req.query.size) || 600));
		const labelWidth = size + 460;
		const labelHeight = Math.max(size + 280, 600);
		const textX = size + 40;
		const qrSvg = await generateQrSvg(row.qr_uid, size);
		const qrInner = qrSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

		// Facility settings
		const settingsRows = db.prepare('SELECT key, value FROM settings').all();
		const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

		// Item age and timeline
		const ageBase = row.purchase_date || row.created_at;
		const ageDays = ageBase ? dayjs().diff(dayjs(ageBase), 'day') : null;
		const weightStr = (row.weight_kg || 0).toString();
		const evs = db.prepare('SELECT event_type, created_at FROM item_events WHERE item_id = ? ORDER BY created_at ASC').all(req.params.id);
		const findAt = (k) => evs.find(e => e.event_type === k)?.created_at || null;
		const reportedAt = findAt('reported') || row.created_at;
		const scheduledAt = findAt('scheduled_for_pickup') || null;
		const pickedAt = findAt('status_picked_up') || null;
		const recycledAt = findAt('status_recycled') || null;
		const refurbAt = findAt('status_refurbished') || null;
		const disposedAt = findAt('status_disposed') || null;
		const processedLabel = recycledAt ? 'Recycled' : refurbAt ? 'Refurbished' : disposedAt ? 'Disposed' : null;
		const processedAt = recycledAt || refurbAt || disposedAt || null;

		// Latest pickup info
		const p = getLatestPickupInfoForItem(Number(req.params.id));

		const label = `<?xml version="1.0" encoding="UTF-8"?>
			<svg xmlns="http://www.w3.org/2000/svg" width="${labelWidth}" height="${labelHeight}">
				<rect width="100%" height="100%" fill="#ffffff"/>
				<svg x="16" y="16" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrInner}</svg>
				<g font-family="Arial, Helvetica, sans-serif" fill="#111827">
					<text x="${textX}" y="36" font-size="16" font-weight="700">${escapeXml(row.name || 'Item')}</text>
					<text x="${textX}" y="56" font-size="12">Facility: ${escapeXml(settings.facility_name || '')}</text>
					<text x="${textX}" y="72" font-size="12">Auth: ${escapeXml(settings.facility_authorization_no || '')}</text>
					<text x="${textX}" y="88" font-size="12">Contact: ${escapeXml(settings.facility_contact_name || '')} ${settings.facility_contact_phone ? '| ' + escapeXml(settings.facility_contact_phone) : ''}</text>
					<text x="${textX}" y="104" font-size="12">Address: ${escapeXml((settings.facility_address || '').slice(0, 60))}</text>
					<text x="${textX}" y="126" font-size="12">Dept: ${escapeXml(row.department_name || 'N/A')}</text>
					<text x="${textX}" y="142" font-size="12">Status: ${escapeXml(row.status)}</text>
					<text x="${textX}" y="158" font-size="12">Category: ${escapeXml(row.category_key || 'N/A')}</text>
					<text x="${textX}" y="174" font-size="12">Condition: ${escapeXml(row.condition || 'N/A')}</text>
					<text x="${textX}" y="190" font-size="12">Weight: ${escapeXml(weightStr)} kg</text>
					<text x="${textX}" y="206" font-size="12">Age: ${escapeXml(ageDays != null ? ageDays + ' days' : 'N/A')}</text>
					<text x="${textX}" y="222" font-size="12">Desc: ${escapeXml((row.description || 'N/A').slice(0,60))}</text>
					<text x="${textX}" y="246" font-size="12" font-weight="700">Timeline</text>
					<text x="${textX}" y="262" font-size="12">Reported: ${escapeXml(reportedAt || '—')}</text>
					<text x="${textX}" y="278" font-size="12">Scheduled: ${escapeXml(scheduledAt || '—')}</text>
					<text x="${textX}" y="294" font-size="12">Picked up: ${escapeXml(pickedAt || '—')}</text>
					<text x="${textX}" y="310" font-size="12">${escapeXml(processedLabel || 'Processed')}: ${escapeXml(processedAt || '—')}</text>
					<text x="${textX}" y="334" font-size="12" font-weight="700">Vendor &amp; Transport</text>
					<text x="${textX}" y="350" font-size="12">Vendor: ${escapeXml(p?.vendor_name || '—')} ${p?.vendor_type ? '(' + escapeXml(p.vendor_type) + ')' : ''}</text>
					<text x="${textX}" y="366" font-size="12">License: ${escapeXml(p?.vendor_license || '—')}</text>
					<text x="${textX}" y="382" font-size="12">Authorization: ${escapeXml(p?.vendor_authorization_no || '—')}</text>
					<text x="${textX}" y="398" font-size="12">Validity: ${escapeXml(p?.vendor_auth_valid_from || '—')} to ${escapeXml(p?.vendor_auth_valid_to || '—')}</text>
					<text x="${textX}" y="414" font-size="12">GST: ${escapeXml(p?.vendor_gst_no || '—')}</text>
					<text x="${textX}" y="430" font-size="12">Contact: ${escapeXml(p?.vendor_contact_name || '—')} ${p?.vendor_phone ? '| ' + escapeXml(p.vendor_phone) : ''} ${p?.vendor_email ? '| ' + escapeXml(p.vendor_email) : ''}</text>
					<text x="${textX}" y="446" font-size="12">Address: ${escapeXml((p?.vendor_address || '—').slice(0,60))}</text>
					<text x="${textX}" y="462" font-size="12">Categories: ${escapeXml(p?.vendor_categories_handled || '—')}</text>
					<text x="${textX}" y="478" font-size="12">Capacity (TPM): ${escapeXml(String(p?.vendor_capacity_tpm ?? '—'))}</text>
					<text x="${textX}" y="494" font-size="12">Manifest: ${escapeXml(p?.manifest_no || '—')}</text>
					<text x="${textX}" y="510" font-size="12">Transporter: ${escapeXml(p?.transporter_name || '—')} ${p?.vehicle_no ? '| ' + escapeXml(p.vehicle_no) : ''} ${p?.transporter_contact ? '| ' + escapeXml(p.transporter_contact) : ''}</text>
					<text x="${textX}" y="536" font-size="12">QR UID: ${escapeXml(row.qr_uid)}</text>
					<text x="${textX}" y="552" font-size="12">Created: ${escapeXml(row.created_at)}</text>
					<text x="${textX}" y="568" font-size="12">Updated: ${escapeXml(row.updated_at)}</text>
					<text x="16" y="${labelHeight - 16}" font-size="10" fill="#6b7280">Printed: ${escapeXml(dayjs().format('YYYY-MM-DD HH:mm:ss'))}</text>
				</g>
			</svg>`;
		res.type('image/svg+xml').send(label);
	} catch (e) {
		next(e);
	}
});

export default router;