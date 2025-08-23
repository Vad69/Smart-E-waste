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

	// Facility header
	const settingsRows = db.prepare('SELECT key, value FROM settings').all();
	const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

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

	// Facility header
	doc.fontSize(14).text(settings.facility_name || 'Facility', { align: 'left' });
	doc.fontSize(10).text(`Address: ${settings.facility_address || ''}`);
	doc.text(`Authorization No: ${settings.facility_authorization_no || ''}`);
	doc.moveDown(0.5);

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

	// Pickups scheduled (manifest/transporter)
	doc.fontSize(12).text('Pickups Scheduled', { underline: true });
	if (pickups.length === 0) {
		doc.text('No pickups scheduled');
	} else {
		pickups.forEach(p => {
			doc.fontSize(10).text(`Pickup #${p.id} | Vendor: ${p.vendor_name} | Scheduled: ${p.scheduled_date}`);
			if (p.manifest_no || p.transporter_name || p.vehicle_no) {
				doc.fontSize(9).text(`   Manifest: ${p.manifest_no || '—'} | Transporter: ${p.transporter_name || '—'} | Vehicle: ${p.vehicle_no || '—'}`);
			}
			const itemsInPickup = db.prepare('SELECT i.id, i.name FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ? ORDER BY i.id ASC').all(p.id);
			itemsInPickup.forEach(it => {
				doc.fontSize(9).text(`   - #${it.id} ${it.name}`);
			});
		});
	}
	doc.moveDown(1);

	// Pickups completed
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

	// Processed tables
	function renderProcessed(title, rows) {
		doc.fontSize(12).text(title, { underline: true });
		if (rows.length === 0) { doc.text('None'); doc.moveDown(0.5); return; }
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

// CPCB Form-6 (Simplified manifest PDF for pickups within range)
router.get('/form6.pdf', (req, res) => {
    const { from, to } = req.query;
    const fromDate = from ? dayjs(from) : dayjs().subtract(7, 'day');
    const toDate = to ? dayjs(to) : dayjs();
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    // Facility
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));

    const pickups = db.prepare(`
        SELECT p.*, v.name as vendor_name, v.address as vendor_address, v.authorization_no as vendor_auth, v.gst_no as vendor_gst
        FROM pickups p JOIN vendors v ON v.id = p.vendor_id
        WHERE p.scheduled_date BETWEEN ? AND ?
        ORDER BY p.scheduled_date ASC
    `).all(fromIso, toIso);

    // Sustainability data within period
    const totalReportedItems = db.prepare(`SELECT COUNT(*) as c FROM items WHERE created_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
    const recycledCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'recycled' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
    const refurbishedCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'refurbished' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;
    const disposedCount = db.prepare(`SELECT COUNT(*) as c FROM items WHERE status = 'disposed' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).c;

    const recycledWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'recycled' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;
    const refurbishedWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'refurbished' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;
    const disposedWeight = db.prepare(`SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'disposed' AND updated_at BETWEEN ? AND ?`).get(fromIso, toIso).w;

    const FACTORS = {
        recycled:    { co2e: 1.8, greenhouse: 2.0,  acidification: 0.012, eutrophication: 0.003, heavyMetals: 2.0 },
        refurbished: { co2e: 0.8, greenhouse: 1.0,  acidification: 0.010, eutrophication: 0.002, heavyMetals: 8.0 },
        disposed:    { co2e: 8.0, greenhouse: 10.0, acidification: 0.020, eutrophication: 0.005, heavyMetals: 3.0 },
    };
    function metricsFor(weightKg, f) {
        return {
            co2e: weightKg * f.co2e,
            greenhouse: weightKg * f.greenhouse,
            acidification: weightKg * f.acidification,
            eutrophication: weightKg * f.eutrophication,
            heavyMetals: weightKg * f.heavyMetals,
        };
    }
    const mRecycled = metricsFor(recycledWeight, FACTORS.recycled);
    const mRefurbished = metricsFor(refurbishedWeight, FACTORS.refurbished);
    const mDisposed = metricsFor(disposedWeight, FACTORS.disposed);
    const mTotals = {
        co2e: mRecycled.co2e + mRefurbished.co2e + mDisposed.co2e,
        greenhouse: mRecycled.greenhouse + mRefurbished.greenhouse + mDisposed.greenhouse,
        acidification: mRecycled.acidification + mRefurbished.acidification + mDisposed.acidification,
        eutrophication: mRecycled.eutrophication + mRefurbished.eutrophication + mDisposed.eutrophication,
        heavyMetals: mRecycled.heavyMetals + mRefurbished.heavyMetals + mDisposed.heavyMetals,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="form6_${fromDate.format('YYYYMMDD')}_${toDate.format('YYYYMMDD')}.pdf"`);

    const doc = new PDFDocument({ margin: 36 });
    doc.pipe(res);

    doc.fontSize(16).text('FORM 6 — Manifest Summary (E-Waste)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Period: ${fromDate.format('YYYY-MM-DD')} to ${toDate.format('YYYY-MM-DD')} | TZ: ${DEFAULT_TZ} | Generated: ${nowInTz()}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(12).text('Facility Details', { underline: true });
    doc.fontSize(10).text(`Name: ${settings.facility_name || ''}`);
    doc.text(`Address: ${settings.facility_address || ''}`);
    doc.text(`Authorization No: ${settings.facility_authorization_no || ''}`);
    doc.moveDown(0.5);

    // Sustainability Impact Summary (selected period)
    doc.fontSize(12).text('Sustainability Impact (Selected Period)', { underline: true });
    doc.fontSize(10).text(`Total items reported: ${totalReportedItems}`);
    doc.text(`Processed items — Recycled ${recycledCount} | Refurbished ${refurbishedCount} | Disposed ${disposedCount}`);
    doc.text(`Totals: CO2e prevented ${mTotals.co2e.toFixed(2)} kg | Greenhouse gases prevented ${mTotals.greenhouse.toFixed(2)} kg`);
    doc.text(`        Acidification avoided ${mTotals.acidification.toFixed(3)} kg | Eutrophication avoided ${mTotals.eutrophication.toFixed(3)} kg | Heavy metals prevented ${mTotals.heavyMetals.toFixed(2)} kg`);
    doc.moveDown(0.25);
    doc.text('Breakdown by stream:', { continued: false });
    doc.text(`  - Recycled: CO2e ${mRecycled.co2e.toFixed(2)} kg | GH ${mRecycled.greenhouse.toFixed(2)} kg | Acid ${mRecycled.acidification.toFixed(3)} kg | Eutro ${mRecycled.eutrophication.toFixed(3)} kg | Heavy metals ${mRecycled.heavyMetals.toFixed(2)} kg`);
    doc.text(`  - Refurbished: CO2e ${mRefurbished.co2e.toFixed(2)} kg | GH ${mRefurbished.greenhouse.toFixed(2)} kg | Acid ${mRefurbished.acidification.toFixed(3)} kg | Eutro ${mRefurbished.eutrophication.toFixed(3)} kg | Heavy metals ${mRefurbished.heavyMetals.toFixed(2)} kg`);
    doc.text(`  - Disposed: CO2e ${mDisposed.co2e.toFixed(2)} kg | GH ${mDisposed.greenhouse.toFixed(2)} kg | Acid ${mDisposed.acidification.toFixed(3)} kg | Eutro ${mDisposed.eutrophication.toFixed(3)} kg | Heavy metals ${mDisposed.heavyMetals.toFixed(2)} kg`);
    doc.moveDown(0.75);

    if (pickups.length === 0) {
        doc.text('No pickups in the selected period.');
        doc.end();
        return;
    }

    pickups.forEach(p => {
        doc.fontSize(12).text(`Pickup #${p.id} — ${p.vendor_name}`);
        doc.fontSize(10)
            .text(`Scheduled: ${p.scheduled_date}`)
            .text(`Manifest No: ${p.manifest_no || '—'}`)
            .text(`Transporter: ${p.transporter_name || '—'} | Vehicle: ${p.vehicle_no || '—'} | Contact: ${p.transporter_contact || '—'}`)
            .text(`Vendor Address: ${p.vendor_address || '—'}`)
            .text(`Vendor Auth/GST: ${p.vendor_auth || '—'} / ${p.vendor_gst || '—'}`);

        // Items table
        const items = db.prepare('SELECT i.id, i.name, i.weight_kg, i.category_key FROM items i JOIN pickup_items pi ON i.id = pi.item_id WHERE pi.pickup_id = ? ORDER BY i.id ASC').all(p.id);
        if (items.length === 0) {
            doc.text('  No items');
        } else {
            items.forEach(it => doc.text(`  - #${it.id} ${it.name} | ${it.category_key} | ${it.weight_kg || 0} kg`));
        }
        doc.moveDown(0.5);
    });

    doc.addPage();
    doc.fontSize(10).text('Note: This is a consolidated manifest summary. For submission, ensure vendor authorization validity, transporter details, and signatory blocks per CPCB guidelines are completed.');

    doc.end();
});

export default router;