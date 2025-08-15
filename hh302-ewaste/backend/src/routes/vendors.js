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
		created_at: row.created_at
	};
}

router.get('/types', (req, res) => {
	res.json({ types: VENDOR_TYPES });
});

router.get('/', (req, res) => {
	const { type } = req.query;
	let rows = [];
	if (type) {
		rows = db.prepare('SELECT * FROM vendors WHERE type = ? ORDER BY name ASC').all(type);
	} else {
		rows = db.prepare('SELECT * FROM vendors ORDER BY name ASC').all();
	}
	res.json({ vendors: rows.map(mapVendor) });
});

router.post('/', (req, res) => {
	const now = nowIso();
	const { name, contact_name = null, phone = null, email = null, address = null, type, license_no = null } = req.body || {};
	if (!name || !type) return res.status(400).json({ error: 'name and type are required' });
	if (!VENDOR_TYPES.includes(type)) return res.status(400).json({ error: 'invalid type' });
	const info = db.prepare('INSERT INTO vendors (name, contact_name, phone, email, address, type, license_no, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
		.run(name, contact_name, phone, email, address, type, license_no, now);
	const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(info.lastInsertRowid);
	res.status(201).json({ vendor: mapVendor(row) });
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
	db.prepare('UPDATE vendors SET name = ?, contact_name = ?, phone = ?, email = ?, address = ?, type = ?, license_no = ? WHERE id = ?')
		.run(updates.name, updates.contact_name, updates.phone, updates.email, updates.address, updates.type, updates.license_no, req.params.id);
	const row = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
	res.json({ vendor: mapVendor(row) });
});

export default router;