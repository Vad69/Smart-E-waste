import express from 'express';
import { db } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
	const rows = db.prepare('SELECT * FROM departments ORDER BY name ASC').all();
	res.json({ departments: rows });
});

router.post('/', (req, res) => {
	const { name } = req.body || {};
	if (!name) return res.status(400).json({ error: 'name is required' });
	try {
		const info = db.prepare('INSERT INTO departments (name) VALUES (?)').run(name);
		res.status(201).json({ department: { id: info.lastInsertRowid, name } });
	} catch (e) {
		res.status(400).json({ error: 'Department may already exist' });
	}
});

export default router;