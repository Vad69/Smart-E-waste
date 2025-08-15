import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import dayjs from 'dayjs';

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
			created_at TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS pickups (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			vendor_id INTEGER NOT NULL,
			scheduled_date TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'scheduled',
			created_at TEXT NOT NULL,
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
	`);

	const categoryCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
	if (categoryCount === 0) {
		const insertCat = db.prepare('INSERT INTO categories (key, name, hazard_level) VALUES (?, ?, ?)');
		insertCat.run('recyclable', 'Recyclable', 'low');
		insertCat.run('reusable', 'Reusable', 'low');
		insertCat.run('hazardous', 'Hazardous', 'high');
	}

	const deptCount = db.prepare('SELECT COUNT(*) as c FROM departments').get().c;
	if (deptCount === 0) {
		const insertDept = db.prepare('INSERT INTO departments (name) VALUES (?)');
		['IT', 'Labs', 'Admin', 'Hostel', 'Library'].forEach(name => insertDept.run(name));
	}
}

export function nowIso() {
	return dayjs().toISOString();
}