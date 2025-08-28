// ---------------------------
// 0) Dependencies
// ---------------------------
const path    = require('path');
const fs      = require('fs');
const express = require('express');
const bcrypt  = require('bcrypt');
const cors    = require('cors');
const sqlite3 = require('sqlite3').verbose();
const ExcelJS = require('exceljs');

const SALT_ROUNDS = 10;
const app = express();

// ---------------------------
// 1) Middleware
// ---------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../client')));

// Handy API logger
app.use('/api', (req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// ---------------------------
// 2) SQLite (single DB)
// ---------------------------
const DB_PATH = path.join(__dirname, 'db', 'hogwarts_integrated.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ DB file not found:', DB_PATH);
  process.exit(1);
}

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('❌ Failed to open DB:', DB_PATH, '\n', err.message);
    process.exit(1);
  }
  console.log('✅ Integrated DB connected ->', DB_PATH);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;`);
});

// ---------------------------
// 3) Promisified DB helpers
// ---------------------------
const qAll = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows)));
const qGet = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row)));
const qRun = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve(this); }));

// ---------------------------
// 4) Role & auth utils
// ---------------------------
const normalizeRole = (role) => (role || '').toString().trim().toLowerCase();
const isAdminRole   = (role) => ['admin','administrator'].includes(normalizeRole(role));
const isAdminAccount = (row) => isAdminRole(row?.role) || String(row?.username||'').toLowerCase().endsWith('_admin');

async function fetchUserByUsername(username) {
  if (!username) return null;
  return qGet(
    db,
    `SELECT user_id, username, password, role FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1`,
    [String(username)]
  );
}

/**
 * authenticate(username, password)
 * Returns:
 *  - { ok:false, code:404, error:'User not found' }
 *  - { ok:false, code:401, error:'Wrong password' }
 *  - { ok:true, username, userId, role, isAdmin, redirect }
 */
async function authenticate(usernameRaw, pwdRaw) {
  try {
    const username = String(usernameRaw || '').trim();
    const password = String(pwdRaw || '');
    if (!username || !password) {
      return { ok: false, code: 400, error: 'Missing username or password' };
    }
    console.log('[AUTH] login attempt:', username);

    const row = await fetchUserByUsername(username);
    if (!row) return { ok: false, code: 404, error: 'User not found' };

    const stored = String(row.password || '');
    const isBcrypt = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$');

    let ok = false;
    if (isBcrypt) {
      try { ok = await bcrypt.compare(password, stored); }
      catch (e) {
        console.error('[AUTH] bcrypt.compare error:', e);
        return { ok: false, code: 500, error: 'Password verify error' };
      }
    } else {
      // If you still have legacy plaintext rows (should be rare)
      ok = (password === stored);
      if (ok) {
        // Optional: migrate to bcrypt on successful legacy login
        try {
          const hash = await bcrypt.hash(password, SALT_ROUNDS);
          await qRun(db, `UPDATE users SET password = ? WHERE username = ?`, [hash, username]);
        } catch (e) { console.warn('[AUTH] migrate->bcrypt failed (non-fatal):', e.message || e); }
      }
    }

    if (!ok) return { ok: false, code: 401, error: 'Wrong password' };

    const role     = normalizeRole(row.role);
    const isAdmin  = isAdminAccount(row);
    const redirect = isAdmin ? '/staff.html?admin=1' : '/booking.html';

    return { ok: true, username: row.username, userId: row.user_id ?? null, role, isAdmin, redirect };
  } catch (e) {
    console.error('[AUTH] unexpected error:', e);
    return { ok: false, code: 500, error: 'Auth unexpected error' };
  }
}

// ---------------------------
// 5) Facility mapping & time helpers
// ---------------------------
const DISPLAY_TO_SLUG = {
  'Badminton Court': 'badminton',
  'Swimming Pool':   'swimming',
  'Gym':             'gym',
  'Classroom A':     'classrooma',
  'Classroom B':     'classroomb',
  'Classroom C':     'classroomc',
  'Classroom D':     'classroomd',
};
const SLUG_TO_DISPLAY = Object.fromEntries(
  Object.entries(DISPLAY_TO_SLUG).map(([disp, slug]) => [slug.toLowerCase(), disp])
);
const toSlug = (v) => (DISPLAY_TO_SLUG[v] ? DISPLAY_TO_SLUG[v] : String(v || '')).trim().toLowerCase();
const toISO  = (date, hhmm) => `${date}T${hhmm}:00`;

// ---------------------------
// 6) Debug endpoints
// ---------------------------
app.get('/api/_tables', async (_req, res) => {
  try {
    const tables = await qAll(db, `SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1`);
    res.json({ dbFile: DB_PATH, tables });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/_health', async (_req, res) => {
  try {
    const counts = await qGet(
      db,
      `SELECT
         (SELECT COUNT(*) FROM users)            AS users,
         (SELECT COUNT(*) FROM bookings)         AS bookings,
         (SELECT COUNT(*) FROM maintenance_blocks) AS blocks`
    );
    res.json({ dbFile: DB_PATH, ...counts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------
// 7) Auth endpoints
// ---------------------------
app.post('/api/register', async (req, res) => {
  try {
    const username = (req.body.username ?? req.body.hogwartsId ?? '').toString().trim();
    const password = (req.body.password ?? '').toString();
    const role     = (req.body.role ?? '').toString().trim();

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, role are required' });
    }

    const exists = await qGet(db, `SELECT 1 FROM users WHERE username = ?`, [username]);
    if (exists) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const r = await qRun(db, `INSERT INTO users (username, password, role) VALUES (?,?,?)`, [username, hash, role]);
    res.status(201).json({ success: true, userId: r.lastID });
  } catch (err) {
    console.error('POST /api/register', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const username = (req.body.username ?? req.body.hogwartsId ?? '').toString().trim();
    const password = (req.body.password ?? '').toString();

    const result = await authenticate(username, password);
    if (!result.ok) return res.status(result.code).json({ error: result.error });

    res.json({
      success: true,
      username: result.username,
      role: result.role,
      isAdmin: result.isAdmin,
      redirect: result.redirect
    });
  } catch (e) {
    console.error('[LOGIN] error:', e);
    res.status(500).json({ error: 'Auth error' });
  }
});

// Optional: form-post version
app.post('/login', async (req, res) => {
  try {
    const username = (req.body.username ?? req.body.hogwartsId ?? '').toString().trim();
    const password = (req.body.password ?? '').toString();
    const result = await authenticate(username, password);
    if (!result.ok) return res.status(result.code).send(result.error);
    res.redirect(result.redirect);
  } catch (e) {
    console.error('[LOGIN(form)] error:', e);
    res.status(500).send('Auth error');
  }
});

// Change Password (username canonical; hogwartsId accepted)
app.post('/api/change-password', async (req, res) => {
  try {
    const username        = String(req.body.hogwartsId || req.body.username || '').trim();
    const currentPassword = String(req.body.currentPassword || '');
    const newPassword     = String(req.body.newPassword || '');

    if (!username || !currentPassword || !newPassword)
      return res.status(400).json({ error: 'Missing fields' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await qGet(db, 'SELECT rowid AS id, * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const storedHash = user.password ?? user.password_hash ?? null;
    if (!storedHash) return res.status(500).json({ error: 'Server config error: missing password column' });

    const ok = await bcrypt.compare(currentPassword, storedHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // try updating `password`; fallback to `password_hash` if needed
    try {
      await qRun(db, 'UPDATE users SET password = ? WHERE username = ?', [hash, username]);
    } catch (e1) {
      if ((e1.message || '').includes('no such column: password')) {
        await qRun(db, 'UPDATE users SET password_hash = ? WHERE username = ?', [hash, username]);
      } else {
        throw e1;
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[change-password] error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------
// 8) Availability & Bookings
// ---------------------------
const MAX_DAILY_SESSIONS = 3;

// Availability list (by facility/date)
app.get('/api/availability', async (req, res) => {
  const { facility, date } = req.query;
  if (!facility || !date) return res.status(400).json({ error: 'facility and date required' });
  try {
    const rows = await qAll(db, `SELECT timeSlot FROM bookings WHERE facility = ? AND date = ?`, [facility, date]);
    res.json({ booked: rows.map(r => r.timeSlot) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create single booking
app.post('/api/book', async (req, res) => {
  const { facility, date, timeSlot } = req.body || {};
  const username = (req.body.username ?? req.body.hogwartsId ?? '').toString().trim();
  if (!username || !facility || !date || !timeSlot) {
    return res.status(400).json({ error: 'username, facility, date, timeSlot required' });
  }
  try {
    const [s, e] = String(timeSlot).split('-');
    const slotStart = toISO(date, s);
    const slotEnd   = toISO(date, e);

    const used = await qGet(db, `SELECT COUNT(*) AS c FROM bookings WHERE username = ? AND date = ?`, [username, date]);
    if ((used?.c || 0) + 1 > MAX_DAILY_SESSIONS) {
      return res.status(409).json({ error: `Daily limit ${MAX_DAILY_SESSIONS} sessions reached.` });
    }

    // maintenance overlap (blocks store slug)
    const facilitySlug = toSlug(facility);
    const blockHit = await qGet(
  db,
  `SELECT id FROM maintenance_blocks
   WHERE LOWER(facility) = LOWER(?)
     AND start_time < ? AND end_time > ?
     AND deleted_at IS NULL
   LIMIT 1`,
  [facilitySlug, slotEnd, slotStart]
);
    if (blockHit) return res.status(409).json({ error: 'This time is blocked for maintenance.' });

    // duplicate slot
    const dup = await qGet(
      db,
      `SELECT id FROM bookings WHERE facility = ? AND date = ? AND timeSlot = ? LIMIT 1`,
      [facility, date, timeSlot]
    );
    if (dup) return res.status(409).json({ error: 'This slot is already booked.' });

    const r = await qRun(
      db,
      `INSERT INTO bookings (username, facility, date, timeSlot) VALUES (?,?,?,?)`,
      [username, facility, date, timeSlot]
    );
    res.status(201).json({ success: true, bookingId: r.lastID });
  } catch (e) {
    console.error('POST /api/book', e);
    res.status(500).json({ error: e.message });
  }
});

// Create multi (atomic, up to 2)
app.post('/api/book-multi', async (req, res) => {
  const username = (req.body.username ?? req.body.hogwartsId ?? '').toString().trim();
  const { facility, date, timeSlots } = req.body || {};
  if (!username || !facility || !date || !Array.isArray(timeSlots) || timeSlots.length === 0) {
    return res.status(400).json({ error: 'username, facility, date and timeSlots[] required' });
  }
  if (timeSlots.length > 2) {
    return res.status(400).json({ error: 'You can book at most 2 slots at once.' });
  }

  let started = false;
  try {
    const used = await qGet(db, `SELECT COUNT(*) AS c FROM bookings WHERE username = ? AND date = ?`, [username, date]);
    const remaining = Math.max(0, MAX_DAILY_SESSIONS - (used?.c || 0));
    if (timeSlots.length > remaining) {
      return res.status(409).json({ error: `Daily limit: you can add ${remaining} more session(s) today.` });
    }

    await qRun(db, 'BEGIN');
    started = true;

    const facilitySlug = toSlug(facility);
    const ids = [];

    for (const timeSlot of timeSlots) {
      const [s, e] = String(timeSlot).split('-');
      const slotStart = toISO(date, s);
      const slotEnd   = toISO(date, e);

      const blockHit = await qGet(
        db,
        `SELECT id FROM maintenance_blocks
         WHERE LOWER(facility) = LOWER(?)
           AND start_time < ? AND end_time > ?
         LIMIT 1`,
        [facilitySlug, slotEnd, slotStart]
      );
      if (blockHit) { await qRun(db, 'ROLLBACK'); return res.status(409).json({ error: `Blocked: ${timeSlot}` }); }

      const dup = await qGet(
        db,
        `SELECT id FROM bookings WHERE facility = ? AND date = ? AND timeSlot = ? LIMIT 1`,
        [facility, date, timeSlot]
      );
      if (dup) { await qRun(db, 'ROLLBACK'); return res.status(409).json({ error: `Already booked: ${timeSlot}` }); }

      const r = await qRun(
        db,
        `INSERT INTO bookings (username, facility, date, timeSlot) VALUES (?,?,?,?)`,
        [username, facility, date, timeSlot]
      );
      ids.push(r.lastID);
    }

    await qRun(db, 'COMMIT');
    res.status(201).json({ success: true, bookingIds: ids });
  } catch (e) {
    console.error('POST /api/book-multi failed:', e);
    if (started) { try { await qRun(db, 'ROLLBACK'); } catch {} }
    res.status(500).json({ error: 'Failed to create multi booking' });
  }
});

// List bookings (filters + pagination)
app.get('/api/bookings', async (req, res) => {
  try {
    const { facility, date, startDate, endDate } = req.query;
    const limit  = Math.min(Math.max(parseInt(req.query.limit  ?? '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(req.query.offset ?? '0',   10) || 0, 0);

    let facilityDisplay;
    if (facility) {
      const f = String(facility).trim().toLowerCase();
      facilityDisplay = SLUG_TO_DISPLAY[f] || facility;
    }

    const params = [];
    const where = [];
    if (facilityDisplay) { where.push(`LOWER(facility) = LOWER(?)`); params.push(String(facilityDisplay)); }
    if (date) {
      where.push(`date = ?`); params.push(String(date));
    } else if (startDate && endDate) {
      where.push(`date BETWEEN ? AND ?`); params.push(String(startDate), String(endDate));
    }

    const rows = await qAll(
      db,
      `
      SELECT id, username, username AS hogwartsId, facility, date, timeSlot
      FROM bookings
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY date ASC, timeSlot ASC, id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /api/bookings', e);
    res.status(500).json({ error: e.message });
  }
});

