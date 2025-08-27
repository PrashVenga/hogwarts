// tools/reset-student-teacher-admin-passwords.js
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const DB_USERS_PATH = path.join(__dirname, '..', 'db', 'hogwarts1_nodb_updated_admin.db');

const db = new sqlite3.Database(DB_USERS_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Failed to open Users DB:', DB_USERS_PATH, '\n', err.message);
    process.exit(1);
  }
});

const qAll = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, rows) => e ? rej(e) : res(rows)));
const qRun = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function (e) { e ? rej(e) : res(this); }));

(async () => {
  try {
    // Figure out the identifier column(s) present
    const cols = await qAll(`PRAGMA table_info(users)`);
    const hasHid = cols.some(c => c.name.toLowerCase() === 'hogwartsid');
    const hasUser = cols.some(c => c.name.toLowerCase() === 'username');
    if (!hasHid && !hasUser) throw new Error('users table missing hogwartsId/username');

    const idCols = [hasHid ? 'hogwartsId' : null, hasUser ? 'username' : null].filter(Boolean).join(', ');

    // Grab students, teachers, and admins
    const people = await qAll(`
      SELECT rowid as rid, ${idCols}, role 
      FROM users 
      WHERE role IN ('student', 'teacher', 'admin') 
      ORDER BY role, rowid
    `);

    if (!people.length) {
      console.log('No students, teachers, or admins found.');
      db.close();
      return;
    }

    console.log(`Found ${people.length} accounts (students/teachers/admins). Resetting passwords...`);
    console.log('------------------------------------------------------------');
    console.log('Role     | ID/Username         | New Plain Password');
    console.log('------------------------------------------------------------');

    let updated = 0, skipped = 0;
    for (const p of people) {
      const id = p.hogwartsId || p.username || '';
      let newPassword;

      if (p.role === 'admin') {
        // All admins get "001"
        newPassword = '001';
      } else {
        // Students & teachers: trailing 3 digits of ID
        const m = String(id).match(/(\d+)\s*$/);
        if (!m) {
          console.warn(`(skip) ${p.role} -> ${id} : no trailing digits`);
          skipped++;
          continue;
        }
        let digits = m[1];
        if (digits.length > 3) digits = digits.slice(-3);
        newPassword = digits;
      }

      // bcrypt hash
      const hash = await bcrypt.hash(newPassword, 10);
      await qRun(`UPDATE users SET password = ? WHERE rowid = ?`, [hash, p.rid]);
      updated++;

      console.log(`${(p.role + '      ').slice(0, 8)}| ${(id + '                   ').slice(0, 21)}| ${newPassword}`);
    }

    console.log('------------------------------------------------------------');
    console.log(`✅ Updated: ${updated}   ❗ Skipped (no digits): ${skipped}`);
    console.log('Done. Distribute the shown plain passwords to users. Ask them to change it after first login.');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    db.close();
  }
})();
