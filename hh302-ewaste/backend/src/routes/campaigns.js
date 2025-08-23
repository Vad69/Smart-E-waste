import express from 'express';
import { db, nowIso } from '../db.js';
import { generateRandomPassword, generateSalt, hashPassword } from '../services/auth.js';

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

function ensureUser(username, name = null, department = null) {
	const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
	if (existing) {
		// Optionally backfill name/department if missing
		if ((name || department) && (!existing.name || !existing.department_name)) {
			try { db.prepare('UPDATE users SET name = COALESCE(name, ?), department_name = COALESCE(department_name, ?) WHERE id = ?').run(name, department, existing.id); } catch {}
		}
		return { user: existing, isNew: false, password: existing.password_plain_last };
	}
	const now = nowIso();
	const plain = generateRandomPassword(10);
	const salt = generateSalt(16);
	const hash = hashPassword(plain, salt);
	const info = db.prepare('INSERT INTO users (username, name, department_name, password_salt, password_hash, password_plain_last, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
		.run(username, name, department, salt, hash, plain, now);
	const created = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
	return { user: created, isNew: true, password: plain };
}

router.get('/', (req, res) => {
	const rows = db.prepare("SELECT * FROM campaigns ORDER BY (start_date IS NULL), start_date DESC, created_at DESC").all();
	res.json({ campaigns: rows.map(mapCampaign) });
});

router.post('/', (req, res) => {
	const now = nowIso();
	let { title, description = '', start_date = null, end_date = null, type = 'awareness', points = 0 } = req.body || {};
	if (!title) return res.status(400).json({ error: 'title is required' });
	const allowed = new Set(['awareness','challenge']);
	if (!allowed.has(type)) type = 'awareness';
	const info = db.prepare('INSERT INTO campaigns (title, description, start_date, end_date, type, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
		.run(title, description, start_date, end_date, type, points, now);
	const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(info.lastInsertRowid);
	res.status(201).json({ campaign: mapCampaign(row) });
});

router.get('/:id/scores', (req, res) => {
	const top = Number(req.query.top || 10);
	const rows = db.prepare(`
		SELECT user_id,
		       MAX(user_name) as user_name,
		       MAX(department_name) as department_name,
		       SUM(points) as points,
		       SUM(CASE WHEN points < 0 THEN -points ELSE 0 END) as redeemed_points
		FROM user_scores
		WHERE campaign_id = ?
		GROUP BY user_id
		ORDER BY points DESC
		LIMIT ?
	`).all(req.params.id, top);
	res.json({ leaderboard: rows });
});

router.post('/:id/award', (req, res) => {
	const { user_id, user_name, department_name = null, points } = req.body || {};
	if (!user_id || !points) return res.status(400).json({ error: 'user_id and points are required' });
	const now = nowIso();
	const existing = db.prepare('SELECT user_name FROM user_scores WHERE user_id = ? AND user_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
		.get(user_id);
	const firstName = String(user_name || '').trim().split(/\s+/)[0] || null;
	const canonicalName = existing?.user_name || firstName;
	const existingDept = db.prepare('SELECT department_name FROM user_scores WHERE user_id = ? AND department_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
		.get(user_id);
	const canonicalDept = existingDept?.department_name || (department_name || null);
	// Ensure user provisioned
	ensureUser(user_id, canonicalName, canonicalDept);
	db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at, department_name) VALUES (?, ?, ?, ?, ?, ?)')
		.run(user_id, canonicalName, points, req.params.id, now, canonicalDept);
	res.status(201).json({ ok: true });
});

router.post('/:id/award-with-password', (req, res) => {
	const { user_id, user_name, department_name = null, points } = req.body || {};
	if (!user_id || !points) return res.status(400).json({ error: 'user_id and points are required' });
	const now = nowIso();
	const existing = db.prepare('SELECT user_name FROM user_scores WHERE user_id = ? AND user_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
		.get(user_id);
	const firstName = String(user_name || '').trim().split(/\s+/)[0] || null;
	const canonicalName = existing?.user_name || firstName;
	const existingDept = db.prepare('SELECT department_name FROM user_scores WHERE user_id = ? AND department_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
		.get(user_id);
	const canonicalDept = existingDept?.department_name || (department_name || null);
	const { password } = ensureUser(user_id, canonicalName, canonicalDept);
	db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at, department_name) VALUES (?, ?, ?, ?, ?, ?)')
		.run(user_id, canonicalName, points, req.params.id, now, canonicalDept);
	res.status(201).json({ ok: true, password });
});

router.get('/scoreboard/all', (req, res) => {
	const rows = db.prepare(`
		SELECT user_id,
		       MAX(user_name) as user_name,
		       MAX(department_name) as department_name,
		       SUM(points) as points,
		       SUM(CASE WHEN points < 0 THEN -points ELSE 0 END) as redeemed_points
		FROM user_scores
		GROUP BY user_id
		ORDER BY points DESC
		LIMIT 20
	`).all();
	res.json({ leaderboard: rows });
});

// Student points balance (global)
router.get('/user/:userId/balance', (req, res) => {
	const userId = String(req.params.userId || '').trim();
	if (!userId) return res.status(400).json({ error: 'invalid user id' });
	const row = db.prepare('SELECT IFNULL(SUM(points),0) as points FROM user_scores WHERE user_id = ?').get(userId);
	res.json({ user_id: userId, points: row.points });
});

// Student points balance within a campaign
router.get('/:id/user/:userId/balance', (req, res) => {
	const campaignId = Number(req.params.id);
	const userId = String(req.params.userId || '').trim();
	if (!campaignId || !userId) return res.status(400).json({ error: 'invalid parameters' });
	const row = db.prepare('SELECT IFNULL(SUM(points),0) as points FROM user_scores WHERE user_id = ? AND campaign_id = ?').get(userId, campaignId);
	res.json({ user_id: userId, campaign_id: campaignId, points: row.points });
});

export default router;

// Education resources
router.get('/:id/education', (req, res) => {
    const rows = db.prepare('SELECT * FROM education_resources WHERE campaign_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ resources: rows });
});

router.post('/:id/education', (req, res) => {
    const { title, content_url = null, content_type = 'article', points = 0 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const now = nowIso();
    const info = db.prepare('INSERT INTO education_resources (title, content_url, content_type, points, campaign_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(title, content_url, content_type, Number(points || 0), req.params.id, now);
    const row = db.prepare('SELECT * FROM education_resources WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ resource: row });
});

router.post('/education/:resourceId/complete', (req, res) => {
    const { user_id, user_name = null, department_name = null } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const r = db.prepare('SELECT * FROM education_resources WHERE id = ?').get(req.params.resourceId);
    if (!r) return res.status(404).json({ error: 'resource not found' });
    const now = nowIso();
    db.prepare('INSERT INTO education_completions (resource_id, user_id, user_name, department_name, points_awarded, completed_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.params.resourceId, user_id, user_name, department_name, r.points || 0, now);
    if ((r.points || 0) > 0 && r.campaign_id) {
        const existing = db.prepare('SELECT user_name FROM user_scores WHERE user_id = ? AND user_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
            .get(user_id);
        const firstName = String(user_name || '').trim().split(/\s+/)[0] || null;
        const canonicalName = existing?.user_name || firstName;
        const existingDept = db.prepare('SELECT department_name FROM user_scores WHERE user_id = ? AND department_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
            .get(user_id);
        const canonicalDept = existingDept?.department_name || (department_name || null);
        // Ensure user provisioned
        ensureUser(user_id, canonicalName, canonicalDept);
        db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at, department_name) VALUES (?, ?, ?, ?, ?, ?)')
            .run(user_id, canonicalName, r.points || 0, r.campaign_id, now, canonicalDept);
    }
    res.status(201).json({ ok: true, points: r.points || 0 });
});

// Delete a single resource and its completions
router.delete('/education/:resourceId', (req, res) => {
    const id = Number(req.params.resourceId);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const tx = db.transaction(() => {
        db.prepare('DELETE FROM education_completions WHERE resource_id = ?').run(id);
        db.prepare('DELETE FROM education_resources WHERE id = ?').run(id);
    });
    tx();
    res.json({ ok: true });
});

// Drives
router.get('/:id/drives', (req, res) => {
    const rows = db.prepare('SELECT * FROM drives WHERE campaign_id = ? ORDER BY start_date DESC, created_at DESC').all(req.params.id);
    res.json({ drives: rows });
});

router.post('/:id/drives', (req, res) => {
    const { title, description = '', start_date = null, end_date = null, location = '', points = 0 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const now = nowIso();
    const info = db.prepare('INSERT INTO drives (title, description, start_date, end_date, location, points, campaign_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(title, description, start_date, end_date, location, Number(points || 0), req.params.id, now);
    const row = db.prepare('SELECT * FROM drives WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ drive: row });
});

router.post('/drives/:driveId/register', (req, res) => {
    const { user_id, user_name = null, department_name = null } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const d = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.driveId);
    if (!d) return res.status(404).json({ error: 'drive not found' });
    const now = nowIso();
    db.prepare('INSERT INTO drive_registrations (drive_id, user_id, user_name, department_name, registered_at) VALUES (?, ?, ?, ?, ?)')
        .run(req.params.driveId, user_id, user_name, department_name, now);
    res.status(201).json({ ok: true });
});

router.post('/drives/:driveId/attend', (req, res) => {
    const { user_id, user_name = null, department_name = null } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    const now = nowIso();
    const d = db.prepare('SELECT * FROM drives WHERE id = ?').get(req.params.driveId);
    if (!d) return res.status(404).json({ error: 'drive not found' });
    // Ensure there is a registration row; create one if missing
    let reg = db.prepare('SELECT * FROM drive_registrations WHERE drive_id = ? AND user_id = ?').get(req.params.driveId, user_id);
    if (!reg) {
        const info = db.prepare('INSERT INTO drive_registrations (drive_id, user_id, user_name, department_name, registered_at, attended, attended_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
            .run(req.params.driveId, user_id, user_name, department_name, now, now);
        reg = db.prepare('SELECT * FROM drive_registrations WHERE id = ?').get(info.lastInsertRowid);
    } else if (!reg.attended) {
        db.prepare('UPDATE drive_registrations SET attended = 1, attended_at = ?, user_name = COALESCE(user_name, ?), department_name = COALESCE(department_name, ?) WHERE id = ?')
            .run(now, user_name, department_name, reg.id);
        reg = { ...reg, attended: 1, attended_at: now, user_name: reg.user_name || user_name, department_name: reg.department_name || department_name };
    }
    // Award points to leaderboard if configured
    if ((d.points || 0) > 0 && d.campaign_id) {
        const existing = db.prepare('SELECT user_name FROM user_scores WHERE user_id = ? AND user_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
            .get(user_id);
        const firstName = String((user_name || reg.user_name || '')).trim().split(/\s+/)[0] || null;
        const canonicalName = existing?.user_name || firstName;
        const existingDept = db.prepare('SELECT department_name FROM user_scores WHERE user_id = ? AND department_name IS NOT NULL ORDER BY created_at ASC LIMIT 1')
            .get(user_id);
        const canonicalDept = existingDept?.department_name || (department_name || reg.department_name || null);
        // Ensure user provisioned
        ensureUser(user_id, canonicalName, canonicalDept);
        db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at, department_name) VALUES (?, ?, ?, ?, ?, ?)')
            .run(user_id, canonicalName, d.points || 0, d.campaign_id, now, canonicalDept);
    }
    res.json({ ok: true });
});

// Rewards store
router.get('/:id/rewards', (req, res) => {
    const rows = db.prepare('SELECT * FROM rewards WHERE active = 1 AND (campaign_id = ? OR campaign_id IS NULL) ORDER BY created_at DESC').all(req.params.id);
    res.json({ rewards: rows });
});

router.post('/:id/rewards', (req, res) => {
    const { title, description = '', cost_points, stock = 0, active = 1 } = req.body || {};
    if (!title || typeof cost_points !== 'number') return res.status(400).json({ error: 'title and numeric cost_points are required' });
    const now = nowIso();
    const info = db.prepare('INSERT INTO rewards (title, description, cost_points, stock, active, created_at, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(title, description, cost_points, stock, active ? 1 : 0, now, req.params.id);
    const row = db.prepare('SELECT * FROM rewards WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ reward: row });
});

router.post('/rewards/:id/redeem', (req, res) => {
	const { user_id, user_name = null, department_name = null } = req.body || {};
	if (!user_id) return res.status(400).json({ error: 'user_id is required' });
	const r = db.prepare('SELECT * FROM rewards WHERE id = ? AND active = 1').get(req.params.id);
	if (!r) return res.status(404).json({ error: 'reward not found' });
	if ((r.stock || 0) <= 0) return res.status(400).json({ error: 'out of stock' });
	// Enforce one redemption per user per reward
	const already = db.prepare('SELECT 1 as x FROM redemptions WHERE reward_id = ? AND user_id = ? LIMIT 1').get(req.params.id, user_id);
	if (already) return res.status(400).json({ error: 'gift already redeemed' });
	const campaignId = r.campaign_id || null;
	// Check user points balance (per campaign if campaignId set)
	const balance = campaignId != null
		? db.prepare('SELECT IFNULL(SUM(points),0) as p FROM user_scores WHERE user_id = ? AND campaign_id = ?').get(user_id, campaignId).p
		: db.prepare('SELECT IFNULL(SUM(points),0) as p FROM user_scores WHERE user_id = ?').get(user_id).p;
	if (balance < r.cost_points) return res.status(400).json({ error: 'insufficient points' });
	const now = nowIso();
	// Canonical first name and department
	const existingName = db.prepare('SELECT user_name FROM user_scores WHERE user_id = ? AND user_name IS NOT NULL ORDER BY created_at ASC LIMIT 1').get(user_id)?.user_name || null;
	const firstName = String(user_name || '').trim().split(/\s+/)[0] || null;
	const canonicalName = existingName || firstName;
	const existingDept = db.prepare('SELECT department_name FROM user_scores WHERE user_id = ? AND department_name IS NOT NULL ORDER BY created_at ASC LIMIT 1').get(user_id)?.department_name || null;
	const canonicalDept = existingDept || (department_name || null);
	// Ensure user provisioned
	ensureUser(user_id, canonicalName, canonicalDept);
	// Deduct by adding a negative score entry in the same campaign scope
	db.prepare('INSERT INTO user_scores (user_id, user_name, points, campaign_id, created_at, department_name) VALUES (?, ?, ?, ?, ?, ?)')
		.run(user_id, canonicalName, -r.cost_points, campaignId, now, canonicalDept);
	db.prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?').run(req.params.id);
	db.prepare('INSERT INTO redemptions (reward_id, user_id, user_name, department_name, redeemed_at) VALUES (?, ?, ?, ?, ?)')
		.run(req.params.id, user_id, canonicalName, canonicalDept, now);
	res.json({ ok: true });
});

// Delete a campaign and cascade related data
router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const tx = db.transaction(() => {
        db.prepare('DELETE FROM education_completions WHERE resource_id IN (SELECT id FROM education_resources WHERE campaign_id = ?)').run(id);
        db.prepare('DELETE FROM education_resources WHERE campaign_id = ?').run(id);
        db.prepare('DELETE FROM drive_registrations WHERE drive_id IN (SELECT id FROM drives WHERE campaign_id = ?)').run(id);
        db.prepare('DELETE FROM drives WHERE campaign_id = ?').run(id);
        db.prepare('DELETE FROM user_scores WHERE campaign_id = ?').run(id);
        db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    });
    tx();
    res.json({ ok: true });
});