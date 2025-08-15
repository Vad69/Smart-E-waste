import express from 'express';
import { db, nowIso } from '../db.js';

const router = express.Router();

function mapCampaign(row) {
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		start_date: row.start_date,
		end_date: row.end_date,
		type: row.type,
		points: row.points,
		created_at: row.created_at
	};
}

router.get('/', (req, res) => {
	const rows = db.prepare("SELECT * FROM campaigns ORDER BY (start_date IS NULL), start_date DESC, created_at DESC").all();
	res.json({ campaigns: rows.map(mapCampaign) });
});

router.post('/', (req, res) => {
	const now = nowIso();
	const { title, description = '', start_date = null, end_date = null, type = 'awareness', points = 0 } = req.body || {};
	if (!title) return res.status(400).json({ error: 'title is required' });
	const info = db.prepare('INSERT INTO campaigns (title, description, start_date, end_date, type, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
		.run(title, description, start_date, end_date, type, points, now);
	const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(info.lastInsertRowid);
	res.status(201).json({ campaign: mapCampaign(row) });
});

router.get('/:id/scores', (req, res) => {
	const top = Number(req.query.top || 10);
	const rows = db.prepare(`
		SELECT user_id, user_name, SUM(points) as points
		FROM user_scores
		WHERE campaign_id = ?
		GROUP BY user_id, user_name
		ORDER BY points DESC
		LIMIT ?
	`).all(req.params.id, top);
	res.json({ leaderboard: rows });
});

router.post('/:id/award', (req, res) => {
	const { user_id, user_name, points } = req.body || {};
	if (!user_id || !points) return res.status(400).json({ error: 'user_id and points are required' });
	const now = nowIso();
	db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at) VALUES (?, ?, ?, ?, ?)')
		.run(user_id, user_name || null, points, req.params.id, now);
	res.status(201).json({ ok: true });
});

router.get('/scoreboard/all', (req, res) => {
	const rows = db.prepare(`
		SELECT user_id, user_name, SUM(points) as points
		FROM user_scores
		GROUP BY user_id, user_name
		ORDER BY points DESC
		LIMIT 20
	`).all();
	res.json({ leaderboard: rows });
});

export default router;