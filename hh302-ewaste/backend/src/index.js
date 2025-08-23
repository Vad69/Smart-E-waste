import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initializeDatabase } from './db.js';

import itemsRouter from './routes/items.js';
import vendorsRouter from './routes/vendors.js';
import pickupsRouter from './routes/pickups.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import departmentsRouter from './routes/departments.js';
import campaignsRouter from './routes/campaigns.js';
import authRouter from './routes/auth.js';
import vendorPortalRouter from './routes/vendor_portal.js';
import userPortalRouter from './routes/user_portal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || '*'}));
app.use(express.json({ limit: '2mb' }));

initializeDatabase();

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// Auth middleware for all other API routes
app.use((req, res, next) => {
	if (!req.path.startsWith('/api')) return next();
	if (req.path.startsWith('/api/auth') || req.path === '/api/health') return next();
	try {
		const auth = req.get('authorization') || '';
		const m = auth.match(/^Bearer\s+(.+)$/i);
		if (!m) return res.status(401).json({ error: 'Unauthorized' });
		const token = m[1];
		const row = db.prepare("SELECT value FROM settings WHERE key='auth_token_secret'").get();
		const { verifyToken } = await import('./services/auth.js');
		const payload = verifyToken(token, row?.value || 'insecure');
		if (!payload) return res.status(401).json({ error: 'Unauthorized' });
		req.user = payload;
		return next();
	} catch (e) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
});

function requireAdmin(req, res, next) {
	if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
	next();
}

import drivesRouter from './routes/drives.js';
app.use('/api/drives', requireAdmin, drivesRouter);

// Admin-only APIs
app.use('/api/items', requireAdmin, itemsRouter);
app.use('/api/vendors', requireAdmin, vendorsRouter);
app.use('/api/pickups', requireAdmin, pickupsRouter);
app.use('/api/analytics', requireAdmin, analyticsRouter);
app.use('/api/reports', requireAdmin, reportsRouter);
app.use('/api/settings', requireAdmin, settingsRouter);
app.use('/api/departments', requireAdmin, departmentsRouter);
app.use('/api/campaigns', requireAdmin, campaignsRouter);

// Vendor portal APIs
app.use('/api/vendor', vendorPortalRouter);

// User portal APIs
app.use('/api/user', userPortalRouter);

app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error', details: err?.message || 'Unknown error' });
});

app.listen(PORT, () => {
	console.log(`HH302 E-Waste backend running on http://localhost:${PORT}`);
});