// Recent bookings (latest first)
// GET /api/bookings/recent?limit=10
app.get('/api/bookings/recent', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit ?? '10', 10) || 10, 1), 100);

    const rows = await qAll(
      db,
      `
      SELECT
        id,
        username,
        username AS hogwartsId,
        facility,
        date,
        timeSlot
      FROM bookings
      ORDER BY
        date DESC,
        SUBSTR(timeSlot,1,5) DESC,  -- 'HH:MM' start time
        id DESC
      LIMIT ?
      `,
      [limit]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /api/bookings/recent', e);
    res.status(500).json({ error: 'Failed to fetch recent bookings' });
  }
});

// My bookings (by username/hogwartsId, date or range)
app.get('/api/my-bookings', async (req, res) => {
  try {
    const username = (req.query.username ?? req.query.hogwartsId ?? '').toString().trim();
    if (!username) return res.status(400).json({ error: 'username required' });

    const { date, startDate, endDate } = req.query;
    const limit  = Math.min(Math.max(parseInt(req.query.limit  ?? '100', 10) || 100, 1), 200);
    const offset = Math.max(parseInt(req.query.offset ?? '0',   10) || 0, 0);

    const params = [username];
    const where = [`username = ?`];
    if (date) { where.push(`date = ?`); params.push(String(date)); }
    else if (startDate && endDate) { where.push(`date BETWEEN ? AND ?`); params.push(String(startDate), String(endDate)); }

    const rows = await qAll(
      db,
      `
      SELECT id, username, username AS hogwartsId, facility, date, timeSlot
      FROM bookings
      WHERE ${where.join(' AND ')}
      ORDER BY date ASC, timeSlot ASC, id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json(rows);
  } catch (e) {
    console.error('GET /api/my-bookings', e);
    res.status(500).json({ error: e.message });
  }
});

// --- Delete a booking by id (with alias) ---
async function deleteBookingHandler(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const r = await qRun(db, `DELETE FROM bookings WHERE id = ?`, [id]);
    if (r.changes === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json({ ok: true, id });
  } catch (e) {
    console.error('DELETE /api/bookings/:id', e);
    res.status(500).json({ error: 'Database error' });
  }
}

app.delete('/api/bookings/:id', deleteBookingHandler);
app.delete('/api/booking/:id',  deleteBookingHandler); // alias

// ---------------------------
// 8.4) Maintenance Blocks: list
// ---------------------------
// GET /api/blocks
//   include=all   -> return active + unblocked (default: active only)
//   facility      -> slug (badminton, swimming, ...)
//   date          -> YYYY-MM-DD (rows overlapping that day)
app.get('/api/blocks', async (req, res) => {
  try {
    const { include, facility, date } = req.query;

    const clauses = [];
    const params = [];

    if (include !== 'all') clauses.push('deleted_at IS NULL');   // hide unblocked by default
    if (facility) { clauses.push('LOWER(facility) = LOWER(?)'); params.push(String(facility)); }
    if (date) {
      clauses.push('start_time < ? AND end_time > ?');
      params.push(`${date}T23:59:59`, `${date}T00:00:00`);
    }

    const sql = `
      SELECT id, facility, start_time, end_time, reason,
             created_by_name, created_at,
             deleted_at, deleted_reason, deleted_by_name
      FROM maintenance_blocks
      ${clauses.length ? 'WHERE ' + clauses.join(' AND ') : ''}
      ORDER BY start_time ASC, id ASC
    `;

    const rows = await qAll(db, sql, params);
    res.json(rows || []);
  } catch (err) {
    console.error('GET /api/blocks failed:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance blocks' });
  }
});

// ---------------------------
// 8.5) Maintenance Blocks (soft-delete support)
// ---------------------------
app.post('/api/blocks', async (req, res) => {
  try {
    let { facility, start_time, end_time, reason } = req.body || {};
    if (!facility || !start_time || !end_time) {
      return res.status(400).json({ error: 'facility, start_time, end_time are required' });
    }

    const facilitySlug = toSlug(facility);
    const startISO = String(start_time);
    const endISO   = String(end_time);
    if (endISO <= startISO) return res.status(400).json({ error: 'end_time must be after start_time' });

    const displayName = SLUG_TO_DISPLAY[facilitySlug] || facility;
    const blockDate   = startISO.slice(0, 10);

    const dayBookings = await qAll(
      db,
      `SELECT id, timeSlot FROM bookings
       WHERE LOWER(facility) = LOWER(?) AND date = ?`,
      [displayName, blockDate]
    );

    const S = Date.parse(startISO), E = Date.parse(endISO);
    for (const b of dayBookings) {
      const [s,e] = String(b.timeSlot).split('-');
      const bs = Date.parse(`${blockDate}T${s}:00`);
      const be = Date.parse(`${blockDate}T${e}:00`);
      if (S < be && E > bs) {
        return res.status(409).json({ error: `Overlaps existing booking ${s}-${e}. Remove that booking first.` });
      }
    }

    // capture admin name from auth or header
    const adminName =
      (req.user && (req.user.hogwartsId || req.user.name)) ||
      req.headers['x-admin-name'] ||
      null;

    // ignore unblocked rows when checking overlap
    const existingBlock = await qGet(
      db,
      `SELECT id FROM maintenance_blocks
       WHERE LOWER(facility) = LOWER(?)
         AND start_time < ? AND end_time > ?
         AND deleted_at IS NULL
       LIMIT 1`,
      [facilitySlug, endISO, startISO]
    );
    if (existingBlock) return res.status(409).json({ error: 'Overlaps an existing maintenance block.' });

    // save created_by_name and created_at
    const stmt = await qRun(
      db,
      `INSERT INTO maintenance_blocks
         (facility, start_time, end_time, reason, created_by_name, created_at)
       VALUES (?,?,?,?,?, datetime('now','localtime'))`,
      [facilitySlug, startISO, endISO, reason || null, adminName]
    );

    res.status(201).json({ id: stmt.lastID });
  } catch (err) {
    console.error('POST /api/blocks', err);
    res.status(500).json({ error: 'Failed to add block' });
  }
});

// Soft-unblock with reason (fills deleted_* columns)
app.post('/api/blocks/:id/unblock', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const adminName =
      (req.user && (req.user.hogwartsId || req.user.name)) ||
      req.headers['x-admin-name'] ||
      null;

    const r = await qRun(
      db,
      `UPDATE maintenance_blocks
         SET deleted_at      = datetime('now','localtime'),
             deleted_reason  = ?,
             deleted_by_name = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [reason, adminName, id]
    );
    if (r.changes === 0) return res.status(404).json({ error: 'Not found or already unblocked' });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/blocks/:id/unblock', err);
    res.status(500).json({ error: 'Failed to unblock' });
  }
});

