// server/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
try {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
} catch (_) {
}


// Express app
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Paths & config
const PORT = Number(process.env.PORT) || 3000;


function resolveDbFile() {
  const candidates = [
    process.env.DB_PATH && path.normalize(process.env.DB_PATH),           
    path.join(__dirname, 'db', 'hogwarts_final_version.db'),              
    path.join(__dirname, 'db', 'bookings.db'),                            
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  console.error(
    '❌ No DB file found.\nTried:\n' +
    candidates.map(p => '  - ' + p).join('\n') +
    '\n\n➡ Put your DB in server/db/ as hogwarts_final_version.db or set DB_PATH in server/.env'
  );
  process.exit(1);
}

const DB_FILE = resolveDbFile();
console.log('🔌 Using DB file:', DB_FILE);

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

// Open DB
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) return console.error('DB error:', err.message);
  console.log(`✅ SQLite connected -> ${DB_FILE}`);
});

// Pragmas + indexes + view (match your schema; NOTE: date column is literally "TEXT")
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username);

  -- 🔁 unique per facility + date("TEXT") + time range
  CREATE UNIQUE INDEX IF NOT EXISTS ux_fb_unique
    ON facility_bookings(facility_id, "TEXT", start_time, end_time);

  -- Recreate view to expose "TEXT" as date
  DROP VIEW IF EXISTS bookings_view;
  CREATE VIEW IF NOT EXISTS bookings_view AS
  SELECT 
    fb.booking_id AS id,
    u.username    AS hogwartsId,
    f.name        AS facility,
    fb."TEXT"     AS date,  -- 👈 rename for consumers
    fb.start_time || '-' || fb.end_time AS timeSlot,
    'CONFIRMED'   AS status
  FROM facility_bookings fb
  JOIN users u      ON u.user_id = fb.booked_by
  JOIN facilities f ON f.facility_id = fb.facility_id;
