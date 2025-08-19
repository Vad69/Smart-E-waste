import express from 'express';
import dayjs from 'dayjs';
import { db } from '../db.js';

const router = express.Router();

router.get('/summary', (req, res) => {
	const totalItems = db.prepare('SELECT COUNT(*) as c FROM items').get().c;
	const totalWeight = db.prepare('SELECT IFNULL(SUM(weight_kg), 0) as w FROM items').get().w;
	const byStatus = db.prepare('SELECT status, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w FROM items GROUP BY status').all();
	const byCategory = db.prepare('SELECT category_key, COUNT(*) as c FROM items GROUP BY category_key').all();
	const hazardousCount = db.prepare('SELECT COUNT(*) as c FROM items WHERE hazardous = 1').get().c;
	const recyclableCount = db.prepare('SELECT COUNT(*) as c FROM items WHERE recyclable = 1').get().c;
	const reusableCount = db.prepare('SELECT COUNT(*) as c FROM items WHERE reusable = 1').get().c;

	const pickedUpWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status IN ('picked_up','recycled','refurbished','disposed')").get().w;
	const recoveryRate = totalWeight > 0 ? pickedUpWeight / totalWeight : 0;

	res.json({ totalItems, totalWeight, byStatus, byCategory, hazardousCount, recyclableCount, reusableCount, recoveryRate });
});

router.get('/trends', (req, res) => {
	const { granularity = 'month', from, to } = req.query;
	const fromDate = from ? dayjs(from) : dayjs().subtract(180, 'day');
	const toDate = to ? dayjs(to) : dayjs();
	let rows = [];
	if (granularity === 'day') {
		rows = db.prepare(`
			SELECT substr(created_at, 1, 10) as d, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
			FROM items
			WHERE created_at BETWEEN ? AND ?
			GROUP BY d
			ORDER BY d ASC
		`).all(fromDate.toISOString(), toDate.toISOString());
		return res.json({ daily: rows });
	} else {
		rows = db.prepare(`
			SELECT substr(created_at, 1, 7) as ym, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
			FROM items
			WHERE created_at BETWEEN ? AND ?
			GROUP BY ym
			ORDER BY ym ASC
		`).all(fromDate.toISOString(), toDate.toISOString());
		return res.json({ monthly: rows });
	}
});

router.get('/segments', (req, res) => {
	const byDept = db.prepare(`
		SELECT d.name as department, COUNT(i.id) as c, IFNULL(SUM(i.weight_kg),0) as w
		FROM items i LEFT JOIN departments d ON i.department_id = d.id
		GROUP BY department
		ORDER BY c DESC
	`).all();
	const byCategory = db.prepare(`
		SELECT category_key as category, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
		FROM items
		GROUP BY category
		ORDER BY c DESC
	`).all();
	res.json({ byDept, byCategory });
});

router.get('/impact', (req, res) => {
	const processedWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status IN ('recycled','refurbished','disposed')").get().w;
	const recycledWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'recycled'").get().w;
	const refurbishedWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'refurbished'").get().w;
	const disposedWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'disposed'").get().w;
	const refurbishedCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'refurbished'").get().c;
	const reusablePotentialCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE category_key = 'reusable'").get().c;
	const impactedUsers = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM user_scores').get().c;
	const from30 = dayjs().subtract(30, 'day').toISOString();
	const impactedUsers30d = db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM user_scores WHERE created_at >= ?').get(from30).c;
	// Simple model: recycling saves 1.5 kg CO2e/kg; refurbishing saves 3.0 kg CO2e/kg (extends life); safe disposal avoids 0.5 kg hazardous/kg
	const co2eSavedKg = recycledWeight * 1.5 + refurbishedWeight * 3.0;
	const hazardousPreventedKg = disposedWeight * 0.5;
	res.json({ processedWeight, recycledWeight, refurbishedWeight, disposedWeight, refurbishedCount, reusablePotentialCount, impactedUsers, impactedUsers30d, co2eSavedKg, hazardousPreventedKg });
});

export default router;