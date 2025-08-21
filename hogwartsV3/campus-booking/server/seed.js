
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const dbPath  = path.join(__dirname, 'db', 'bookings.db');
const defaultSql = path.join(__dirname, 'db', 'hogwarts_intergratedDB finalized.sql');
const sqlPath = path.resolve(process.argv[2] || defaultSql);

// Ensure DB folder exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

if (!fs.existsSync(sqlPath)) {
  console.error('❌ SQL file not found at:', sqlPath);
  process.exit(1);
}

// Read & pre-clean SQL
let raw = fs.readFileSync(sqlPath, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')  // /* comments */
  .replace(/--.*$/gm, '')            // -- comments
  .replace(/\bpublic\./g, '');       // drop schema prefixes

// Helper: split into statements
const stmts = [];
let buf = '';
for (const line of raw.split(/\r?\n/)) {
  buf += line + '\n';
  if (line.trim().endsWith(';')) {
    stmts.push(buf.trim());
    buf = '';
  }
}

// Detect “integrated” SQL (has facility_bookings) vs “simple” V3-style
const isIntegrated = /insert\s+into\s+["`]?facility_bookings["`]?\s*\(/i.test(raw);

// App schema (V3)
const appSchema = `
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  hogwartsId TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  hogwartsId TEXT NOT NULL,
  facility   TEXT NOT NULL,
  date       TEXT NOT NULL,
  timeSlot   TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_slot ON bookings(facility, date, timeSlot);
`;

const db = new sqlite3.Database(dbPath);
const execP = (sql) => new Promise((res, rej) => db.exec(sql, e => e ? rej(e) : res()));
const allP  = (sql, p=[]) => new Promise((res, rej) => db.all(sql, p, (e, r)=> e?rej(e):res(r)));
const runP  = (sql, p=[]) => new Promise((res, rej) => db.run(sql, p, function(e){ e?rej(e):res(this); }));

function slugForFacilityName(name='') {
  const n = name.toLowerCase();
  if (n.includes('badminton')) return 'badminton';
  if (n.includes('swimming'))  return 'swimming';
  if (n.includes('gym'))       return 'gym';
  if (n.includes('classroom')) {
    const m = n.match(/classroom\s*(\d+)/);
    const idx = m ? parseInt(m[1],10) : 1;
    return ['classroomA','classroomB','classroomC','classroomD'][Math.max(1,Math.min(idx,4))-1];
  }
  return n.replace(/\s+/g,'') || 'unknown';
}
const slot = (s,e) => `${String(s).slice(0,5)}-${String(e).slice(0,5)}`;

(async () => {
  console.log('🔧 Seeding into', dbPath);
  await execP('PRAGMA foreign_keys = ON; BEGIN;');
  await execP(appSchema);

  if (isIntegrated) {
    // ---------- Integrated path: users, facilities, facility_bookings ----------
    console.log('📦 Detected integrated SQL (facilities + facility_bookings). Importing via temp tables…');

    // Create temp import tables
    await execP(`
      DROP TABLE IF EXISTS import_users;
      DROP TABLE IF EXISTS import_facilities;
      DROP TABLE IF EXISTS import_facility_bookings;

      CREATE TABLE import_users (
        user_id INTEGER,
        username TEXT,
        password TEXT,
        role TEXT,
        initial_password TEXT
      );
      CREATE TABLE import_facilities (
        facility_id INTEGER,
        name TEXT,
        type TEXT
      );
      CREATE TABLE import_facility_bookings (
        booking_id INTEGER,
        facility_id INTEGER,
        booked_by INTEGER,
        date TEXT,
        start_time TEXT,
        end_time TEXT,
        booking_action TEXT
      );
    `);

    // Gather wanted INSERTs and retarget to import_* tables
    const wanted = ['users','facilities','facility_bookings'];
    const inserts = stmts
      .filter(s => /^insert\s+into\s+/i.test(s))
      .filter(s => wanted.some(t => new RegExp(`insert\\s+into\\s+["\`]?(?:${t})["\`]?\\s*\\(`, 'i').test(s)))
      .map(s => s
        .replace(/INSERT\s+INTO\s+users\s*\(/i, 'INSERT INTO import_users(')
        .replace(/INSERT\s+INTO\s+facilities\s*\(/i, 'INSERT INTO import_facilities(')
        .replace(/INSERT\s+INTO\s+facility_bookings\s*\(/i, 'INSERT INTO import_facility_bookings(')
      );

    for (const stmt of inserts) {
      try { await execP(stmt); }
      catch (e) { console.warn('⚠️ Skipped one INSERT:', e.message); }
    }

    // Users → V3.users (rehash with bcrypt using initial_password if present)
    const importUsers = await allP(`SELECT username, role, initial_password FROM import_users`);
    let uCount = 0;
    for (const u of importUsers) {
      const plain = u.initial_password || 'changeme123';
      const hash  = await bcrypt.hash(plain, 10);
      try {
        await runP(
          `INSERT OR IGNORE INTO users (hogwartsId, password, role) VALUES (?, ?, ?)`,
          [u.username, hash, u.role || 'student']
        );
        uCount++;
      } catch (e) {
        console.warn(`⚠️ User ${u.username} skipped:`, e.message);
      }
    }

    // Bookings → V3.bookings (only Add actions)
    const rows = await allP(`
      SELECT fb.booking_id, fb.facility_id, fb.date, fb.start_time, fb.end_time,
             COALESCE(fb.booking_action,'Add') AS action,
             f.name AS facility_name,
             u.username
      FROM import_facility_bookings fb
      LEFT JOIN import_facilities f ON f.facility_id = fb.facility_id
      LEFT JOIN import_users u ON u.user_id = fb.booked_by
      WHERE COALESCE(fb.booking_action,'Add') = 'Add'
    `);

    let bTried = 0, bInserted = 0;
    for (const r of rows) {
      bTried++;
      if (!r.username || !r.facility_name || !r.date || !r.start_time || !r.end_time) continue;
      try {
        await runP(
          `INSERT OR IGNORE INTO bookings (hogwartsId, facility, date, timeSlot) VALUES (?, ?, ?, ?)`,
          [r.username, slugForFacilityName(r.facility_name), r.date, slot(r.start_time, r.end_time)]
        );
        bInserted++;
      } catch (e) {
        console.warn(`⚠️ Booking ${r.booking_id} skipped:`, e.message);
      }
    }

    // (Optional) cleanup
    await execP(`
      DROP TABLE IF EXISTS import_facility_bookings;
      DROP TABLE IF EXISTS import_facilities;
      DROP TABLE IF EXISTS import_users;
    `);

    await execP('COMMIT;');
    console.log(`✅ Seed complete from integrated SQL → users: ${uCount}, bookings inserted: ${bInserted}/${bTried}`);
  } else {
    // ---------- Simple path: direct INSERTs into users/bookings ----------
    console.log('📦 Detected simple V2/V3-style INSERTs.');

    const inserts = stmts
      .filter(s => /^insert\s+into\s+[`"]?(users|bookings)[`"]?/i.test(s))
      .map(s => s
        .replace(/`/g, '"')
        .replace(/ON\s+CONFLICT[\s\S]*?DO\s+NOTHING/gi, '')
        .replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE[\s\S]*$/gi, '')
        .replace(/^INSERT\s+INTO/i, 'INSERT OR IGNORE INTO')
        .replace(/\s*;+\s*$/,';')
      )
      .join('\n');

    await execP(inserts);
    await execP('COMMIT;');
    console.log('✅ Seeded DB from', sqlPath);
  }

  db.close();
})().catch(async (e) => {
  console.error('❌ Seeding failed:', e.message);
  try { await execP('ROLLBACK;'); } catch {}
  db.close();
  process.exit(1);
});