`, (e) => {
  if (e) console.error('Init SQL error:', e.message);
  else   console.log('🧩 Schema hooks applied (FK, indexes, view)');
});

// -----------------------------
// Serve your website (client/)
// -----------------------------
const clientDir = path.resolve(__dirname, '..', 'client');
console.log('Serving client from:', clientDir);

app.use(express.static(clientDir));

app.get('/', (_req, res) => res.sendFile(path.join(clientDir, 'home', 'index.html')));
app.get('/login', (_req, res) => res.sendFile(path.join(clientDir, 'login', 'index.html')));
app.get('/register', (_req, res) => res.sendFile(path.join(clientDir, 'register', 'index.html')));
app.get('/booking', (_req, res) => res.sendFile(path.join(clientDir, 'booking', 'index.html')));
app.get('/booking_display', (_req, res) => res.sendFile(path.join(clientDir, 'booking_display', 'index.html')));
//app.get('/teacher', (_req, res) => res.sendFile(path.join(clientDir, 'teacher', 'index.html')));
// Redirect any teacher URL to booking
app.get(['/teacher', '/teacher/index.html', '/teacher/*'], (_req, res) => {
  res.redirect(302, '/booking/index.html');
});
app.get('/health', (_req, res) => res.json({ ok: true }));

function getUserByHogwartsId(hogwartsId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT user_id, username AS hogwartsId, password, role, initial_password
         FROM users WHERE username = ?`,
      [hogwartsId],
      (err, row) => (err ? reject(err) : resolve(row || null))
    );
  });
}
function getUserIdByHogwartsId(hogwartsId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT user_id FROM users WHERE username=?`, [hogwartsId],
      (err, row) => (err ? reject(err) : resolve(row ? row.user_id : null)));
  });
}

function splitTimeSlot(slot) {
  const norm = String(slot || '').replace(/\u2013|\u2014/g, '-').trim(); // en/em dash → hyphen
  const m = norm.match(/^\s*(\d{2}:\d{2})(?::\d{2})?\s*-\s*(\d{2}:\d{2})(?::\d{2})?\s*$/);
  if (!m) return [null, null];
  let [, start, end] = m;
  if (start.length === 5) start += ':00';
  if (end.length   === 5) end   += ':00';
  return [start, end]; // e.g. "08:00:00", "09:00:00"
}

function getFacilityIdByNameOrId(facility) {
  return new Promise((resolve, reject) => {
    if (facility == null) return resolve(null);
    const raw = String(facility).trim();

    if (/^\d+$/.test(raw)) return resolve(Number(raw));

    const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
    const NAME_MAP = {
      badminton:   'Badminton Court',
      swimming:    'Swimming Pool',
      gym:         'Gym',
      classrooma:  'Classroom 1',
      classroomb:  'Classroom 2',
      classroomc:  'Classroom 3',
      classroomd:  'Classroom 4',
      classroom1:  'Classroom 1',
      classroom2:  'Classroom 2',
      classroom3:  'Classroom 3',
      classroom4:  'Classroom 4'
    };
    const mapped = NAME_MAP[key] || raw;

    db.get(
      'SELECT facility_id FROM facilities WHERE lower(name) = lower(?)',
      [mapped],
      (err, row) => (err ? reject(err) : resolve(row ? row.facility_id : null))
    );
  });
}

// -----------------------------
// Admin bootstrap (username = 'admin')
// -----------------------------
db.get(`SELECT 1 FROM users WHERE username = 'admin'`, async (err, row) => {
  if (err) return console.error('Admin check error:', err.message);
  if (!row) {
    try {
      const hash = await bcrypt.hash('admin123', 10);
      db.run(
        `INSERT INTO users (username, password, role, initial_password)
         VALUES (?, ?, 'admin', NULL)`,
        ['admin', hash],
        (e) => e ? console.error('Admin bootstrap failed:', e.message)
                 : console.log('👑 Bootstrapped admin/admin123')
      );
    } catch (e) {
      console.error('Admin hash error:', e.message);
    }
  }
});

// -----------------------------
// Auth
// -----------------------------
app.post('/api/register', async (req, res) => {
  const { hogwartsId, password, role } = req.body || {};
  if (!hogwartsId || !password || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }
  try {
    db.get(`SELECT 1 FROM users WHERE username=?`, [hogwartsId], async (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return res.status(409).json({ error: 'hogwartsId already exists' });

      const hash = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (username, password, role, initial_password)
         VALUES (?, ?, ?, NULL)`,
        [hogwartsId, hash, role],
        function (e) {
          if (e) return res.status(500).json({ error: e.message });
          res.status(201).json({ ok: true, userId: this.lastID });
        }
      );
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login (bcrypt + one-time initial_password fallback->upgrade)
app.post('/api/login', (req, res) => {
  const { hogwartsId, password } = req.body || {};
  if (!hogwartsId || !password) {
    return res.status(400).json({ ok: false, error: 'Hogwarts ID and password required' });
  }
  getUserByHogwartsId(hogwartsId)
    .then(async (user) => {
      if (!user) return res.status(401).json({ ok: false, error: 'Invalid ID or password' });

      const isBcrypt = user.password && user.password.startsWith('$2');
      let match = false;

      if (isBcrypt) {
        match = await bcrypt.compare(password, user.password);
      }
      if (!match && user.initial_password) {
        if (password === user.initial_password) {
          const hash = await bcrypt.hash(password, 10);
          await new Promise((resolve, reject) => {
            db.run('UPDATE users SET password=?, initial_password=NULL WHERE user_id=?',
              [hash, user.user_id],
              (e) => (e ? reject(e) : resolve())
            );
          });
          match = true;
        }
      }

      if (!match) return res.status(401).json({ ok: false, error: 'Invalid ID or password' });

      return res.json({
        ok: true,
        role: user.role,
        hogwartsId: user.hogwartsId,
        id: user.user_id,
        user: { id: user.user_id, hogwartsId: user.hogwartsId, role: user.role }
      });
    })
    .catch((err) => res.status(500).json({ ok: false, error: err.message }));
});

// -----------------------------
// Availability & Bookings  (uses facility_bookings + facilities)
// -----------------------------

