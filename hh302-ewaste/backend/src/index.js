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
import departmentsRouter from './routes/departments.js';
import campaignsRouter from './routes/campaigns.js';

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

app.use('/api/items', itemsRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/pickups', pickupsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/campaigns', campaignsRouter);

app.use((err, req, res, next) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ error: 'Internal Server Error', details: err?.message || 'Unknown error' });
});

app.listen(PORT, () => {
	console.log(`HH302 E-Waste backend running on http://localhost:${PORT}`);
});