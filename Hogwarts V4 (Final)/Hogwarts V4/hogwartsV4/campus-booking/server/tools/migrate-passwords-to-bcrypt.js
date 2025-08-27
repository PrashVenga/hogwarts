// server/tools/migrate-passwords-to-bcrypt.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const DB_PATH = path.join(__dirname, '..', 'db', 'hogwarts1_nodb_updated_admin.db'); // matches your layout

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Open DB failed:', DB_PATH, err.message);
    process.exit(1);
  }
});

const qAll = (sql, params=[]) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));
const qRun = (sql, params=[]) => new Promise((res, rej) => db.run(sql, params, function(e){ e?rej(e):res(this) }));

(async () => {
  try {
    const rows = await qAll(`SELECT rowid AS rid, username, role, password FROM users ORDER BY rowid`);

    let updated = 0, skipped = 0;
    for (const u of rows) {
      const pwd = (u.password || '').trim();

      // Already bcrypt? skip
      if (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$')) {
        skipped++;
        continue;
      }

      // Decide default plain text per role
      let plain;
      if (u.role === 'admin') {
        plain = '001'; // all admins -> 001
      } else {
        // Students/Teachers: trailing 3 digits of username, e.g. student045 -> 045
        const m = String(u.username || '').match(/(\d+)\s*$/);
        if (m) {
          let digits = m[1];
          if (digits.length > 3) digits = digits.slice(-3);
          plain = digits;
        } else {
          plain = '001'; // fallback
        }
      }

      const hash = await bcrypt.hash(plain, 10);
      await qRun(`UPDATE users SET password = ? WHERE rowid = ?`, [hash, u.rid]);
      updated++;
      console.log(`✔ ${u.username} (${u.role}) -> bcrypt set`);
    }

    console.log(`\n✅ Updated to bcrypt: ${updated} | Skipped (already bcrypt): ${skipped}`);
    console.log(`Admins use "001". Students/Teachers use trailing 3 digits (e.g., student045 -> "045").`);
  } catch (e) {
    console.error('❌ Migration error:', e);
  } finally {
    db.close();
  }
})();
