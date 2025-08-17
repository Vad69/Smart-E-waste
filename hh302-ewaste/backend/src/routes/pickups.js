import express from 'express';
import dayjs from 'dayjs';
import { db, nowIso } from '../db.js';

const router = express.Router();

function mapPickup(row) {
	if (!row) return null;
	return {
		id: row.id,
		vendor_id: row.vendor_id,
		scheduled_date: row.scheduled_date,
		status: row.status,
		created_at: row.created_at
	};
}

router.get('/', (req, res) => {
	const rows = db.prepare('SELECT p.*, v.name as vendor_name FROM pickups p JOIN vendors v ON v.id = p.vendor_id ORDER BY p.scheduled_date DESC').all();
	const withCounts = rows.map(p => {
		const countsRows = db.prepare(`
			SELECT i.status as status, COUNT(*) as c
			FROM items i JOIN pickup_items pi ON i.id = pi.item_id
			WHERE pi.pickup_id = ?
			GROUP BY i.status
		`).all(p.id);
		const counts = { reported: 0, scheduled: 0, picked_up: 0, recycled: 0 };
		for (const r of countsRows) {
			if (counts[r.status] === undefined) counts[r.status] = 0;
			counts[r.status] += r.c;
		}
		const total = Object.values(counts).reduce((a, b) => a + b, 0);
		const lastUpdate = db.prepare(`
			SELECT MAX(i.updated_at) as t
			FROM items i JOIN pickup_items pi ON i.id = pi.item_id
			WHERE pi.pickup_id = ?
		`).get(p.id).t;
		return { ...mapPickup(p), vendor_name: p.vendor_name, item_count: total, counts, last_item_update: lastUpdate };
	});
	res.json({ pickups: withCounts });
});

router.post('/', (req, res) => {
	const { vendor_id, scheduled_date, item_ids = [] } = req.body || {};
	if (!vendor_id || !scheduled_date) return res.status(400).json({ error: 'vendor_id and scheduled_date are required' });
	const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendor_id);
	if (!vendor) return res.status(400).json({ error: 'Invalid vendor_id' });
	if (!Array.isArray(item_ids) || item_ids.length === 0) return res.status(400).json({ error: 'item_ids must be a non-empty array' });

	const now = nowIso();
	const pickupInfo = db.prepare('INSERT INTO pickups (vendor_id, scheduled_date, status, created_at) VALUES (?, ?, ?, ?)')
		.run(vendor_id, scheduled_date, 'scheduled', now);
	const pickup_id = pickupInfo.lastInsertRowid;

	const insertPI = db.prepare('INSERT INTO pickup_items (pickup_id, item_id) VALUES (?, ?)');
	const updateItem = db.prepare('UPDATE items SET status = ?, updated_at = ? WHERE id = ?');
	const insertEvent = db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)');
	for (const itemId of item_ids) {
		const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
		if (!item) continue;
		insertPI.run(pickup_id, itemId);
		updateItem.run('scheduled', now, itemId);
		insertEvent.run(itemId, 'scheduled_for_pickup', `Pickup ${pickup_id} on ${scheduled_date}`, now);
	}

	const row = db.prepare('SELECT * FROM pickups WHERE id = ?').get(pickup_id);
	res.status(201).json({ pickup: mapPickup(row) });
});

router.get('/suggest', (req, res) => {
	const { vendor_type = 'recycler', limit = 20 } = req.query;
	// Simple mapping of vendor type to category
	let categories = ['recyclable'];
	if (vendor_type === 'hazardous') categories = ['hazardous'];
	if (vendor_type === 'refurbisher') categories = ['reusable'];
	const items = db.prepare(`SELECT * FROM items WHERE status = 'reported' AND category_key IN (${categories.map(() => '?').join(',')}) ORDER BY created_at ASC LIMIT ?`).all(...categories, Number(limit));
	const vendors = db.prepare('SELECT * FROM vendors WHERE type = ? ORDER BY name ASC').all(vendor_type);
	res.json({ suggested_items: items, vendors });
});

router.get('/:id', (req, res) => {
	const row = db.prepare('SELECT * FROM pickups WHERE id = ?').get(req.params.id);
	if (!row) return res.status(404).json({ error: 'Pickup not found' });
	const items = db.prepare('SELECT i.* FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ?').all(req.params.id);
	res.json({ pickup: mapPickup(row), items });
});

router.post('/:id/status', (req, res) => {
	const { status } = req.body || {};
	if (!status) return res.status(400).json({ error: 'status is required' });
	const existing = db.prepare('SELECT * FROM pickups WHERE id = ?').get(req.params.id);
	if (!existing) return res.status(404).json({ error: 'Pickup not found' });
	db.prepare('UPDATE pickups SET status = ? WHERE id = ?').run(status, req.params.id);
	const now = nowIso();
	const itemIds = db.prepare('SELECT item_id FROM pickup_items WHERE pickup_id = ?').all(req.params.id).map(r => r.item_id);
	const updateItem = db.prepare('UPDATE items SET status = ?, updated_at = ? WHERE id = ?');
	const insertEvent = db.prepare('INSERT INTO item_events (item_id, event_type, notes, created_at) VALUES (?, ?, ?, ?)');
	for (const itemId of itemIds) {
		const finalStatus = status === 'completed' ? 'picked_up' : status === 'cancelled' ? 'reported' : 'scheduled';
		updateItem.run(finalStatus, now, itemId);
		insertEvent.run(itemId, `pickup_${status}`, `Pickup ${req.params.id} ${status}`, now);
	}
	res.json({ ok: true });
});

export default router;