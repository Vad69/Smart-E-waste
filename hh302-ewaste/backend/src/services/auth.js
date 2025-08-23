import crypto from 'crypto';

const TOKEN_EXP_SECONDS = 60 * 60 * 12; // 12 hours

function base64url(input) {
	return Buffer.from(input)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

function base64urlJson(obj) {
	return base64url(JSON.stringify(obj));
}

export function generateRandomPassword(length = 12) {
	const raw = crypto.randomBytes(length * 2).toString('base64');
	const filtered = raw.replace(/[^A-Za-z0-9]/g, '');
	return filtered.slice(0, length);
}

export function generateSalt(length = 16) {
	return crypto.randomBytes(length).toString('hex');
}

export function hashPassword(password, salt, iterations = 100000, keyLen = 32, digest = 'sha256') {
	const dk = crypto.pbkdf2Sync(password, salt, iterations, keyLen, digest);
	return dk.toString('hex');
}

export function verifyPassword(password, salt, expectedHash) {
	if (!salt || !expectedHash) return false;
	const h = hashPassword(password, salt);
	return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function signToken(payload, secret, expSeconds = TOKEN_EXP_SECONDS) {
	const header = { alg: 'HS256', typ: 'JWT' };
	const now = Math.floor(Date.now() / 1000);
	const body = { ...payload, iat: now, exp: now + expSeconds };
	const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`;
	const sig = crypto
		.createHmac('sha256', secret)
		.update(unsigned)
		.digest('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
	return `${unsigned}.${sig}`;
}

export function verifyToken(token, secret) {
	try {
		const [h, p, s] = token.split('.');
		if (!h || !p || !s) return null;
		const unsigned = `${h}.${p}`;
		const expected = crypto
			.createHmac('sha256', secret)
			.update(unsigned)
			.digest('base64')
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');
		if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null;
		const payload = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
		if (!payload.exp || Math.floor(Date.now() / 1000) > payload.exp) return null;
		return payload;
	} catch (e) {
		return null;
	}
}