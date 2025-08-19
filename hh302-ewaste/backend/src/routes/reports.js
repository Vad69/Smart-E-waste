import express from 'express';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { db } from '../db.js';
import { formatInTz, nowInTz, DEFAULT_TZ } from '../time.js';

const router = express.Router();

router.get('/compliance.pdf', (req, res) => {
	const { from, to } = req.query;
	const fromDate = from ? dayjs(from) : dayjs().subtract(30, 'day');
	const toDate = to ? dayjs(to) : dayjs();
	const fromIso = fromDate.toISOString();
	const toIso = toDate.toISOString();

	const items = db.prepare(`
		SELECT i.*, d.name as department_name FROM items i
		LEFT JOIN departments d ON i.department_id = d.id
		WHERE i.created_at BETWEEN ? AND ?
		ORDER BY i.created_at ASC
	`).all(fromIso, toIso);

	const pickups = db.prepare(`
		SELECT p.*, v.name as vendor_name, v.type as vendor_type, v.license_no as vendor_license
		FROM pickups p JOIN vendors v ON p.vendor_id = v.id
		WHERE p.scheduled_date BETWEEN ? AND ?
		ORDER BY p.scheduled_date ASC
	`).all(fromIso, toIso);

	const recycledCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'recycled' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
	const refurbishedCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'refurbished' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
	const disposedCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'disposed' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
	const recycledWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'recycled' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;
	const refurbishedWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'refurbished' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;
	const disposedWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'disposed' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;
	const co2eSavedKg = recycledWeight * 1.5 + refurbishedWeight * 3.0;
	const hazardousPreventedKg = disposedWeight * 0.5;

	// Processed detail rows from events
	const processedRows = (eventType) => db.prepare(`
		SELECT ie.created_at as t, i.id as item_id, i.name as item_name,
			(SELECT v.name FROM pickup_items pi
				JOIN pickups p ON p.id = pi.pickup_id
				JOIN vendors v ON v.id = p.vendor_id
				WHERE pi.item_id = i.id
				LIMIT 1) as vendor_name
		FROM item_events ie
		JOIN items i ON i.id = ie.item_id
		WHERE ie.event_type = ? AND ie.created_at BETWEEN ? AND ?
		ORDER BY ie.created_at ASC
	`).all(eventType, fromIso, toIso);

	const recycledRows = processedRows('status_recycled');
	const refurbishedRows = processedRows('status_refurbished');
	const disposedRows = processedRows('status_disposed');

	// Completed pickups (derive completion time as max terminal status time)
	function getPickupCompletedAt(pickupId) {
		const row = db.prepare(`
			SELECT MAX(ie.created_at) as t
			FROM item_events ie
			JOIN pickup_items pi ON pi.item_id = ie.item_id
			WHERE pi.pickup_id = ? AND ie.event_type IN ('status_recycled','status_refurbished','status_disposed')
		`).get(pickupId);
		return row?.t || null;
	}
	function isPickupCompleted(pickupId) {
		const total = db.prepare('SELECT COUNT(*) as c FROM pickup_items WHERE pickup_id = ?').get(pickupId).c;
		const finals = db.prepare(`
			SELECT COUNT(*) as c FROM items i JOIN pickup_items pi ON i.id = pi.item_id
			WHERE pi.pickup_id = ? AND i.status IN ('recycled','refurbished','disposed')
		`).get(pickupId).c;
		return total > 0 && finals === total;
	}
	const completedPickups = pickups
		.map(p => ({ ...p, completed_at: getPickupCompletedAt(p.id), isCompleted: isPickupCompleted(p.id) }))
		.filter(p => p.isCompleted && p.completed_at && p.completed_at >= fromIso && p.completed_at <= toIso);

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="compliance_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

	const doc = new PDFDocument({ margin: 40 });
	doc.pipe(res);

	doc.fontSize(18).text('E-Waste Compliance Report', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')} | TZ: ${DEFAULT_TZ} | Generated: ${nowInTz()}`, { align: 'center' });
	doc.moveDown(1);

	// Summary
	const totalWeight = items.reduce((s, i) => s + (i.weight_kg || 0), 0);
	doc.fontSize(12).text('Summary', { underline: true });
	doc.text(`Total items reported: ${items.length}`);
	doc.text(`Total weight (reported items): ${totalWeight.toFixed(2)} kg`);
	doc.text(`Total processed: Recycled ${recycledCount} | Refurbished ${refurbishedCount} | Disposed ${disposedCount}`);
	doc.text(`Impact: CO2e saved ${co2eSavedKg.toFixed(1)} kg | Hazardous prevented ${hazardousPreventedKg.toFixed(1)} kg`);
	doc.moveDown(1);

	// Pickups scheduled (table)
	doc.fontSize(12).text('Pickups Scheduled', { underline: true });
	if (pickups.length === 0) {
		doc.text('No pickups scheduled');
	} else {
		pickups.forEach(p => {
			doc.fontSize(10).text(`Pickup #${p.id} | Vendor: ${p.vendor_name} | Scheduled: ${p.scheduled_date}`);
			const itemsInPickup = db.prepare('SELECT i.id, i.name FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ? ORDER BY i.id ASC').all(p.id);
			itemsInPickup.forEach(it => {
				doc.fontSize(9).text(`   - #${it.id} ${it.name}`);
			});
		});
	}
	doc.moveDown(1);

	// Pickups completed (table)
	doc.fontSize(12).text('Pickups Completed', { underline: true });
	if (completedPickups.length === 0) {
		doc.text('No pickups completed');
	} else {
		completedPickups.forEach(p => {
			doc.fontSize(10).text(`Pickup #${p.id} | Vendor: ${p.vendor_name} | Completed: ${p.completed_at}`);
			const itemsInPickup = db.prepare('SELECT i.id, i.name FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ? ORDER BY i.id ASC').all(p.id);
			itemsInPickup.forEach(it => {
				doc.fontSize(9).text(`   - #${it.id} ${it.name}`);
			});
		});
	}
	doc.moveDown(1);

	// Total processed tables
	function renderProcessed(title, rows) {
		doc.fontSize(12).text(title, { underline: true });
		if (rows.length === 0) {
			doc.text('None');
			return;
		}
		rows.forEach(r => {
			doc.fontSize(10).text(`${r.t} | Vendor: ${r.vendor_name || 'N/A'} | Item: #${r.item_id} ${r.item_name}`);
		});
		doc.moveDown(0.5);
	}

	renderProcessed('Processed — Recycled', recycledRows);
	renderProcessed('Processed — Refurbished', refurbishedRows);
	renderProcessed('Processed — Disposed', disposedRows);

	doc.end();
});

export default router;