// Hard delete (optional admin tool)
app.delete('/api/blocks/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const r = await qRun(db, `DELETE FROM maintenance_blocks WHERE id = ?`, [id]);
    if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/blocks/:id', err);
    res.status(500).json({ error: 'Failed to remove block' });
  }
});

// ---------------------------
// 9) Stats
// ---------------------------
app.get('/api/booking-count', async (_req, res) => {
  try {
    const row = await qGet(db, `SELECT COUNT(*) AS count FROM bookings`);
    res.json({ count: row.count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/booking-stats', async (_req, res) => {
  try {
    const rows = await qAll(db, `SELECT facility, COUNT(*) AS count FROM bookings GROUP BY facility`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------------------------
// Excel export
// ---------------------------

// ────────────────────────────────────────────────────────────
// Admin export: Bookings by month + Blocks (all + by month)
// + Summary + Parameters + formatted sheets
// GET /api/admin/export.xlsx?start=YYYY-MM-DD&end=YYYY-MM-DD&facility=<slug|display>&username=<id>
// ────────────────────────────────────────────────────────────
app.get('/api/admin/export.xlsx', async (req, res) => {
  try {
    const start = String(req.query.start || req.query.startDate || '1970-01-01');
    const end   = String(req.query.end   || req.query.endDate   || '2999-12-31');
    const username = req.query.username ? String(req.query.username).trim() : null;
    const facilityQ = req.query.facility ? String(req.query.facility).trim().toLowerCase() : null;

    // Accept slug or display for facility (bookings store DISPLAY)
    let facilityDisplay = null;
    if (facilityQ) facilityDisplay = SLUG_TO_DISPLAY[facilityQ] || req.query.facility;

    // ---------- Fetch bookings (same filters as table)
    const where = ['date BETWEEN ? AND ?'];
    const params = [start, end];
    if (username)        { where.push('LOWER(username) = LOWER(?)'); params.push(username); }
    if (facilityDisplay) { where.push('LOWER(facility) = LOWER(?)'); params.push(String(facilityDisplay)); }

    const bookings = await qAll(
      db,
      `
      SELECT id, username, facility, date, timeSlot
        FROM bookings
       WHERE ${where.join(' AND ')}
       ORDER BY date ASC, timeSlot ASC, id ASC
      `,
      params
    );

    // ---------- Fetch maintenance blocks (overlap range; include audit fields)
const blocks = await qAll(
  db,
  `
  SELECT
    id,
    facility,
    start_time,
    end_time,
    reason,
    created_by_name,
    created_at,
    deleted_at,
    deleted_reason,
    deleted_by_name
  FROM maintenance_blocks
  WHERE start_time < ? AND end_time > ?
  ORDER BY start_time ASC, id ASC
  `,
  [`${end}T23:59:59`, `${start}T00:00:00`]
);

    // ---------- Helpers
    const ymKey = (iso) => String(iso || '').slice(0, 7); // 'YYYY-MM'
    const monthLabel = (ym) => {
      const [y, m] = ym.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'short', year: 'numeric' }); // e.g., 'Aug 2025'
    };
    const sanitizeSheet = (name) => name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'Sheet';

    const styleSheet = (ws) => {
      // Header formatting
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const header = ws.getRow(1);
      header.font = { bold: true, color: { argb: 'FFDDAA' } };
      header.alignment = { vertical: 'middle', horizontal: 'center' };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1A1F2B' } };

      // Borders for all populated cells
      ws.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top:    { style: 'thin', color: { argb: '333333' } },
            left:   { style: 'thin', color: { argb: '333333' } },
            bottom: { style: 'thin', color: { argb: '333333' } },
            right:  { style: 'thin', color: { argb: '333333' } },
          };
        });
      });

      // Enable AutoFilter on header row
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to:   { row: 1, column: ws.columns.length }
      };
    };

    // Group bookings by month (booking date)
    const bookingsByMonth = new Map();
    for (const r of bookings) {
      const k = ymKey(r.date);
      if (!bookingsByMonth.has(k)) bookingsByMonth.set(k, []);
      bookingsByMonth.get(k).push(r);
    }

    // Group blocks by month (block start)
    const blocksByMonth = new Map();
    for (const b of blocks) {
      const k = ymKey(b.start_time);
      if (!blocksByMonth.has(k)) blocksByMonth.set(k, []);
      blocksByMonth.get(k).push(b);
    }

    // ---------- Build workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Hogwarts Booking';

    const addBookingsSheet = (label, rows) => {
      const ws = wb.addWorksheet(label);
      ws.columns = [
        { header: 'ID',        key: 'id',        width: 8  },
        { header: 'User',      key: 'username',  width: 18 },
        { header: 'Facility',  key: 'facility',  width: 22 },
        { header: 'Date',      key: 'date',      width: 12 },
        { header: 'Time Slot', key: 'timeSlot',  width: 14 },
      ];
      ws.addRows(rows);
      styleSheet(ws);
    };

    const addBlocksSheet = (label, rows) => {
  const ws = wb.addWorksheet(label);
  ws.columns = [
    { header: 'ID',              key: 'id',            width: 8  },
    { header: 'Facility',        key: 'facilityDisp',  width: 22 },
    { header: 'Facility Slug',   key: 'facility',      width: 16 },
    { header: 'Date',            key: 'date',          width: 12 },
    { header: 'Start',           key: 'start',         width: 8  }, // HH:MM
    { header: 'End',             key: 'end',           width: 8  }, // HH:MM
    { header: 'Duration (h)',    key: 'hours',         width: 14 },
    { header: 'Block Reason',    key: 'block_reason',  width: 36 },
    { header: 'Blocked By',      key: 'blocked_by',    width: 18 },
    { header: 'Blocked At',      key: 'blocked_at',    width: 20 },
    { header: 'Status',          key: 'status',        width: 12 }, // active | unblocked
    { header: 'Unblock Reason',  key: 'unblock_reason',width: 36 },
    { header: 'Unblocked By',    key: 'unblocked_by',  width: 18 },
    { header: 'Unblocked At',    key: 'unblocked_at',  width: 20 },
  ];

  const hhmm = (iso) => String(iso || '').slice(11, 16);
  const ymd  = (iso) => String(iso || '').slice(0, 10);

  const shaped = rows.map(b => {
    const disp = SLUG_TO_DISPLAY[(b.facility || '').toLowerCase()] || b.facility;
    const ms   = Math.max(0, Date.parse(b.end_time) - Date.parse(b.start_time));
    const hrs  = +(ms / 36e5).toFixed(2);
    const status = b.deleted_at ? 'unblocked' : 'active';

    return {
      id: b.id,
      facilityDisp: disp,
      facility: b.facility,
      date:  ymd(b.start_time),
      start: hhmm(b.start_time),
      end:   hhmm(b.end_time),
      hours: hrs,

      block_reason:  b.reason || '',
      blocked_by:    b.created_by_name || '',
      blocked_at:    b.created_at || '',

      status,

      unblock_reason: b.deleted_reason || '',
      unblocked_by:   b.deleted_by_name || '',
      unblocked_at:   b.deleted_at || ''
    };
  });

  ws.addRows(shaped);
  styleSheet(ws);

  // numeric format for hours
  const colIdx = ws.columns.findIndex(c => c.key === 'hours') + 1;
  if (colIdx > 0) ws.getColumn(colIdx).numFmt = '0.00';
};

    const addSummarySheet = () => {
      const ws = wb.addWorksheet('Summary');
      ws.columns = [
        { header: 'Month',    key: 'month',   width: 14 },
        { header: 'Facility', key: 'facility', width: 22 },
        { header: 'Bookings', key: 'count',    width: 12 },
      ];

      const agg = {};
      for (const r of bookings) {
        const k = `${r.date.slice(0,7)}|${r.facility}`;
        agg[k] = (agg[k] || 0) + 1;
      }
      const rows = Object.entries(agg).map(([k, c]) => {
        const [ym, facility] = k.split('|');
        const label = monthLabel(ym);
        return { month: label, facility, count: c };
      }).sort((a,b) => a.month.localeCompare(b.month) || a.facility.localeCompare(b.facility));

      ws.addRows(rows);
      styleSheet(ws);
    };

    const addParametersSheet = () => {
      const ws = wb.addWorksheet('Parameters');
      ws.columns = [
        { header: 'Parameter', key: 'k', width: 24 },
        { header: 'Value',     key: 'v', width: 48 },
      ];

      const facilityShown = facilityDisplay
        ? `${facilityDisplay} (query: ${req.query.facility || ''})`
        : '(all)';

      const now = new Date();
      const genAt = now.toISOString().replace('T', ' ').slice(0,19);

      ws.addRows([
        { k: 'Generated At',   v: genAt },
        { k: 'Date Start',     v: start },
        { k: 'Date End',       v: end },
        { k: 'Username Filter',v: username || '(all)' },
        { k: 'Facility Filter',v: facilityShown },
        { k: 'Bookings Rows',  v: String(bookings.length) },
        { k: 'Blocks Rows',    v: String(blocks.length) },
      ]);

      styleSheet(ws);
    };

    // Build sheets
    if (bookings.length === 0 && blocks.length === 0) {
      wb.addWorksheet('No Data');
    } else {
      // Bookings per month
      if (bookings.length > 0) {
        const keys = Array.from(bookingsByMonth.keys()).sort();
        for (const ym of keys) {
          addBookingsSheet(sanitizeSheet(monthLabel(ym)), bookingsByMonth.get(ym));
        }
      }

      // Blocks sheets
      if (blocks.length > 0) {
        addBlocksSheet('Maintenance Blocks', blocks);

        const bKeys = Array.from(blocksByMonth.keys()).sort();
        for (const ym of bKeys) {
          addBlocksSheet(sanitizeSheet('Blocks ' + monthLabel(ym)), blocksByMonth.get(ym));
        }
      }

      // Summary (only meaningful if there are bookings)
      if (bookings.length > 0) addSummarySheet();

      // Parameters sheet
      addParametersSheet();
    }

    const name = `hogwarts-export-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('GET /api/admin/export.xlsx error:', err);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});


// ---------------------------
// 10) Health-check + Start
// ---------------------------
app.get('/', (_req, res) => res.send('✅ API up (single-DB, username-only)'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));

