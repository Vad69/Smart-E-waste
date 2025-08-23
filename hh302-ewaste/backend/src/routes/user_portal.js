import express from 'express';
import { db } from '../db.js';
import { verifyPassword, generateSalt, hashPassword } from '../services/auth.js';

const router = express.Router();

function requireUser(req, res, next) {
	if (req.user?.role !== 'user' || !req.user?.username) return res.status(403).json({ error: 'Forbidden' });
	return next();
}

router.get('/me', requireUser, (req, res) => {
	const u = db.prepare('SELECT id, username, name, department_name, created_at FROM users WHERE username = ?').get(req.user.username);
	if (!u) return res.status(404).json({ error: 'User not found' });
	const total = db.prepare('SELECT IFNULL(SUM(points),0) as p FROM user_scores WHERE user_id = ?').get(req.user.username).p;
	const byCampaign = db.prepare('SELECT campaign_id, IFNULL(SUM(points),0) as points FROM user_scores WHERE user_id = ? GROUP BY campaign_id ORDER BY campaign_id ASC').all(req.user.username);
	res.json({ user: u, balance: { total, byCampaign } });
});

router.post('/change-password', requireUser, (req, res) => {
	const { current_password, new_password } = req.body || {};
	if (!current_password || !new_password) return res.status(400).json({ error: 'Missing current or new password' });
	const u = db.prepare('SELECT id, password_salt, password_hash FROM users WHERE username = ?').get(req.user.username);
	if (!u) return res.status(404).json({ error: 'User not found' });
	if (!verifyPassword(current_password, u.password_salt, u.password_hash)) return res.status(401).json({ error: 'Invalid current password' });
	const salt = generateSalt(16);
	const hash = hashPassword(new_password, salt);
	db.prepare('UPDATE users SET password_salt = ?, password_hash = ?, password_plain_last = NULL WHERE id = ?').run(salt, hash, u.id);
	res.json({ ok: true });
});

router.get('/campaigns', requireUser, (req, res) => {
	const rows = db.prepare('SELECT id, title, description, start_date, end_date, type FROM campaigns ORDER BY (start_date IS NULL), start_date DESC, created_at DESC').all();
	res.json({ campaigns: rows });
});

router.get('/leaderboard', requireUser, (req, res) => {
	const top = Number(req.query.top || 50);
	const rows = db.prepare(`
		SELECT user_id,
		       MAX(user_name) as user_name,
		       MAX(department_name) as department_name,
		       SUM(points) as points,
		       SUM(CASE WHEN points < 0 THEN -points ELSE 0 END) as redeemed_points
		FROM user_scores
		GROUP BY user_id
		ORDER BY points DESC
		LIMIT ?
	`).all(top);
	res.json({ leaderboard: rows });
});

export default router;