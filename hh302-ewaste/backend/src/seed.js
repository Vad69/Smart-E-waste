import { db, initializeDatabase, nowIso } from './db.js';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

initializeDatabase();

// Seed default departments if not present
const defaultDepartments = ['IT', 'Labs', 'Hostel', 'Admin', 'Facilities'];
for (const deptName of defaultDepartments) {
	db.prepare('INSERT OR IGNORE INTO departments (name) VALUES (?)').run(deptName);
}

function insertVendor(name, type, license_no) {
	const now = nowIso();
	return db.prepare('INSERT INTO vendors (name, type, license_no, created_at) VALUES (?, ?, ?, ?)')
		.run(name, type, license_no, now).lastInsertRowid;
}

function insertItem({ name, description, department_id, weight_kg, category_key, hazardous, recyclable, reusable, condition }) {
	const now = nowIso();
	const qr_uid = uuidv4();
	return db.prepare(`INSERT INTO items (qr_uid, name, description, category_key, status, department_id, condition, purchase_date, weight_kg, hazardous, recyclable, reusable, created_at, updated_at)
		VALUES (?, ?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`).run(qr_uid, name, description, category_key, department_id, condition, dayjs().subtract(365, 'day').toISOString(), weight_kg, hazardous, recyclable, reusable, now, now).lastInsertRowid;
}

console.log('Seeding data...');

// Vendors
const v1 = insertVendor('GreenCycle Recyclers', 'recycler', 'CPCB/REC/12345');
const v2 = insertVendor('SafeHaz Disposal', 'hazardous', 'CPCB/HAZ/88771');
const v3 = insertVendor('Revive Tech Refurb', 'refurbisher', 'CPCB/REF/55221');

// Campaigns
const now = nowIso();
const camp1 = db.prepare('INSERT INTO campaigns (title, description, start_date, end_date, type, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
	.run('E-Waste Awareness Week', 'Daily tips, quizzes, and collection drive', dayjs().subtract(7, 'day').toISOString(), dayjs().add(1, 'day').toISOString(), 'awareness', 10, now).lastInsertRowid;
const camp2 = db.prepare('INSERT INTO campaigns (title, description, start_date, end_date, type, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
	.run('Green Dorm Challenge', 'Hostel-wise collection leaderboard', dayjs().toISOString(), dayjs().add(14, 'day').toISOString(), 'challenge', 20, now).lastInsertRowid;

// Items
const itDept = db.prepare("SELECT id FROM departments WHERE name = 'IT'").get()?.id;
const labsDept = db.prepare("SELECT id FROM departments WHERE name = 'Labs'").get()?.id;
const hostelDept = db.prepare("SELECT id FROM departments WHERE name = 'Hostel'").get()?.id;

insertItem({ name: 'Old Laptop', description: 'Dell Latitude, non-functional keyboard', department_id: itDept, weight_kg: 2.2, category_key: 'recyclable', hazardous: 0, recyclable: 1, reusable: 0, condition: 'poor' });
insertItem({ name: 'Li-ion Battery Pack', description: 'Lithium battery from lab equipment', department_id: labsDept, weight_kg: 1.1, category_key: 'hazardous', hazardous: 1, recyclable: 0, reusable: 0, condition: 'spent' });
insertItem({ name: 'Projector', description: 'Working, minor scratches', department_id: labsDept, weight_kg: 3.5, category_key: 'reusable', hazardous: 0, recyclable: 0, reusable: 1, condition: 'good' });
insertItem({ name: 'CRT Monitor', description: 'Broken screen, heavy', department_id: itDept, weight_kg: 12.0, category_key: 'hazardous', hazardous: 1, recyclable: 0, reusable: 0, condition: 'broken' });
insertItem({ name: 'Mobile Phones Batch', description: 'Assorted old mobiles', department_id: hostelDept, weight_kg: 5.0, category_key: 'recyclable', hazardous: 0, recyclable: 1, reusable: 0, condition: 'mixed' });

console.log('Seed complete.');
process.exit(0);