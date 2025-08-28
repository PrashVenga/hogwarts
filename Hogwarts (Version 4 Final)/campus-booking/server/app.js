const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

try { require('dotenv').config({ path: path.join(__dirname, '.env') }); } catch {}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use((req, _res, next) => { console.log('➡️', req.method, req.url, 'x-user:', req.headers['x-user']); next(); });

const PORT = Number(process.env.PORT) || 3000;

/* ---------------- DB path ---------------- */
function resolveDbFile() {
  const candidates = [
    path.join(__dirname, 'db', 'hogwarts_integrated.db'),
    process.env.DB_PATH && path.normalize(process.env.DB_PATH),
    path.join(__dirname, 'db', 'hogwarts_final_version.db'),
    path.join(__dirname, 'db', 'bookings.db'),
    path.join(__dirname, 'db', 'hogwarts_v5.db'),
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  console.error('❌ No DB file found.\nTried:\n' + candidates.map(p=>'  - '+p).join('\n'));
  process.exit(1);
}
const DB_FILE = resolveDbFile();
console.log('✅ DB ->', DB_FILE);
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });

const db = new sqlite3.Database(DB_FILE, (err) => { if (err) console.error('DB error:', err.message); });

/* ---------------- DB helpers ---------------- */
const dbAll = (sql, args = []) => new Promise((res, rej) =>
  db.all(sql, args, (e, rows) => e ? (console.error('\n[dbAll ERROR]', e.message, '\nSQL:', sql, '\nARGS:', args, '\n'), rej(e)) : res(rows || []))
);
const dbGet = (sql, args = []) => new Promise((res, rej) =>
  db.get(sql, args, (e, row) => e ? (console.error('\n[dbGet ERROR]', e.message, '\nSQL:', sql, '\nARGS:', args, '\n'), rej(e)) : res(row || null))
);
const dbRun = (sql, args = []) => new Promise((res, rej) =>
  db.run(sql, args, function (e) { if (e) { console.error('\n[dbRun ERROR]', e.message, '\nSQL:', sql, '\nARGS:', args, '\n'); return rej(e); } res(this); })
);


const Q = (name) => (String(name).startsWith('"') ? name : `"${name}"`);


let USERNAME_COL = 'username';
let USER_ID_COL  = 'user_id';
let HAS_INITIAL_PW = false;

async function detectUsersColumns() {
  const cols = await dbAll(`PRAGMA table_info(users)`);
  if (!cols.length) throw new Error('No users table found');
  const names = new Set(cols.map(c => (c.name || '').toLowerCase()));
  if (names.has('username')) USERNAME_COL = 'username';
  else if (names.has('hogwartsid')) USERNAME_COL = 'hogwartsId';
  else throw new Error('users missing username/hogwartsId');

  const pk = cols.find(c => Number(c.pk) === 1);
  if (pk) USER_ID_COL = pk.name;
  else if (names.has('user_id')) USER_ID_COL = 'user_id';
  else if (names.has('id')) USER_ID_COL = 'id';
  else throw new Error('users missing primary key');

  HAS_INITIAL_PW = names.has('initial_password');
  console.log('👤 users:', { USERNAME_COL, USER_ID_COL, HAS_INITIAL_PW });
}
const selectUserCols = () => `${Q(USER_ID_COL)} AS user_id, ${Q(USERNAME_COL)} AS hogwartsId, password, role${HAS_INITIAL_PW ? ', initial_password' : ''}`;

let FAC_ID_COL   = 'facility_id';
let FAC_NAME_COL = 'name';
async function detectFacilitiesColumnsAndSeed() {
  let cols = await dbAll(`PRAGMA table_info(facilities)`);
  if (!cols.length) {
    await dbRun(`CREATE TABLE IF NOT EXISTS facilities (facility_id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);`);
    cols = await dbAll(`PRAGMA table_info(facilities)`);
  }
  const names = new Set(cols.map(c => (c.name || '').toLowerCase()));
  const pk = cols.find(c => Number(c.pk) === 1);
  FAC_ID_COL = pk?.name || (names.has('facility_id') ? 'facility_id' : 'id');
  FAC_NAME_COL = names.has('name') ? 'name' : (names.has('facility_name') ? 'facility_name' : (cols.find(c=>/name/i.test(c.name))?.name || 'name'));

  const REQUIRED = [
    [1, 'Classroom 1'], [2, 'Classroom 2'], [3, 'Classroom 3'], [4, 'Classroom 4'],
    [5, 'Badminton Court'], [6, 'Swimming Pool'], [7, 'Gym'],
  ];
  for (const [id, name] of REQUIRED) {
    await dbRun(`INSERT OR IGNORE INTO facilities (${Q(FAC_ID_COL)}, ${Q(FAC_NAME_COL)}) VALUES (?, ?)`, [id, name]);
  }
  const facs = await dbAll(`SELECT ${Q(FAC_ID_COL)} AS id, ${Q(FAC_NAME_COL)} AS name FROM facilities ORDER BY id`);
  console.log('🏷 facilities:', { FAC_ID_COL, FAC_NAME_COL, count: facs.length });
}

