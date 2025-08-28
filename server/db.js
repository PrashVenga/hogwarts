// server/db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'db', 'bookings.db');
const SCHEMA_PATH = path.join(__dirname, 'db', 'hogwarts1_nodb_sqlite.sql');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) throw err;
  console.log('✅ SQLite connected ->', DB_PATH);

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.warn('⚠️  Schema file not found:', SCHEMA_PATH);
    return;
  }

  // Load SQL and normalize newlines
  const raw = fs.readFileSync(SCHEMA_PATH, 'utf8').replace(/\r\n/g, '\n');

  // Remove block comments /* ... */ and trim
  const noBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');

  // Split into statements at semicolon + newline
  let stmts = noBlockComments
    .split(/;\s*\n/g)
    .map(s => s.trim())
    .filter(Boolean);

  // Drop pure single-line comments and empty
  stmts = stmts.filter(s => !/^\s*--/.test(s));

  // Put the semicolon back for sqlite parser, just in case
  stmts = stmts.map(s => (s.endsWith(';') ? s : s + ';'));

  // Classify
  const isInsert = (s) => /(^|\s)INSERT\s+INTO\s+/i.test(s);
  const ddlStmts  = stmts.filter(s => !isInsert(s)); // CREATE TABLE/VIEW, DROP VIEW, etc.
  const dmlStmts  = stmts.filter(isInsert);          // INSERTs (seed)

  // 1) Apply DDL in one go
  const ddlBatch = ddlStmts.join('\n');
  db.exec(ddlBatch, (e) => {
    if (e) {
      console.error('❌ DDL failed:', e.message);
      return;
    }
    console.log('✅ DDL applied');

    // 2) Decide whether to seed
    db.get('SELECT COUNT(*) AS c FROM facilities;', (countErr, row) => {
      if (countErr) {
        console.warn('⚠️ Could not count facilities, attempting seed anyway:', countErr.message);
      }

      const alreadySeeded = (row && row.c > 0);
      if (alreadySeeded) {
        console.log('🧪 Seed skipped (data already present)');
        return;
      }

      if (dmlStmts.length === 0) {
        console.log('ℹ️ No seed INSERTs found');
        return;
      }

      // 3) Apply seed in one go
      const seedBatch = dmlStmts.join('\n');
      // Temporarily disable FK checks during seed load to avoid order flaps, then re-enable
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = OFF');
        db.exec(seedBatch, (seedErr) => {
          db.run('PRAGMA foreign_keys = ON');
          if (seedErr) {
            console.error('❌ Seed failed:', seedErr.message);
            return;
          }
          console.log('🧩 Seed applied');
        });
      });
    });
  });
});

module.exports = db;