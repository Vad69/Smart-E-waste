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
		SELECT p.*, v.name as vendor_name, v.type as vendor_type, v.license_no as vendor_license,
		       v.contact_name as vendor_contact_name, v.phone as vendor_phone, v.email as vendor_email, v.address as vendor_address
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
		manifest_no: p.manifest_no,
		transporter_name: p.transporter_name,
		vehicle_no: p.vehicle_no,
		transporter_contact: p.transporter_contact,
		scheduled_date: p.scheduled_date
	} });
});