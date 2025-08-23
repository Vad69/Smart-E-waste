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
	const departmentsCount = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
	const recycledCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'recycled'").get().c;
	const refurbishedCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'refurbished'").get().c;
	const disposedCount = db.prepare("SELECT COUNT(*) as c FROM items WHERE status = 'disposed'").get().c;
	res.json({ totalItems, totalWeight, byStatus, byCategory, hazardousCount, recyclableCount, reusableCount, recoveryRate, departmentsCount, recycledCount, refurbishedCount, disposedCount });
});

router.get('/trends', (req, res) => {
	const { granularity = 'month', from, to } = req.query;
	if (granularity === 'day') {
		const monthFilter = dayjs(from || to || new Date()).format('YYYY-MM');
		const rows = db.prepare(`
			SELECT substr(created_at, 1, 10) as d, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
			FROM items
			WHERE substr(created_at,1,7) = ?
			GROUP BY d
			ORDER BY d ASC
		`).all(monthFilter);
		return res.json({ daily: rows });
	} else {
		const rows = db.prepare(`
			SELECT substr(created_at, 1, 7) as ym, COUNT(*) as c, IFNULL(SUM(weight_kg),0) as w
			FROM items
			GROUP BY ym
			ORDER BY ym ASC
		`).all();
		return res.json({ monthly: rows });
	}
});

router.get('/status-trends', (req, res) => {
	const { granularity = 'month', from, to } = req.query;
	if (granularity === 'day') {
		const monthFilter = dayjs(from || to || new Date()).format('YYYY-MM');
		const rows = db.prepare(`
			SELECT substr(updated_at,1,10) as d,
				IFNULL(SUM(CASE WHEN status='picked_up' THEN weight_kg ELSE 0 END),0) as picked_up_w,
				IFNULL(SUM(CASE WHEN status='recycled' THEN weight_kg ELSE 0 END),0) as recycled_w,
				IFNULL(SUM(CASE WHEN status='refurbished' THEN weight_kg ELSE 0 END),0) as refurbished_w,
				IFNULL(SUM(CASE WHEN status='disposed' THEN weight_kg ELSE 0 END),0) as disposed_w
			FROM items
			WHERE substr(updated_at,1,7) = ?
			GROUP BY d
			ORDER BY d ASC
		`).all(monthFilter);
		return res.json({ daily: rows });
	} else {
		const rows = db.prepare(`
			SELECT substr(updated_at,1,7) as ym,
				IFNULL(SUM(CASE WHEN status='picked_up' THEN weight_kg ELSE 0 END),0) as picked_up_w,
				IFNULL(SUM(CASE WHEN status='recycled' THEN weight_kg ELSE 0 END),0) as recycled_w,
				IFNULL(SUM(CASE WHEN status='refurbished' THEN weight_kg ELSE 0 END),0) as refurbished_w,
				IFNULL(SUM(CASE WHEN status='disposed' THEN weight_kg ELSE 0 END),0) as disposed_w
			FROM items
			GROUP BY ym
			ORDER BY ym ASC
		`).all();
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
	const co2eSavedKg = recycledWeight * 1.5 + refurbishedWeight * 3.0;
	const hazardousPreventedKg = disposedWeight * 0.5;
	res.json({ processedWeight, recycledWeight, refurbishedWeight, disposedWeight, refurbishedCount, reusablePotentialCount, impactedUsers, impactedUsers30d, co2eSavedKg, hazardousPreventedKg });
});

router.get('/impact-trends', (req, res) => {
	const { granularity = 'month', from, to } = req.query;
	if (granularity === 'day') {
		const monthFilter = dayjs(from || to || new Date()).format('YYYY-MM');
		const rows = db.prepare(`
			SELECT substr(updated_at,1,10) as d,
				IFNULL(SUM(CASE WHEN status='recycled' THEN weight_kg*1.5 WHEN status='refurbished' THEN weight_kg*3.0 ELSE 0 END),0) as co2e,
				IFNULL(SUM(CASE WHEN status='disposed' THEN weight_kg*0.5 ELSE 0 END),0) as haz
			FROM items
			WHERE substr(updated_at,1,7) = ?
			GROUP BY d
			ORDER BY d ASC
		`).all(monthFilter);
		return res.json({ daily: rows });
	} else {
		const rows = db.prepare(`
			SELECT substr(updated_at,1,7) as ym,
				IFNULL(SUM(CASE WHEN status='recycled' THEN weight_kg*1.5 WHEN status='refurbished' THEN weight_kg*3.0 ELSE 0 END),0) as co2e,
				IFNULL(SUM(CASE WHEN status='disposed' THEN weight_kg*0.5 ELSE 0 END),0) as haz
			FROM items
			GROUP BY ym
			ORDER BY ym ASC
		`).all();
		return res.json({ monthly: rows });
	}
});

// New sustainability endpoint: compute per-status impacts using provided per-kg factors
router.get('/sustainability', (req, res) => {
	// Weights per status
	const recycledWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'recycled'").get().w;
	const refurbishedWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'refurbished'").get().w;
	const disposedWeight = db.prepare("SELECT IFNULL(SUM(weight_kg),0) as w FROM items WHERE status = 'disposed'").get().w;

	function metricsFor(weightKg, factors) {
		return {
			weightKg,
			co2eKg: weightKg * factors.co2e,
			greenhouseGasesKg: weightKg * factors.greenhouse,
			acidificationKg: weightKg * factors.acidification,
			eutrophicationKg: weightKg * factors.eutrophication,
			heavyMetalsKg: weightKg * factors.heavyMetals,
		};
	}

	// Factors per 1 kg
	const FACTORS = {
		recycled:      { co2e: 1.8, greenhouse: 2.0, acidification: 0.012, eutrophication: 0.003, heavyMetals: 2.0 },
		refurbished:   { co2e: 0.8, greenhouse: 1.0, acidification: 0.010, eutrophication: 0.002, heavyMetals: 8.0 },
		disposed:      { co2e: 8.0, greenhouse: 10.0, acidification: 0.020, eutrophication: 0.005, heavyMetals: 3.0 },
	};

	const recycled = metricsFor(recycledWeight, FACTORS.recycled);
	const refurbished = metricsFor(refurbishedWeight, FACTORS.refurbished);
	const disposed = metricsFor(disposedWeight, FACTORS.disposed);

	const totals = {
		weightKg: recycled.weightKg + refurbished.weightKg + disposed.weightKg,
		co2eKg: recycled.co2eKg + refurbished.co2eKg + disposed.co2eKg,
		greenhouseGasesKg: recycled.greenhouseGasesKg + refurbished.greenhouseGasesKg + disposed.greenhouseGasesKg,
		acidificationKg: recycled.acidificationKg + refurbished.acidificationKg + disposed.acidificationKg,
		eutrophicationKg: recycled.eutrophicationKg + refurbished.eutrophicationKg + disposed.eutrophicationKg,
		heavyMetalsKg: recycled.heavyMetalsKg + refurbished.heavyMetalsKg + disposed.heavyMetalsKg,
	};

	res.json({ recycled, refurbished, disposed, totals, factorsPerKg: FACTORS });
});

export default router;