// GET unavailable timeSlots for a facility/date
app.get('/api/availability', async (req, res) => {
  const { facility, date } = req.query || {};
  if (!facility || !date) {
    return res.status(400).json({ error: 'facility and date required' });
  }
  try {
    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ error: 'Facility not found' });

    db.all(
      `SELECT start_time, end_time
         FROM facility_bookings
        WHERE facility_id = ? AND "TEXT" = ?   -- 👈 date column name
        ORDER BY start_time`,
      [facilityId, date],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const booked = rows.map(r => `${r.start_time}-${r.end_time}`);
        res.json({ booked });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create booking (unique slot enforced by index)
app.post('/api/book', async (req, res) => {
  const { hogwartsId, facility, date, timeSlot, startTime, endTime } = req.body || {};
  if (!hogwartsId || !facility || !date || (!timeSlot && !(startTime && endTime))) {
    return res.status(400).json({ ok: false, error: 'hogwartsId, facility, date, and time required' });
  }
  try {
    const userId = await getUserIdByHogwartsId(hogwartsId);
    if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ ok: false, error: 'Facility not found' });

    const [s, e] = timeSlot ? splitTimeSlot(timeSlot) : [startTime, endTime];
    if (!s || !e) return res.status(400).json({ ok: false, error: 'Invalid time slot' });

    db.run(
      `INSERT INTO facility_bookings(facility_id, "TEXT", start_time, end_time, booked_by)
       VALUES(?,?,?,?,?)`,
      [facilityId, date, s, e, userId],
      function (err) {
        if (err) {
          const msg = String(err.message || '');
          if (msg.includes('constraint') || msg.includes('ux_fb_unique')) {
            return res.status(409).json({ ok: false, error: 'Time slot already booked' });
          }
          return res.status(500).json({ ok: false, error: err.message });
        }
        res.status(201).json({ ok: true, bookingId: this.lastID });
      }
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Staff/Admin: counts (total)
app.get('/api/booking-count', (_req, res) => {
  db.get(`SELECT COUNT(*) AS count FROM facility_bookings`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true, count: row.count });
  });
});

// Staff/Admin: stats by facility name
app.get('/api/booking-stats', (_req, res) => {
  db.all(
    `SELECT f.name AS facility, COUNT(*) AS count
       FROM facility_bookings fb
       JOIN facilities f ON f.facility_id = fb.facility_id
      GROUP BY fb.facility_id
      ORDER BY count DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, rows });
    }
  );
});

// Staff/Admin: list bookings (via view)
app.get('/api/bookings', (_req, res) => {
  db.all(
    `SELECT id, hogwartsId, facility, date, timeSlot
       FROM bookings_view
      ORDER BY date, timeSlot`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ok: true, items: rows });
    }
  );
});

// Staff/Admin: edit booking
app.put('/api/book/:id', async (req, res) => {
  const { facility, date, timeSlot, startTime, endTime } = req.body || {};
  if (!facility || !date || (!timeSlot && !(startTime && endTime))) {
    return res.status(400).json({ error: 'facility, date and time required' });
  }
  try {
    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ error: 'Facility not found' });

    const [s, e] = timeSlot ? splitTimeSlot(timeSlot) : [startTime, endTime];
    if (!s || !e) return res.status(400).json({ error: 'Invalid time slot' });

    db.run(
      `UPDATE facility_bookings
          SET facility_id=?, "TEXT"=?, start_time=?, end_time=?
        WHERE booking_id=?`,
      [facilityId, date, s, e, req.params.id],
      function (err) {
        if (err) {
          const msg = String(err.message || '');
          if (msg.includes('constraint') || msg.includes('ux_fb_unique')) {
            return res.status(409).json({ error: 'New time slot already booked' });
          }
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ ok: true });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Staff/Admin: delete booking
app.delete('/api/book/:id', (req, res) => {
  db.run(
    `DELETE FROM facility_bookings WHERE booking_id = ?`,
    [req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    }
  );
});

// User: own bookings by hogwartsId
app.get('/api/my-bookings', async (req, res) => {
  const { hogwartsId } = req.query || {};
  if (!hogwartsId) return res.status(400).json({ error: 'hogwartsId required' });
  try {
    const userId = await getUserIdByHogwartsId(hogwartsId);
    if (!userId) return res.json({ ok: true, items: [] });

    db.all(
      `SELECT fb.booking_id AS id,
              f.name        AS facility,
              fb."TEXT"     AS date,
              fb.start_time || '-' || fb.end_time AS timeSlot
         FROM facility_bookings fb
         JOIN facilities f ON f.facility_id = fb.facility_id
        WHERE fb.booked_by = ?
        ORDER BY fb."TEXT", fb.start_time`,
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, items: rows });
      }
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}/`);
});
