import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import db from "./db.js";
import crypto from "crypto";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ---------- Password helpers (scrypt; no external deps) ----------
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key  = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [saltHex, keyHex] = (stored || "").split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const key  = Buffer.from(keyHex, "hex");
  const test = crypto.scryptSync(password, salt, key.length);
  try { return crypto.timingSafeEqual(key, test); } catch { return false; }
}

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000, sameSite: "lax", httpOnly: true },
}));

// Serve static client files
app.use(express.static(path.join(__dirname, "../client")));
const send = rel => (_req, res) =>
  res.sendFile(path.join(__dirname, "../client", rel));

app.get("/login",    send("login/index.html"));
app.get("/register", send("register/index.html"));
app.get("/booking-display", send("booking_display/index.html")); // map hyphen URL to underscore folder

// ---------- Utilities ----------
app.get("/api/util/test_db", (_req, res) => {
  try {
    const row = db.prepare("SELECT sqlite_version() AS v").get();
    res.send(`✅ SQLite OK — version: ${row.v}`);
  } catch (e) {
    res.status(500).send(`❌ SQLite error: ${e}`);
  }
});

// ---------- Auth ----------
app.post("/api/auth/register", (req, res) => {
  const hogwartsId = (req.body.hogwartsId || req.body.username || "").trim();
  const password   = req.body.password || "";
  if (!hogwartsId || !password) {
    return res.status(400).json({ error: "hogwartsId and password are required" });
  }
  const hashed = hashPassword(password);
  try {
    db.prepare(
      "INSERT INTO users (hogwartsId, password, role) VALUES (?, ?, ?)"
    ).run(hogwartsId, hashed, "user");
    res.json({ ok: true, message: "Registered. Please log in." });
  } catch (e) {
    if (String(e.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "hogwartsId already exists" });
    }
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const hogwartsId = (req.body.hogwartsId || req.body.username || "").trim();
  const password   = req.body.password || "";

  // NOTE: alias user_id -> id so the rest of the code can use row.id
  const row = db.prepare(
    "SELECT user_id AS id, hogwartsId, role, password FROM users WHERE hogwartsId = ?"
  ).get(hogwartsId);

  if (!row || !verifyPassword(password, row.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.user_id  = row.id;
  req.session.username = row.hogwartsId;
  req.session.role     = row.role;

  res.json({ ok: true, user: { id: row.id, hogwartsId: row.hogwartsId, role: row.role } });
});


app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ---------- Helpers ----------
function requireLogin(req, res, next) {
  if (!req.session.user_id) return res.status(401).json({ error: "Not logged in" });
  next();
}
function parseSlot(slot) {
  const [st, et] = (slot || "").split("-");
  return { st, et }; // "HH:MM"
}

// ---------- (Optional) create tables & seed if missing ----------
function ensureSchema() {
  const hasFacilities =
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='facilities'").get();
  const hasBookings =
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='facility_bookings'").get();

  if (!hasFacilities) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS facilities (
        facility_id INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL UNIQUE
      );
    `);
  }
  if (!hasBookings) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS facility_bookings (
        booking_id    INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_id   INTEGER NOT NULL,
        booked_by     INTEGER NOT NULL,
        date          TEXT NOT NULL,      -- YYYY-MM-DD
        start_time    TEXT NOT NULL,      -- HH:MM
        end_time      TEXT NOT NULL,      -- HH:MM
        booking_action TEXT DEFAULT 'Add',
        FOREIGN KEY(facility_id) REFERENCES facilities(facility_id) ON DELETE CASCADE,
        FOREIGN KEY(booked_by)   REFERENCES users(id)         ON DELETE CASCADE
      );
    `);
  }
  // seed a few facilities if table is empty
  const count = db.prepare("SELECT COUNT(*) AS c FROM facilities").get().c;
  if (count === 0) {
    const insert = db.prepare("INSERT INTO facilities (name) VALUES (?)");
    ["Badminton Court","Swimming Pool","Classroom A","Gym"].forEach(n => insert.run(n));
    console.log("[DB] Seeded default facilities.");
  }
}
ensureSchema();

// ---------- Facilities ----------
app.get("/api/facilities", (_req, res) => {
  try {
    const rows = db.prepare("SELECT facility_id AS id, name FROM facilities ORDER BY name").all();
    res.json(rows);
  } catch (e) {
    console.error("GET /api/facilities", e);
    res.status(500).json({ error: "Failed to load facilities" });
  }
});

