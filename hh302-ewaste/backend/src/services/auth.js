import crypto from 'crypto';
import { db, nowIso } from '../db.js';

const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSetting(key) {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
	return row ? row.value : null;
}

function setSetting(key, value) {
	db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value ?? ''));
}

export function ensureAuthSecret() {
	let secret = getSetting('auth_secret');
	if (!secret) {
		secret = crypto.randomBytes(32).toString('hex');
		setSetting('auth_secret', secret);
	}
	return secret;
}

export function hashPassword(password, saltHex) {
	const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
	const derived = crypto.scryptSync(String(password), salt, 64);
	return { salt: salt.toString('hex'), hash: derived.toString('hex') };
}

export function verifyPassword(password, saltHex, hashHex) {
	if (!saltHex || !hashHex) return false;
	const { hash } = hashPassword(password, saltHex);
	return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashHex, 'hex'));
}

export function ensureInitialAdminPassword() {
	let salt = getSetting('admin_password_salt');
	let hash = getSetting('admin_password_hash');
	if (!salt || !hash) {
		const pwd = crypto.randomBytes(6).toString('base64url'); // short random
		const h = hashPassword(pwd);
		setSetting('admin_password_salt', h.salt);
		setSetting('admin_password_hash', h.hash);
		console.log(`\n[ADMIN] Initial admin password: ${pwd}\n`);
	}
}

function sign(payloadObj, secret) {
	const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
	const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

function verify(token, secret) {
	if (!token || typeof token !== 'string' || !token.includes('.')) return null;
	const [payload, sig] = token.split('.', 2);
	const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
	if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
	try {
		const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (obj.exp && Date.now() > obj.exp) return null;
		return obj;
	} catch { return null; }
}

export function createAdminToken() {
	const secret = ensureAuthSecret();
	const exp = Date.now() + TOKEN_TTL_SECONDS * 1000;
	return sign({ sub: 'admin', role: 'admin', exp }, secret);
}

export function verifyAdminToken(token) {
	const secret = ensureAuthSecret();
	const payload = verify(token, secret);
	if (!payload || payload.role !== 'admin') return null;
	return payload;
}

export function authMiddleware(req, res, next) {
	const allow = req.path.startsWith('/api/auth') || req.path === '/api/health';
	if (allow) return next();
	const h = req.get('authorization') || '';
	const token = h.startsWith('Bearer ') ? h.slice(7) : null;
	const ok = token && verifyAdminToken(token);
	if (!ok) return res.status(401).json({ error: 'Unauthorized' });
	req.user = { role: 'admin' };
	next();
}