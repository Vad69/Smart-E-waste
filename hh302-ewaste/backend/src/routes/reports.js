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

	const dailyItems = db.prepare(`
		SELECT substr(created_at,1,10) as d, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
		FROM items WHERE created_at BETWEEN ? AND ?
		GROUP BY d ORDER BY d ASC
	`).all(fromDate.toISOString(), toDate.toISOString());
	const dailyPicked = db.prepare(`
		SELECT substr(updated_at,1,10) as d, COUNT(*) as c
		FROM items WHERE status IN ('picked_up','recycled') AND updated_at BETWEEN ? AND ?
		GROUP BY d ORDER BY d ASC
	`).all(fromDate.toISOString(), toDate.toISOString());
	const dailyRecycled = db.prepare(`
		SELECT substr(updated_at,1,10) as d, COUNT(*) as c
		FROM items WHERE status = 'recycled' AND updated_at BETWEEN ? AND ?
		GROUP BY d ORDER BY d ASC
	`).all(fromDate.toISOString(), toDate.toISOString());
	const dailyPickupVendors = db.prepare(`
		SELECT substr(p.scheduled_date,1,10) as d, v.name as vendor_name, COUNT(*) as c
		FROM pickups p JOIN vendors v ON v.id = p.vendor_id
		WHERE p.scheduled_date BETWEEN ? AND ?
		GROUP BY d, vendor_name ORDER BY d ASC, vendor_name ASC
	`).all(fromDate.toISOString(), toDate.toISOString());

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="compliance_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

	const doc = new PDFDocument({ margin: 40 });
	doc.pipe(res);

	doc.fontSize(18).text('E-Waste Compliance Report', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')} | TZ: ${DEFAULT_TZ} | Generated: ${nowInTz()}`, { align: 'center' });
	doc.moveDown(1);

	const totalWeight = items.reduce((s, i) => s + (i.weight_kg || 0), 0);
	doc.fontSize(12).text(`Summary`, { underline: true });
	doc.text(`Total items reported: ${items.length}`);
	doc.text(`Total weight: ${totalWeight.toFixed(2)} kg`);
	doc.text(`Pickups scheduled: ${pickups.length}`);
	doc.moveDown(1);

	doc.fontSize(12).text('Daily Overview', { underline: true });
	dailyItems.forEach(row => {
		const picked = dailyPicked.find(x => x.d === row.d)?.c || 0;
		const recycled = dailyRecycled.find(x => x.d === row.d)?.c || 0;
		doc.fontSize(9).text(`- ${row.d}: reported ${row.c} (weight ${row.w.toFixed(1)} kg), picked_up ${picked}, recycled ${recycled}`);
	});
	if (dailyItems.length === 0) doc.text('No daily activity');
	doc.moveDown(1);

	doc.fontSize(12).text('Pickups (with timestamps and vendors)', { underline: true });
	pickups.forEach(p => {
		const completedAt = db.prepare(`
			SELECT MAX(ie.created_at) as t FROM pickup_items pi
			JOIN item_events ie ON ie.item_id = pi.item_id
			WHERE pi.pickup_id = ? AND ie.event_type = 'pickup_completed'
		`).get(p.id)?.t;
		const cancelledAt = db.prepare(`
			SELECT MAX(ie.created_at) as t FROM pickup_items pi
			JOIN item_events ie ON ie.item_id = pi.item_id
			WHERE pi.pickup_id = ? AND ie.event_type = 'pickup_cancelled'
		`).get(p.id)?.t;
		doc.fontSize(9).text(`- [${p.status}] Pickup #${p.id} | Vendor: ${p.vendor_name} (${p.vendor_type}) Lic: ${p.vendor_license || 'N/A'} | Scheduled: ${formatInTz(p.scheduled_date)} | Created: ${formatInTz(p.created_at)}`);
		if (completedAt) doc.fontSize(8).text(`   Completed at: ${formatInTz(completedAt)}`);
		if (cancelledAt) doc.fontSize(8).text(`   Cancelled at: ${formatInTz(cancelledAt)}`);
	});
	if (pickups.length === 0) doc.text('No pickups');

	doc.moveDown(1);
	doc.fontSize(12).text('Daily Pickups by Vendor', { underline: true });
	dailyPickupVendors.forEach(r => {
		doc.fontSize(9).text(`- ${r.d}: ${r.vendor_name} → ${r.c} pickup(s)`);
	});
	if (dailyPickupVendors.length === 0) doc.text('No vendor pickups in period');

	doc.moveDown(1);
	doc.fontSize(10).text('Generated to support CPCB and E-Waste (Management) Rules compliance: daily breakdowns, pickup timestamps, vendor attribution.', { align: 'left' });

	doc.end();
});

export default router;