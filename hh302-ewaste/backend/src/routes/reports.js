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

	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `inline; filename="compliance_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

	const doc = new PDFDocument({ margin: 40 });
	doc.pipe(res);

	doc.fontSize(18).text('E-Waste Compliance Report', { align: 'center' });
	doc.moveDown(0.5);
	doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')}`, { align: 'center' });
	doc.moveDown(1);

	const totalWeight = items.reduce((s, i) => s + (i.weight_kg || 0), 0);
	doc.fontSize(12).text(`Summary`, { underline: true });
	doc.text(`Total items reported: ${items.length}`);
	doc.text(`Total weight: ${totalWeight.toFixed(2)} kg`);
	doc.text(`Pickups scheduled: ${pickups.length}`);
	doc.moveDown(1);

	doc.fontSize(12).text('Items', { underline: true });
	items.forEach(i => {
		doc.fontSize(9).text(`- [${i.status}] ${i.name} (${i.category_key}) | Dept: ${i.department_name || 'N/A'} | Weight: ${i.weight_kg || 0} kg | QR: ${i.qr_uid}`);
	});
	if (items.length === 0) doc.text('No items');
	doc.moveDown(1);

	doc.fontSize(12).text('Pickups', { underline: true });
	pickups.forEach(p => {
		doc.fontSize(9).text(`- Pickup #${p.id} | Vendor: ${p.vendor_name} (${p.vendor_type}) Lic: ${p.vendor_license || 'N/A'} | Date: ${dayjs(p.scheduled_date).format('YYYY-MM-DD')} | Status: ${p.status}`);
	});
	if (pickups.length === 0) doc.text('No pickups');

	doc.moveDown(1);
	doc.fontSize(10).text('Generated to support CPCB and E-Waste (Management) Rules compliance: inventories, pickup traceability, vendor licensing.', { align: 'left' });

	doc.end();
});

export default router;