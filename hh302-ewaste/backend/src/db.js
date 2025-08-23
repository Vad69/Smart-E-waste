import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import dayjs from 'dayjs';
import { generateRandomPassword, generateSalt, hashPassword } from './services/auth.js';

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');
const DB_PATH = path.join(DATA_DIR, 'ewaste.db');

if (!fs.existsSync(DATA_DIR)) {
	fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
	db.exec(`
		CREATE TABLE IF NOT EXISTS departments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE
		);

		CREATE TABLE IF NOT EXISTS categories (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			key TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			hazard_level TEXT NOT NULL DEFAULT 'low'
		);

		CREATE TABLE IF NOT EXISTS items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			qr_uid TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			category_key TEXT,
			status TEXT NOT NULL DEFAULT 'reported',
			department_id INTEGER,
			condition TEXT,
			purchase_date TEXT,
			weight_kg REAL DEFAULT 0,
			hazardous INTEGER NOT NULL DEFAULT 0,
			recyclable INTEGER NOT NULL DEFAULT 1,
			reusable INTEGER NOT NULL DEFAULT 0,
			serial_number TEXT,
			asset_tag TEXT,
			reported_by TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			FOREIGN KEY(department_id) REFERENCES departments(id),
			FOREIGN KEY(category_key) REFERENCES categories(key)
		);

		CREATE TABLE IF NOT EXISTS item_events (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			item_id INTEGER NOT NULL,
			event_type TEXT NOT NULL,
			notes TEXT,
			created_at TEXT NOT NULL,
			FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS vendors (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			contact_name TEXT,
			phone TEXT,
			email TEXT,
			address TEXT,
			type TEXT NOT NULL,
			license_no TEXT,
			created_at TEXT NOT NULL,
			active INTEGER NOT NULL DEFAULT 1
		);

		CREATE TABLE IF NOT EXISTS pickups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			vendor_id INTEGER NOT NULL,
			scheduled_date TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'scheduled',
			created_at TEXT NOT NULL,
			manifest_no TEXT,
			transporter_name TEXT,
			vehicle_no TEXT,
			transporter_contact TEXT,
			FOREIGN KEY(vendor_id) REFERENCES vendors(id)
		);

		CREATE TABLE IF NOT EXISTS pickup_items (
			pickup_id INTEGER NOT NULL,
			item_id INTEGER NOT NULL,
			PRIMARY KEY (pickup_id, item_id),
			FOREIGN KEY(pickup_id) REFERENCES pickups(id) ON DELETE CASCADE,
			FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
		);

		CREATE TABLE IF NOT EXISTS campaigns (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			start_date TEXT,
			end_date TEXT,
			type TEXT,
			points INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS user_scores (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id TEXT NOT NULL,
			user_name TEXT,
			points INTEGER NOT NULL,
			campaign_id INTEGER,
			created_at TEXT NOT NULL,
			FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
		);

		CREATE TABLE IF NOT EXISTS settings (
			key TEXT PRIMARY KEY,
			value TEXT
		);

		-- Education resources (sustainability content)
		CREATE TABLE IF NOT EXISTS education_resources (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			content_url TEXT,
			content_type TEXT NOT NULL DEFAULT 'article', -- article | video | quiz | guide
			points INTEGER NOT NULL DEFAULT 0,
			campaign_id INTEGER,
			created_at TEXT NOT NULL,
			FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
		);

		CREATE TABLE IF NOT EXISTS education_completions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			resource_id INTEGER NOT NULL,
			user_id TEXT NOT NULL,
			user_name TEXT,
			department_name TEXT,
			points_awarded INTEGER NOT NULL DEFAULT 0,
			completed_at TEXT NOT NULL,
			FOREIGN KEY(resource_id) REFERENCES education_resources(id)
		);

		-- Collection drives
		CREATE TABLE IF NOT EXISTS drives (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			start_date TEXT,
			end_date TEXT,
			location TEXT,
			capacity INTEGER,
			points INTEGER NOT NULL DEFAULT 0,
			campaign_id INTEGER,
			created_at TEXT NOT NULL,
			FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
		);

		CREATE TABLE IF NOT EXISTS drive_registrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			drive_id INTEGER NOT NULL,
			user_id TEXT NOT NULL,
			user_name TEXT,
			department_name TEXT,
			registered_at TEXT NOT NULL,
			attended INTEGER NOT NULL DEFAULT 0,
			attended_at TEXT,
			FOREIGN KEY(drive_id) REFERENCES drives(id) ON DELETE CASCADE
		);

		-- Rewards store
		CREATE TABLE IF NOT EXISTS rewards (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			description TEXT,
			cost_points INTEGER NOT NULL,
			stock INTEGER NOT NULL DEFAULT 0,
			active INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS redemptions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			reward_id INTEGER NOT NULL,
			user_id TEXT NOT NULL,
			user_name TEXT,
			department_name TEXT,
			redeemed_at TEXT NOT NULL,
			FOREIGN KEY(reward_id) REFERENCES rewards(id)
		);
	`);

	// Vendor migrations
	const vendorCols = db.prepare('PRAGMA table_info(vendors)').all();
	const ensureVendorCol = (name, def) => { if (!vendorCols.some(c => c.name === name)) { try { db.exec(`ALTER TABLE vendors ADD COLUMN ${name} ${def}`); } catch {} } };
	ensureVendorCol('active', 'INTEGER NOT NULL DEFAULT 1');
	ensureVendorCol('authorization_no', 'TEXT');
	ensureVendorCol('auth_valid_from', 'TEXT');
	ensureVendorCol('auth_valid_to', 'TEXT');
	ensureVendorCol('gst_no', 'TEXT');
	ensureVendorCol('capacity_tpm', 'REAL');
	ensureVendorCol('categories_handled', 'TEXT');

	// Pickups migrations (manifest/transporter)
	const pickupCols = db.prepare('PRAGMA table_info(pickups)').all();
	const ensurePickupCol = (name, def) => { if (!pickupCols.some(c => c.name === name)) { try { db.exec(`ALTER TABLE pickups ADD COLUMN ${name} ${def}`); } catch {} } };
	ensurePickupCol('manifest_no', 'TEXT');
	ensurePickupCol('transporter_name', 'TEXT');
	ensurePickupCol('vehicle_no', 'TEXT');
	ensurePickupCol('transporter_contact', 'TEXT');

	// User scores migrations
	const scoreCols = db.prepare('PRAGMA table_info(user_scores)').all();
	if (!scoreCols.some(c => c.name === 'department_name')) {
		try { db.exec('ALTER TABLE user_scores ADD COLUMN department_name TEXT'); } catch {}
	}

	// Rewards migrations
	const rewardCols = db.prepare('PRAGMA table_info(rewards)').all();
	if (!rewardCols.some(c => c.name === 'campaign_id')) {
		try { db.exec('ALTER TABLE rewards ADD COLUMN campaign_id INTEGER'); } catch {}
	}

	// Seed categories
	const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
	if (categoryCount === 0) {
		const insertCat = db.prepare('INSERT INTO categories (key, name, hazard_level) VALUES (?, ?, ?)');
		insertCat.run('recyclable', 'Recyclable', 'low');
		insertCat.run('reusable', 'Reusable', 'low');
		insertCat.run('hazardous', 'Hazardous', 'high');
	}

			// Seed facility settings defaults (if empty)
		const settingsCount = db.prepare('SELECT COUNT(*) as c FROM settings').get().c;
		if (settingsCount === 0) {
			const set = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
			set.run('facility_name', '');
			set.run('facility_address', '');
			set.run('facility_authorization_no', '');
			set.run('facility_contact_name', '');
			set.run('facility_contact_phone', '');
		}

		// Ensure admin credentials and token secret
		const hasHash = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get();
		if (!hasHash) {
			const { generateRandomPassword, generateSalt, hashPassword } = await import('./services/auth.js');
			const set = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
			const password = generateRandomPassword(12);
			const salt = generateSalt(16);
			const hash = hashPassword(password, salt);
			set.run('admin_username', 'admin');
			set.run('admin_password_salt', salt);
			set.run('admin_password_hash', hash);
			console.log('\n====================================================');
			console.log(' Initial admin credentials');
			console.log('   username: admin');
			console.log(`   password: ${password}`);
			console.log('   (Change it in Settings > Change Admin Password)');
			console.log('====================================================\n');
		}
		const tokenSecret = db.prepare("SELECT value FROM settings WHERE key='auth_token_secret'").get();
		if (!tokenSecret) {
			const secret = Buffer.from(crypto.randomBytes(32)).toString('hex');
			try { db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('auth_token_secret', secret); } catch {}
		}
}

export function nowIso() {
	return dayjs().toISOString();
}