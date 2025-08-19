import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Point to DB and your SQL file
const DB_FILE  = path.join(__dirname, 'bookings.db');
const SQL_FILE = "C:/Users/Prash/hogwartsV2/server/db/hogwarts1_nodb_sqlite.sql"; // absolute path safest

console.log('[seed] Using DB:', DB_FILE);
console.log('[seed] Reading SQL:', SQL_FILE);

const sql = fs.readFileSync(SQL_FILE, 'utf8');

// Execute (standard SQL only; .meta commands like .mode/.read must not be in the file)
const db = new Database(DB_FILE);
db.exec(sql);
console.log('[seed] Done.');
