import express from 'express';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { db } from '../db.js';

const router = express.Router();

router.get('/compliance.pdf', (req, res) => {
	const { from, to } = req.query;
	const fromDate = from ? dayjs(from) : dayjs().subtract(30, 'day');
	const toDate = to ? dayjs(to) : dayjs();

	const items = db.prepare(`
		SELECT i.*, d.name as department_name FROM items i
		LEFT JOIN departments d ON i.department_id = d.id
		WHERE i.created_at BETWEEN ? AND ?
		ORDER BY i.created_at ASC
	`).all(fromDate.toISOString(), toDate.toISOString());
	const pickups = db.prepare(`
		SELECT p.*, v.name as vendor_name, v.type as vendor_type, v.license_no as vendor_license
		FROM pickups p JOIN vendors v ON p.vendor_id = v.id
		WHERE p.scheduled_date BETWEEN ? AND ?
		ORDER BY p.scheduled_date ASC
	`).all(fromDate.toISOString(), toDate.toISOString());

	// Build item event timelines (reported, scheduled_for_pickup, picked_up, recycled)
	const itemIdList = items.map(i => i.id);
	const itemEventsById = new Map();
	if (itemIdList.length) {
		const placeholders = itemIdList.map(() => '?').join(',');
		const evRows = db.prepare(`SELECT item_id, event_type, notes, created_at FROM item_events WHERE item_id IN (${placeholders}) ORDER BY created_at ASC`).all(...itemIdList);
		for (const ev of evRows) {
			if (!itemEventsById.has(ev.item_id)) itemEventsById.set(ev.item_id, []);
			itemEventsById.get(ev.item_id).push(ev);
		}
	}
	function extractTimeline(events = []) {
		const timeline = { reportedAt: null, scheduledAt: null, pickedUpAt: null, recycledAt: null };
		for (const ev of events) {
			if (!timeline.reportedAt && ev.event_type === 'reported') timeline.reportedAt = ev.created_at;
			if (!timeline.scheduledAt && ev.event_type === 'scheduled_for_pickup') timeline.scheduledAt = ev.created_at;
			if (!timeline.pickedUpAt && (ev.event_type === 'pickup_completed' || ev.event_type === 'status_picked_up')) timeline.pickedUpAt = ev.created_at;
			if (!timeline.recycledAt && ev.event_type === 'status_recycled') timeline.recycledAt = ev.created_at;
		}
		return timeline;
	}

	function pickupStatusAt(pickupId, statusEventType) {
		const row = db.prepare(`
			SELECT MAX(ie.created_at) as t
			FROM pickup_items pi
			JOIN item_events ie ON ie.item_id = pi.item_id
			WHERE pi.pickup_id = ? AND ie.event_type = ? AND ie.notes LIKE ?
		`).get(pickupId, statusEventType, `Pickup ${pickupId} %`);
		return row?.t || null;
	}

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="compliance_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

	const doc = new PDFDocument({ margin: 40 });
	doc.pipe(res);

	doc.fontSize(18).text('E-Waste Compliance Report', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')} | Generated: ${dayjs().format('YYYY-MM-DD HH:mm')}`, { align: 'center' });
	doc.moveDown(1);

	const totalWeight = items.reduce((s, i) => s + (i.weight_kg || 0), 0);
	doc.fontSize(12).text(`Summary`, { underline: true });
	doc.text(`Total items reported: ${items.length}`);
	doc.text(`Total weight: ${totalWeight.toFixed(2)} kg`);
	doc.text(`Pickups scheduled: ${pickups.length}`);
	doc.moveDown(1);

	doc.fontSize(12).text('Items (with timestamps)', { underline: true });
	items.forEach(i => {
		const tl = extractTimeline(itemEventsById.get(i.id));
		doc.fontSize(9).text(`- [${i.status}] ${i.name} (${i.category_key}) | Dept: ${i.department_name || 'N/A'} | Weight: ${i.weight_kg || 0} kg | QR: ${i.qr_uid}`);
		doc.fontSize(8).text(`   Timeline: reported ${fmt(tl.reportedAt)} -> scheduled ${fmt(tl.scheduledAt)} -> picked_up ${fmt(tl.pickedUpAt)} -> recycled ${fmt(tl.recycledAt)}`);
	});
	if (items.length === 0) doc.text('No items');
	doc.moveDown(1);

	doc.fontSize(12).text('Pickups (with timestamps)', { underline: true });
	pickups.forEach(p => {
		const completedAt = pickupStatusAt(p.id, 'pickup_completed');
		const cancelledAt = pickupStatusAt(p.id, 'pickup_cancelled');
		doc.fontSize(9).text(`- Pickup #${p.id} | Vendor: ${p.vendor_name} (${p.vendor_type}) Lic: ${p.vendor_license || 'N/A'} | Scheduled: ${fmt(p.scheduled_date)} | Created: ${fmt(p.created_at)} | Status: ${p.status}`);
		if (completedAt) doc.fontSize(8).text(`   Completed at: ${fmt(completedAt)}`);
		if (cancelledAt) doc.fontSize(8).text(`   Cancelled at: ${fmt(cancelledAt)}`);
	});
	if (pickups.length === 0) doc.text('No pickups');

	doc.moveDown(1);
	doc.fontSize(10).text('Generated to support CPCB and E-Waste (Management) Rules compliance: inventories, pickup traceability (timestamps), and vendor licensing.', { align: 'left' });

	doc.end();
});

function fmt(ts) {
	if (!ts) return '—';
	return dayjs(ts).format('YYYY-MM-DD HH:mm');
}

export default router;