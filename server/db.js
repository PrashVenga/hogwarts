// server/db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function resolveDbFile() {
  const candidates = [
    process.env.DB_PATH && path.normalize(process.env.DB_PATH),
    path.join(__dirname, 'db', 'hogwarts_integrated.db'),
    path.join(__dirname, 'db', 'hogwarts_final_version.db'),
    path.join(__dirname, 'db', 'bookings.db'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      // If file exists or its directory exists (so we can create it), pick it
      if (fs.existsSync(p) || fs.existsSync(path.dirname(p))) return p;
    } catch (_) {}
  }
  // Fallback
  return path.join(__dirname, 'db', 'bookings.db');
}

const DB_PATH = resolveDbFile();
const SCHEMA_PATH = path.join(__dirname, 'db', 'hogwarts1_nodb_sqlite.sql');

// Ensure folder
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) throw err;
  console.log('✅ SQLite connected ->', DB_PATH);

  // PRAGMAs
  db.serialize(() => {
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA temp_store = MEMORY');
    db.run('PRAGMA cache_size = -16000'); // ~16MB
    db.run('PRAGMA busy_timeout = 5000');
    db.run('PRAGMA foreign_keys = ON');
  });

  // If there’s no schema file, just stop here (we’re likely using an existing DB)
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.warn('ℹ️ No schema file found (using existing DB):', SCHEMA_PATH);
    return;
  }

  // Only apply schema if DB looks empty (no facilities table)
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='facilities'`, (e2, row) => {
    if (e2) {
      console.warn('⚠️ Could not inspect tables:', e2.message);
      return;
    }
    if (row) {
      console.log('🧪 Schema load skipped (tables already present)');
      return;
    }

    // Load and normalize SQL
    const raw = fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/\r\n/g, '\n');
    const noBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    let stmts = noBlockComments
      .split(/;\s*\n/g)
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => !/^\s*--/.test(s))
      .map(s => (s.endsWith(';') ? s : s + ';'));

    const isInsert = (s) => /(^|\s)INSERT\s+INTO\s+/i.test(s);
    const ddlStmts = stmts.filter(s => !isInsert(s));
    const dmlStmts = stmts.filter(isInsert);

    const ddlBatch = ddlStmts.join('\n');
    db.exec(ddlBatch, (e3) => {
      if (e3) {
        console.error('❌ DDL failed:', e3.message);
        return;
      }
      console.log('✅ DDL applied from schema');

      if (!dmlStmts.length) {
        console.log('ℹ️ No seed INSERTs in schema');
        return;
      }

      const seedBatch = dmlStmts.join('\n');
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = OFF');
        db.exec(seedBatch, (e4) => {
          db.run('PRAGMA foreign_keys = ON');
          if (e4) {
            console.error('❌ Seed failed:', e4.message);
            return;
          }
          console.log('🧩 Seed applied');
        });
      });
    });
  });
});

// Promise helpers (use these in routes)
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbExec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

module.exports = Object.assign(db, { dbRun, dbAll, dbGet, dbExec });