let FB_TABLE     = 'facility_bookings';
let FB_ID_COL    = 'booking_id';
let FB_FAC_COL   = 'facility_id';
let FB_DATE_COL  = 'TEXT';
let FB_START_COL = 'start_time';
let FB_END_COL   = 'end_time';
let FB_USER_COL  = 'booked_by';

function findCol(cols, candidates) {
  const map = new Map(cols.map(c => [c.name.toLowerCase(), c.name]));
  for (const c of candidates) { const hit = map.get(c.toLowerCase()); if (hit) return hit; }
  return null;
}
async function detectBookingsColumnsAndEnsure() {
  let cols = await dbAll(`PRAGMA table_info(${FB_TABLE})`);
  if (!cols.length) {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS ${FB_TABLE} (
        booking_id  INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id INTEGER NOT NULL,
        "TEXT"      TEXT    NOT NULL,
        start_time  TEXT    NOT NULL,
        end_time    TEXT    NOT NULL,
        booked_by   INTEGER NOT NULL,
        UNIQUE (facility_id, "TEXT", start_time, end_time),
        FOREIGN KEY (booked_by) REFERENCES users(${Q(USER_ID_COL)})
      );
    `);
    cols = await dbAll(`PRAGMA table_info(${FB_TABLE})`);
  }
  FB_ID_COL    = findCol(cols, ['booking_id','id','bookingid']) || 'booking_id';
  FB_FAC_COL   = findCol(cols, ['facility_id','facilityid','facility','facilityId']) || 'facility_id';
  FB_DATE_COL  = findCol(cols, ['TEXT','date','date_ymd','dateymd']) || 'TEXT';
  FB_START_COL = findCol(cols, ['start_time','start','starttime','startTime']) || 'start_time';
  FB_END_COL   = findCol(cols, ['end_time','end','endtime','endTime']) || 'end_time';
  FB_USER_COL  = findCol(cols, ['booked_by','bookedby','user_id','userid','bookedBy']) || 'booked_by';

  console.log('📚 facility_bookings:', { FB_ID_COL, FB_FAC_COL, FB_DATE_COL, FB_START_COL, FB_END_COL, FB_USER_COL });
}


function isPastDate(yyyy_mm_dd) {
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(yyyy_mm_dd + 'T00:00:00');
  return d < today;
}
function dayBounds(dateStr){ return [dateStr + 'T00:00:00', dateStr + 'T23:59:59']; }
const toMs = (x) => new Date(String(x).replace(' ', 'T')).getTime();
function overlapISO(aStart, aEnd, bStart, bEnd) { return toMs(aStart) < toMs(bEnd) && toMs(bStart) < toMs(aEnd); }
const ensureSecs = (hhmm) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm);
const stripSecs = (hms) => (typeof hms === 'string' && hms.length === 8 ? hms.slice(0,5) : hms);


function toYMD(dLike) {
  if (!dLike) return null;
  const s = String(dLike).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                     
  let m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);              
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);                      
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a > 12 && b <= 12) return `${m[3]}-${m[2]}-${m[1]}`;      
    if (b > 12 && a <= 12) return `${m[3]}-${m[1]}-${m[2]}`;       
    return `${m[3]}-${m[2]}-${m[1]}`;                              
  }
  const dt = new Date(s);
  if (!isNaN(dt)) return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  return null;
}

/* Normalise timestamps */
function normISO(ts) {
  if (!ts) return ts;
  let s = String(ts).trim().replace(' ', 'T').replace(/Z$/i, '');
  let m = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/); // DMY
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/);            // YMD
  if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]||'00'}:${m[5]||'00'}:${m[6]||'00'}`;
  return s;
}

function splitTimeSlot(slot) {
  const norm = String(slot || '').replace(/\u2013|\u2014/g, '-').trim();
  const m = norm.match(/^\s*(\d{2}:\d{2})(?::\d{2})?\s*-\s*(\d{2}:\d{2})(?::\d{2})?\s*$/);
  if (!m) return [null, null];
  let [, start, end] = m;
  if (start.length === 5) start += ':00';
  if (end.length   === 5) end   += ':00';
  return [start, end];
}
function isPastTodaySlot(dateStr, startHHMMSS) {
  if (!dateStr || !startHHMMSS) return false;
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const isToday = (y === now.getFullYear() && m === (now.getMonth()+1) && d === now.getDate());
  if (!isToday) return false;
  const [hh, mm, ssRaw] = startHHMMSS.split(':'); const ss = ssRaw ?? '00';
  const start = new Date(y, m-1, d, Number(hh), Number(mm), Number(ss));
  return start <= now;
}

const ID_TO_NAME = { 1:'Classroom 1',2:'Classroom 2',3:'Classroom 3',4:'Classroom 4',5:'Badminton Court',6:'Swimming Pool',7:'Gym' };
async function getFacilityIdByNameOrId(facility) {
  return new Promise((resolve, reject) => {
    if (facility == null) return resolve(null);
    const raw = String(facility).trim();

    if (/^\d+$/.test(raw)) {
      const idNum = Number(raw);
      db.get(`SELECT ${Q(FAC_ID_COL)} AS id FROM facilities WHERE ${Q(FAC_ID_COL)} = ?`, [idNum], (err, row) => {
        if (err) return reject(err);
        if (row && row.id != null) return resolve(row.id);
        const mappedName = ID_TO_NAME[idNum];
        if (!mappedName) return resolve(null);
        db.get(`SELECT ${Q(FAC_ID_COL)} AS id FROM facilities WHERE LOWER(${Q(FAC_NAME_COL)}) = LOWER(?)`, [mappedName],
          (e2, r2) => e2 ? reject(e2) : resolve(r2 ? r2.id : null));
      });
      return;
    }

    const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
    const NAME_MAP = {
      badminton:'Badminton Court', swimming:'Swimming Pool', gym:'Gym',
      classrooma:'Classroom 1', classroomb:'Classroom 2', classroomc:'Classroom 3', classroomd:'Classroom 4',
      classroom1:'Classroom 1', classroom2:'Classroom 2', classroom3:'Classroom 3', classroom4:'Classroom 4'
    };
    const mapped = NAME_MAP[key] || raw;
    db.get(`SELECT ${Q(FAC_ID_COL)} AS id FROM facilities WHERE LOWER(${Q(FAC_NAME_COL)}) = LOWER(?)`, [mapped],
      (err,row)=> err?reject(err):resolve(row?row.id:null));
  });
}

/* ---------------- init ---------------- */
async function init() {
  await detectUsersColumns();
  await dbRun(`PRAGMA foreign_keys = ON;`);
  await dbRun(`PRAGMA journal_mode = WAL;`);
  await dbRun(`CREATE UNIQUE INDEX IF NOT EXISTS ux_users_uname ON users(${USERNAME_COL});`);

  await detectFacilitiesColumnsAndSeed();
  await detectBookingsColumnsAndEnsure();

  // maintenance table shape (has facility_id)
  await (async function ensureMaintenanceBlocksSchema(){
    const tbl = await dbGet(`SELECT name FROM sqlite_master WHERE type='table' AND name='maintenance_blocks'`);
    if (!tbl) {
      await dbRun(`
        CREATE TABLE IF NOT EXISTS maintenance_blocks (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          facility_id INTEGER NOT NULL,
          start_time  TEXT    NOT NULL,
          end_time    TEXT    NOT NULL,
          reason      TEXT,
          FOREIGN KEY (facility_id) REFERENCES facilities(${Q(FAC_ID_COL)})
        );
      `);
      console.log('🆕 Created maintenance_blocks.');
    }
  })();

  await dbRun(`DROP VIEW IF EXISTS bookings_view;`);
  await dbRun(`
    CREATE VIEW IF NOT EXISTS bookings_view AS
    SELECT 
      fb.${Q(FB_ID_COL)} AS id,
      u.${USERNAME_COL} AS hogwartsId,
      f.${FAC_NAME_COL} AS facility,
      fb.${Q(FB_DATE_COL)}     AS date,
      fb.${Q(FB_START_COL)} || '-' || fb.${Q(FB_END_COL)} AS timeSlot,
      'CONFIRMED'   AS status
    FROM ${FB_TABLE} fb
    JOIN users u      ON u.${Q(USER_ID_COL)} = fb.${Q(FB_USER_COL)}
    JOIN facilities f ON f.${Q(FAC_ID_COL)} = fb.${Q(FB_FAC_COL)};
  `);

  // admin bootstrap
  const adminExists = await dbGet(`SELECT 1 AS ok FROM users WHERE ${Q(USERNAME_COL)} = 'admin'`);
  if (!adminExists) {
    try {
      const hash = await bcrypt.hash('admin123', 10);
      const sql = HAS_INITIAL_PW
        ? `INSERT INTO users (${Q(USERNAME_COL)}, password, role, initial_password) VALUES (?, ?, 'admin', NULL)`
        : `INSERT INTO users (${Q(USERNAME_COL)}, password, role) VALUES (?, ?, 'admin')`;
      await dbRun(sql, ['admin', hash]);
      console.log('👑 Bootstrapped admin/admin123');
    } catch (e) { console.error('Admin bootstrap failed:', e.message); }
  }
}


const clientDir = path.resolve(__dirname, '..', 'client');
console.log('Serving client from:', clientDir);
app.use(express.static(clientDir));

app.get('/',                 (_req,res)=> res.sendFile(path.join(clientDir, 'home', 'index.html')));
app.get('/login',            (_req,res)=> res.sendFile(path.join(clientDir, 'login', 'index.html')));
app.get('/login/',           (_req,res)=> res.sendFile(path.join(clientDir, 'login', 'index.html')));
app.get('/register',         (_req,res)=> res.sendFile(path.join(clientDir, 'register', 'index.html')));
app.get('/register/',        (_req,res)=> res.sendFile(path.join(clientDir, 'register', 'index.html')));
app.get('/booking',          (_req,res)=> res.sendFile(path.join(clientDir, 'booking', 'index.html')));
app.get('/booking/',         (_req,res)=> res.sendFile(path.join(clientDir, 'booking', 'index.html')));
app.get('/booking_display',  (_req,res)=> res.sendFile(path.join(clientDir, 'booking_display', 'index.html')));
app.get('/booking_display/', (_req,res)=> res.sendFile(path.join(clientDir, 'booking_display', 'index.html')));
app.get(/^\/teacher(?:\/.*)?$/i, (_req,res)=> res.redirect(302, '/booking/index.html'));
app.get(/^\/admin(?:\/.*)?$/i,   (_req,res)=> res.sendFile(path.join(clientDir, 'admin', 'index.html')));
app.get('/health', (_req,res)=> res.json({ ok:true }));

/* ---------------- utilities ---------------- */
const isTimeOnly = (v) => typeof v === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(v);
const isDateOnly = (v) =>
  typeof v === 'string' && (
    /^\d{4}-\d{2}-\d{2}$/.test(v) ||              
    /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(v)           
  );


function buildBlockTimes(body) {
  let { date, start, end, start_time, end_time } = body || {};

  
  let ymd = toYMD(date);

  
  if (!ymd) {
    if (isDateOnly(start_time)) ymd = toYMD(start_time);
    if (!ymd && isDateOnly(end_time)) ymd = toYMD(end_time);
  }

  let s = null, e = null;

  if (ymd && (isTimeOnly(start) || isTimeOnly(start_time))) {
    s = `${ymd}T${ensureSecs(isTimeOnly(start) ? start : start_time)}`;
  } else if (start_time && !isDateOnly(start_time)) {
    s = normISO(start_time);
  }

  if (ymd && (isTimeOnly(end) || isTimeOnly(end_time))) {
    e = `${ymd}T${ensureSecs(isTimeOnly(end) ? end : end_time)}`;
  } else if (end_time && !isDateOnly(end_time)) {
    e = normISO(end_time);
  }

  s = s && normISO(s);
  e = e && normISO(e);
  return { s, e, ymd };
}

app.post('/api/auth/logout', (_req,res)=> res.status(204).end());

async function adminOnly(req, res, next) {
  try {
    const u = (req.headers['x-user'] || '').trim();
    if (!u) return res.status(401).json({ error: 'missing x-user' });
    const row = await dbGet(`SELECT role FROM users WHERE LOWER(${Q(USERNAME_COL)}) = LOWER(?)`, [u]);
    if (!row || String(row.role).toLowerCase() !== 'admin') return res.status(403).json({ error: 'admin only' });
    next();
  } catch (e) { res.status(500).json({ error: e.message }); }
}


app.post('/api/register', async (req, res) => {
  const { hogwartsId, password, role } = req.body || {};
  if (!hogwartsId || !password || !role) return res.status(400).json({ error: 'All fields required' });
  try {
    const exist = await dbGet(`SELECT 1 FROM users WHERE ${Q(USERNAME_COL)}=?`, [hogwartsId]);
    if (exist) return res.status(409).json({ error: 'hogwartsId already exists' });

    const allowed = new Set(['student','teacher']);
    const safeRole = allowed.has(String(role).toLowerCase()) ? String(role).toLowerCase() : 'student';

    const hash = await bcrypt.hash(password, 10);
    const sql = HAS_INITIAL_PW
      ? `INSERT INTO users (${Q(USERNAME_COL)}, password, role, initial_password) VALUES (?, ?, ?, NULL)`
      : `INSERT INTO users (${Q(USERNAME_COL)}, password, role) VALUES (?, ?, ?)`;
    const ret = await dbRun(sql, [hogwartsId, hash, safeRole]);
    res.status(201).json({ ok:true, userId: ret.lastID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  const { hogwartsId, password } = req.body || {};
  if (!hogwartsId || !password) return res.status(400).json({ ok:false, error:'Hogwarts ID and password required' });
  try {
    const user = await dbGet(`SELECT ${selectUserCols()} FROM users WHERE ${Q(USERNAME_COL)} = ?`, [hogwartsId]);
    if (!user) return res.status(401).json({ ok:false, error:'Invalid ID or password' });

    let match = user.password && user.password.startsWith('$2') ? await bcrypt.compare(password, user.password) : false;
    if (!match && HAS_INITIAL_PW && user.initial_password && password === user.initial_password) {
      const hash = await bcrypt.hash(password, 10);
      await dbRun(`UPDATE users SET password=?, initial_password=NULL WHERE ${Q(USER_ID_COL)}=?`, [hash, user.user_id]);
      match = true;
    }
    if (!match) return res.status(401).json({ ok:false, error:'Invalid ID or password' });

    res.json({ ok:true, role:user.role, hogwartsId:user.hogwartsId, id:user.user_id,
               user:{ id:user.user_id, hogwartsId:user.hogwartsId, role:user.role }});
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});


app.get('/api/facilities', async (_req, res) => {
  try {
    const rows = await dbAll(`SELECT ${Q(FAC_ID_COL)} AS facility_id, ${Q(FAC_NAME_COL)} AS name FROM facilities ORDER BY ${Q(FAC_ID_COL)}`);
    res.json({ ok:true, items: rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.get('/api/availability', async (req, res) => {
  const { facility } = req.query || {};
  let { date } = req.query || {};
  if (!facility || !date) return res.status(400).json({ error:'facility and date required' });

 
  const ymd = toYMD(date);
  if (!ymd) return res.status(400).json({ error:'Invalid date' });

  try {
    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ error:'Facility not found' });

    
    const bookedRows = await dbAll(
      `SELECT ${Q(FB_START_COL)} AS start_time, ${Q(FB_END_COL)} AS end_time
         FROM ${FB_TABLE}
        WHERE ${Q(FB_FAC_COL)} = ?
          AND ${Q(FB_DATE_COL)} = ?
        ORDER BY ${Q(FB_START_COL)}`,
      [facilityId, ymd]
    );
    const booked = bookedRows.map(r => `${stripSecs(r.start_time)}-${stripSecs(r.end_time)}`);

  


app.get('/api/admin/breakdown', async (req, res) => {
  const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
  const sql = `
    SELECT f.name AS facility, COUNT(*) AS count
    FROM facility_bookings fb
    JOIN facilities f ON f.facility_id = fb.facility_id
    WHERE date(COALESCE(fb.start_time, fb."TEXT")) >= date('now', ?)
    GROUP BY fb.facility_id
    ORDER BY count DESC, f.name ASC
  `;
  try {
    const rows = await dbAll(sql, [`-${days} day`]);
    res.json({ ok: true, days, items: rows });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
  });


 
    const blocks = await dbAll(`SELECT start_time, end_time FROM maintenance_blocks WHERE facility_id = ?`, [facilityId]);


    const ALL_SLOTS = [
      '08:00-09:00','09:00-10:00','10:00-11:00','11:00-12:00',
      '13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00',
      '17:00-18:00','18:00-19:00','19:00-20:00','20:00-21:00',
      '21:00-22:00'
    ];

    const blockedSet = new Set();
    for (const slot of ALL_SLOTS) {
      const [s, e] = slot.split('-');                 // HH:MM
      const slotStart = `${ymd}T${ensureSecs(s)}`;    // ISO with seconds
      const slotEnd   = `${ymd}T${ensureSecs(e)}`;
      for (const b of blocks) {
        if (overlapISO(slotStart, slotEnd, b.start_time, b.end_time)) {
          blockedSet.add(slot);
          break;
        }
      }
    }

    res.json({ booked, blocked: Array.from(blockedSet) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ---------------- booking ---------------- */
app.post('/api/book', async (req, res) => {
  const { hogwartsId, facility, timeSlot, startTime, endTime } = req.body || {};
  let { date } = req.body || {};
  if (!hogwartsId || !facility || !date || (!timeSlot && !(startTime && endTime)))
    return res.status(400).json({ ok:false, error:'hogwartsId, facility, date, and time required' });

  // ✅ normalise date
  const ymd = toYMD(date);
  if (!ymd) return res.status(400).json({ ok:false, error:'Invalid date' });
  if (isPastDate(ymd)) return res.status(400).json({ ok:false, error:'Cannot book past dates' });

  try {
    const userId = await dbGet(`SELECT ${Q(USER_ID_COL)} AS id FROM users WHERE ${Q(USERNAME_COL)}=?`, [hogwartsId]).then(r => r?.id);
    if (!userId) return res.status(404).json({ ok:false, error:'User not found' });

    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ ok:false, error:'Facility not found' });

    const [s0,e0] = timeSlot ? splitTimeSlot(timeSlot) : [ensureSecs(startTime), ensureSecs(endTime)];
    const s = s0, e = e0;
    if (!s || !e) return res.status(400).json({ ok:false, error:'Invalid time slot' });
    if (isPastTodaySlot(ymd, s)) return res.status(400).json({ ok:false, error:'Cannot book a past time' });

    
    const [d0, d1] = dayBounds(ymd);
    const blocks = await dbAll(
      `SELECT start_time, end_time FROM maintenance_blocks
       WHERE facility_id=? AND NOT(end_time < ? OR start_time > ?)`,
      [facilityId, d0, d1]
    );
    const slotStartISO = `${ymd}T${s}`;
    const slotEndISO   = `${ymd}T${e}`;
    for (const b of blocks) {
      if (overlapISO(slotStartISO, slotEndISO, b.start_time, b.end_time)) {
        return res.status(409).json({ error: 'Slot blocked for maintenance' });
      }
    }

    const ret = await dbRun(
      `INSERT INTO ${FB_TABLE} (${Q(FB_FAC_COL)}, ${Q(FB_DATE_COL)}, ${Q(FB_START_COL)}, ${Q(FB_END_COL)}, ${Q(FB_USER_COL)})
       VALUES(?,?,?,?,?)`,
      [facilityId, ymd, s, e, userId]
    );
    res.status(201).json({ ok:true, bookingId: ret.lastID });
  } catch (e) {
    const msg = String(e.message||'');
    if (msg.includes('constraint') || msg.includes('unique'))
      return res.status(409).json({ ok:false, error:'Time slot already booked' });
    res.status(500).json({ ok:false, error: e.message });
  }
});

app.get('/api/booking-count', async (_req,res)=>{
  try { const r = await dbGet(`SELECT COUNT(*) AS count FROM ${FB_TABLE}`);
        res.json({ ok:true, count:r.count }); }
  catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/booking-stats', async (_req,res)=>{
  try {
    const rows = await dbAll(`
      SELECT f.${Q(FAC_NAME_COL)} AS facility, COUNT(*) AS count
      FROM ${FB_TABLE} fb JOIN facilities f ON f.${Q(FAC_ID_COL)} = fb.${Q(FB_FAC_COL)}
      GROUP BY fb.${Q(FB_FAC_COL)} ORDER BY count DESC`);
    res.json({ ok:true, rows });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/bookings', async (_req,res)=>{
  try {
    const rows = await dbAll(`SELECT id, hogwartsId, facility, date, timeSlot FROM bookings_view ORDER BY date, timeSlot`);
    res.json({ ok:true, items: rows });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.put('/api/book/:id', async (req,res)=>{
  const { facility, timeSlot, startTime, endTime } = req.body || {};
  let { date } = req.body || {};
  if (!facility || !date || (!timeSlot && !(startTime && endTime)))
    return res.status(400).json({ error:'facility, date and time required' });

  const ymd = toYMD(date);
  if (!ymd) return res.status(400).json({ error:'Invalid date' });

  try {
    const facilityId = await getFacilityIdByNameOrId(facility);
    if (!facilityId) return res.status(404).json({ error:'Facility not found' });
    const [s,e] = timeSlot ? splitTimeSlot(timeSlot) : [ensureSecs(startTime), ensureSecs(endTime)];
    if (!s || !e) return res.status(400).json({ error:'Invalid time slot' });

    const [d0,d1] = dayBounds(ymd);
    const blocks = await dbAll(
      `SELECT start_time, end_time FROM maintenance_blocks
       WHERE facility_id=? AND NOT(end_time < ? OR start_time > ?)`,
      [facilityId, d0, d1]
    );
    const slotStartISO = `${ymd}T${s}`;
    const slotEndISO   = `${ymd}T${e}`;
    for (const b of blocks) {
      if (overlapISO(slotStartISO, slotEndISO, b.start_time, b.end_time)) {
        return res.status(409).json({ error:'Slot blocked for maintenance' });
      }
    }

    const ret = await dbRun(
      `UPDATE ${FB_TABLE} SET ${Q(FB_FAC_COL)}=?, ${Q(FB_DATE_COL)}=?, ${Q(FB_START_COL)}=?, ${Q(FB_END_COL)}=? WHERE ${Q(FB_ID_COL)}=?`,
      [facilityId, ymd, s, e, req.params.id]
    );
    if (ret.changes === 0) return res.status(404).json({ error:'Not found' });
    res.json({ ok:true });
  } catch(e){
    const msg = String(e.message||'');
    if (msg.includes('constraint') || msg.includes('unique'))
      return res.status(409).json({ error:'New time slot already booked' });
    res.status(500).json({ error:e.message });
  }
});

app.delete('/api/book/:id', async (req,res)=>{
  try {
    const ret = await dbRun(`DELETE FROM ${FB_TABLE} WHERE ${Q(FB_ID_COL)}=?`, [req.params.id]);
    if (ret.changes === 0) return res.status(404).json({ error:'Not found' });
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/my-bookings', async (req,res)=>{
  const { hogwartsId } = req.query || {};
  if (!hogwartsId) return res.status(400).json({ error:'hogwartsId required' });
  try {
    const user = await dbGet(`SELECT ${Q(USER_ID_COL)} AS user_id FROM users WHERE ${Q(USERNAME_COL)}=?`, [hogwartsId]);
    if (!user) return res.json({ ok:true, items: [] });
    const rows = await dbAll(`
      SELECT fb.${Q(FB_ID_COL)} AS id, f.${Q(FAC_NAME_COL)} AS facility, fb.${Q(FB_DATE_COL)} AS date,
             fb.${Q(FB_START_COL)} || '-' || fb.${Q(FB_END_COL)} AS timeSlot
      FROM ${FB_TABLE} fb JOIN facilities f ON f.${Q(FAC_ID_COL)} = fb.${Q(FB_FAC_COL)}
      WHERE fb.${Q(FB_USER_COL)}=? ORDER BY fb.${Q(FB_DATE_COL)}, fb.${Q(FB_START_COL)}`, [user.user_id]);
    res.json({ ok:true, items: rows });
  } catch(e){ res.status(500).json({ error:e.message }); }
});


app.get('/api/admin/stats', adminOnly, async (_req,res)=>{
  try {
    const rows = await dbAll(`
      SELECT 'totalBookings' AS key, COUNT(*) AS val FROM ${FB_TABLE}
      UNION ALL
      SELECT 'uniqueUsers', COUNT(DISTINCT ${Q(FB_USER_COL)}) FROM ${FB_TABLE}
      UNION ALL
      SELECT 'todayBookings', COUNT(*) FROM ${FB_TABLE} WHERE ${Q(FB_DATE_COL)} = date('now','localtime')`);
    res.json({ ok:true, stats: Object.fromEntries(rows.map(r=>[r.key, r.val])) });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

app.get('/api/admin/bookings', adminOnly, async (req,res)=>{
  let { date, facility } = req.query || {};
  const where = [], args = [];
  if (date)     { const ymd = toYMD(date); if (!ymd) return res.status(400).json({ error:'Invalid date' }); where.push(`fb.${Q(FB_DATE_COL)} = ?`); args.push(ymd); }
  if (facility) { where.push(`LOWER(f.${Q(FAC_NAME_COL)}) = LOWER(?)`); args.push(facility); }
  const sql = `
    SELECT fb.${Q(FB_ID_COL)} AS id, u.${Q(USERNAME_COL)} AS hogwartsId, f.${Q(FAC_NAME_COL)} AS facility,
           fb.${Q(FB_DATE_COL)} AS date, fb.${Q(FB_START_COL)} || '-' || fb.${Q(FB_END_COL)} AS timeSlot
    FROM ${FB_TABLE} fb
    JOIN users u ON u.${Q(USER_ID_COL)} = fb.${Q(FB_USER_COL)}
    JOIN facilities f ON f.${Q(FAC_ID_COL)} = fb.${Q(FB_FAC_COL)}
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY fb.${Q(FB_DATE_COL)}, fb.${Q(FB_START_COL)}`;
  try { const rows = await dbAll(sql, args); res.json({ ok:true, items: rows }); }
  catch(e){ res.status(500).json({ error:e.message }); }
});


app.get('/api/blocks', async (req,res)=>{
  const { facility, from, to } = req.query || {};
  const where=[], args=[];
  if (facility) { where.push(`facility_id = (SELECT ${Q(FAC_ID_COL)} FROM facilities WHERE LOWER(${Q(FAC_NAME_COL)})=LOWER(?))`); args.push(facility); }
  if (from) { where.push('end_time >= ?'); args.push(`${toYMD(from)}T00:00:00`); }
  if (to)   { where.push('start_time <= ?'); args.push(`${toYMD(to)}T23:59:59`); }
  const sql = `SELECT id, facility_id, start_time, end_time, reason
               FROM maintenance_blocks ${where.length?'WHERE '+where.join(' AND '):''}
               ORDER BY start_time`;
  try {
    const rows = await dbAll(sql, args);
    const withNames = await Promise.all(rows.map(r => dbGet(`SELECT ${Q(FAC_NAME_COL)} AS name FROM facilities WHERE ${Q(FAC_ID_COL)}=?`, [r.facility_id])
      .then(n => ({ ...r, facility: n?.name || String(r.facility_id) }))));
    res.json({ ok:true, blocks: withNames });
  } catch(e){ res.status(500).json({ error:e.message }); }
});


app.post('/api/admin/blocks', adminOnly, async (req, res) => {
  try {
    const { facility, facility_id, reason } = req.body || {};
    const facInput = facility_id ?? facility;
    if (!facInput) return res.status(400).json({ error:'facility required' });

    const facilityId = await getFacilityIdByNameOrId(facInput);
    if (!facilityId) return res.status(404).json({ error:'Facility not found' });

  
    const { s, e } = buildBlockTimes(req.body);
    const keyS = s && s.replace(/\D/g,'').slice(0,14);
    const keyE = e && e.replace(/\D/g,'').slice(0,14);
    if (!keyS || !keyE) return res.status(400).json({ error:'start/end time required' });
    if (keyE <= keyS)   return res.status(400).json({ error:'End must be after start' });

    // 1) clash with existing maintenance
    const existingBlocks = await dbAll(
      `SELECT id, start_time, end_time FROM maintenance_blocks WHERE facility_id = ?`,
      [facilityId]
    );
    if (existingBlocks.some(b => overlapISO(s, e, b.start_time, b.end_time))) {
      return res.status(409).json({ error: 'Overlaps existing block' });
    }

    // 2) clash with bookings on that facility (bookings are single-day)
    const startYmd = s.slice(0,10);
    const endYmd   = e.slice(0,10);
    const bookingRows = await dbAll(
      `SELECT ${Q(FB_ID_COL)} AS id,
              ${Q(FB_DATE_COL)}  AS date,
              ${Q(FB_START_COL)} AS start_time,
              ${Q(FB_END_COL)}   AS end_time
         FROM ${FB_TABLE}
        WHERE ${Q(FB_FAC_COL)} = ?
          AND ${Q(FB_DATE_COL)} BETWEEN ? AND ?
        ORDER BY ${Q(FB_DATE_COL)}, ${Q(FB_START_COL)}`,
      [facilityId, startYmd, endYmd]
    );
    if (bookingRows.some(b => overlapISO(s, e, `${b.date}T${b.start_time}`, `${b.date}T${b.end_time}`))) {
      return res.status(409).json({ error:'Overlaps existing booking(s)' });
    }


    const ret = await dbRun(
      `INSERT INTO maintenance_blocks(facility_id, start_time, end_time, reason)
       VALUES(?,?,?,?)`,
      [facilityId, s, e, reason || null]
    );
    res.status(201).json({ ok:true, id: ret.lastID });
  } catch (e) {
    res.status(500).json({ error:e.message });
  }
});

app.delete('/api/admin/blocks/:id', adminOnly, async (req,res)=>{
  try {
    const ret = await dbRun('DELETE FROM maintenance_blocks WHERE id=?', [Number(req.params.id)]);
    res.json({ ok:true, deleted: ret.changes });
  } catch(e){ res.status(500).json({ error:e.message }); }
});


init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}/`);
  });
}).catch(e => {
  console.error('❌ Init error:', e);
  process.exit(1);
});