// ---------- Availability (booked slots for a day) ----------
app.get("/api/bookings/booked", (req, res) => {
  const facilityId = Number(req.query.facilityId);
  const date       = (req.query.date || "").trim();
  if (!facilityId || !date) return res.status(400).json({ error: "facilityId and date are required" });

  try {
    const rows = db.prepare(`
      SELECT start_time, end_time
      FROM facility_bookings
      WHERE facility_id = ? AND date = ?
      ORDER BY start_time
    `).all(facilityId, date);

    const slots = rows.map(r => `${r.start_time}-${r.end_time}`);
    res.json({ booked: new Set(slots) ? slots : [] });
  } catch (e) {
    console.error("GET /api/bookings/booked", e);
    res.status(500).json({ error: "Failed to load booked slots" });
  }
});

// ---------- Create booking ----------
app.post("/api/bookings/create", requireLogin, (req, res) => {
  const facilityId = Number(req.body.facility_id || req.body.facilityId);
  const date       = (req.body.date || "").trim();
  const timeSlot   = (req.body.time_slot || req.body.timeSlot || "").trim();
  if (!facilityId || !date || !timeSlot) {
    return res.status(400).json({ error: "facility_id, date, time_slot are required" });
  }
  const { st, et } = parseSlot(timeSlot);
  if (!st || !et) return res.status(400).json({ error: "Invalid time_slot format" });

  try {
    // conflict: NOT (end <= st OR start >= et)
    const clash = db.prepare(`
      SELECT 1 FROM facility_bookings
       WHERE facility_id = ? AND date = ?
         AND NOT (end_time <= ? OR start_time >= ?)
       LIMIT 1
    `).get(facilityId, date, st, et);

    if (clash) return res.status(409).json({ error: "Time slot already booked" });

    db.prepare(`
      INSERT INTO facility_bookings
        (facility_id, booked_by, date, start_time, end_time, booking_action)
      VALUES (?, ?, ?, ?, ?, 'Add')
    `).run(facilityId, req.session.user_id, date, st, et);

    res.json({ ok: true, message: "Booking confirmed" });
  } catch (e) {
    console.error("POST /api/bookings/create", e);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ---------- My bookings ----------
app.get("/api/bookings/mine", requireLogin, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT fb.booking_id AS id,
             f.name        AS facility,
             fb.date       AS date,
             fb.start_time AS start_time,
             fb.end_time   AS end_time
      FROM facility_bookings fb
      JOIN facilities f ON f.facility_id = fb.facility_id
      WHERE fb.booked_by = ?
      ORDER BY fb.date DESC, fb.start_time DESC
    `).all(req.session.user_id);

    const list = rows.map(r => ({
      id: r.id,
      facility: r.facility,
      date: r.date,
      timeslot: `${r.start_time}-${r.end_time}`,
    }));
    res.json(list);
  } catch (e) {
    console.error("GET /api/bookings/mine", e);
    res.status(500).json({ error: "Failed to load your bookings" });
  }
});

// ---------- Cancel booking ----------
app.post("/api/bookings/cancel/:id", requireLogin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid booking id" });

  try {
    const info = db.prepare(
      "DELETE FROM facility_bookings WHERE booking_id = ? AND booked_by = ?"
    ).run(id, req.session.user_id);

    if (info.changes === 0) return res.status(404).json({ error: "Not found or not yours to cancel" });
    res.json({ ok: true, message: "Booking canceled" });
  } catch (e) {
    console.error("POST /api/bookings/cancel/:id", e);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

// ---------- Home (optional) ----------
app.get("/",      send("home/index.html"));
app.get("/home",  send("home/index.html"));
app.get("/index", (_req,res) => res.redirect("/")); // optional nicety

// after other /api/auth routes
app.get("/api/auth/me", (req, res) => {
  if (req.session?.user_id) {
    return res.json({
      loggedIn: true,
      user: {
        id: req.session.user_id,
        username: req.session.username,
        role: req.session.role,
      },
    });
  }
  res.json({ loggedIn: false });
});

app.get('/health/db', (req, res) => {
  try {
    const { ok } = db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: true, db_ok: !!ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
