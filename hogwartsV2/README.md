# HogwartsV2 — Facilities Booking (VC2)

Node/Express + SQLite implementation of the Hogwarts facilities booking system.  
VC2 replaces the VC1 backend (Flask + PostgreSQL) to maximize tester reproducibility and minimize setup friction.

> **Minimum supported Node:** 18+. Recommended: 20 or 22 with `better-sqlite3 >= 12`.

---

## 🚀 Quick Start

```bash
# 1) Install deps (from the server folder)
cd server
npm i

# 2) Seed database (creates ./db/bookings.db and seeds facilities)
npm run seed

# 3) Run the app (dev with nodemon or plain start)
npm run dev
# or:
npm start

# 4) Open the site
# http://localhost:3000/home
```

If the seed script is missing, add `seed` to `server/package.json`:
```json
{
  "scripts": {
    "dev": "nodemon app.js",
    "start": "node app.js",
    "seed": "node ./db/seed.js"
  }
}
```

---

## Tech Stack

- **Backend:** Node.js (Express), `express-session`, `morgan`, `dotenv`
- **DB:** SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **Auth:** Session cookie; passwords are **hashed** (bcrypt by default; legacy scrypt supported if present)
- **Frontend:** Static HTML/CSS/JS served from `/client`

---

## Project Structure

```
HogwartsV2/
├─ server/
│  ├─ app.js               # Express app (entry point)
│  ├─ routes/              # auth.js, bookings.js
│  ├─ db/
│  │  ├─ schema.sql
│  │  ├─ seed.js
│  │  └─ bookings.db       # created/seeded on first run
│  ├─ .env.example
│  └─ package.json
└─ client/
   ├─ home/                # /home
   ├─ login/               # /login
   ├─ register/            # /register
   └─ booking-display/     # /booking-display
```

---

## Environment

Create `server/.env` (based on `.env.example`):

```
DB_FILE=./db/bookings.db
SESSION_SECRET=change_me
PORT=3000
```

- The server logs the exact DB path on startup (e.g., `C:/Users/Prash/hogwartsV2/server/db/bookings.db`).  
- Static routes map to `/client`:
  - `/` → redirects to `/home`
  - `/home`, `/login`, `/register`, `/booking-display`

**Navbar behavior:** `GET /api/auth/me` drives the visibility of **Booking** and **Logout** (handled by `client/js/layout.js`).

---

## API Reference

### Auth
- `POST /api/auth/register`  
  Body: `hogwartsId`, `password` (optional `role`) → `{ success: true }` or `409` if duplicate.
- `POST /api/auth/login`  
  Body: `hogwartsId`, `password` → `{ success: true }` or `401` invalid.
- `POST /api/auth/logout` → `{ success: true }`
- `GET  /api/auth/me` → `{ loggedIn: boolean, user? }`

### Booking
- `GET  /api/facilities` → `[{ id, name }]`
- `GET  /api/bookings/booked?facilityId=<id>&date=YYYY-MM-DD`  
  → `{ booked: ["HH:MM-HH:MM", ...] }`
- `POST /api/bookings/create` (auth)  
  Body: `{ facilityId, date, time_slot }` → `{ success, id }` or `409` if taken.
- `GET  /api/bookings/mine` (auth) → `[{ id, date, time_slot, facility_name }]`
- `POST /api/bookings/cancel/:id` (auth) → `{ success: true }`

---

## Database

### Schema essentials (`server/db/schema.sql`)
```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  hogwartsId TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,      -- hash (bcrypt preferred; legacy scrypt supported)
  role       TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS facility_bookings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  facility_id INTEGER NOT NULL,
  date        TEXT NOT NULL,     -- YYYY-MM-DD
  time_slot   TEXT NOT NULL,     -- e.g., '09:00-10:00'
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(facility_id, date, time_slot),
  FOREIGN KEY(user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY(facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);
```

### Verify with SQLite (Windows PowerShell)
```powershell
sqlite3 .\server\dbookings.db ".tables"
sqlite3 .\server\dbookings.db "SELECT id,name FROM facilities;"
sqlite3 .\server\dbookings.db "SELECT id,hogwartsId,role FROM users ORDER BY id DESC LIMIT 5;"
```

> If `.open ./server/db/bookings.db` fails inside sqlite, use an **absolute** path:  
> `.open "C:/Users/<you>/hogwartsV2/server/db/bookings.db"`

---

## Auth & Passwords

- New accounts are hashed (recommended: **bcrypt** via `bcryptjs`).  
- If your DB contains older **scrypt** entries stored as `hashHex:saltHex`, keep the hybrid verifier in the login route so both formats pass until migration is complete.
- Session cookie: `HttpOnly`, `sameSite=lax`, default **8h** lifetime.

---

## Frontend Behavior

- Booking grid shows a fixed list of hourly slots (edit `SLOTS` in `client/booking-display/booking.js`).  
- Only **free** slots appear in the dropdown; successful bookings update the grid and **My Bookings** table.  
- **Logout** button and **Booking** pill become visible after authentication.

---

## VC1 → VC2 Transition (Context)

- **VC1:** Flask + PostgreSQL. Tester could not connect to the DB (env/driver/SSL hurdles), blocking grading.  
- **VC2:** Node/Express + SQLite (embedded). No external services → consistent, reproducible demo.  
- API surface and UX flows preserved to minimize changes for testers.

---

## Quick Test Plan

1. **Register** `hogwartsId` (unique) → success message.  
2. **Login** → `/api/auth/me` returns `{ loggedIn: true }`; navbar shows **Booking** and **Logout**.  
3. **Availability:** choose facility & date → grid renders; dropdown shows **only free** slots.  
4. **Create booking:** free slot becomes **booked**; appears under **My Bookings**.  
5. **Cancel booking:** row removed; slot freed; re-check availability for the date.

---

## Troubleshooting

- **`better-sqlite3` build error on Node 22**  
  Install `better-sqlite3@>=12` (prebuilt binaries) or install VS Build Tools (C++ workload) then `npm rebuild better-sqlite3 --build-from-source`.

- **“Missing script: seed”**  
  Add the `seed` script and `db/seed.js`/`db/schema.sql`, then run `npm run seed`.

- **SQLite: “unable to open database file”**  
  Use an absolute path in the sqlite shell or run the CLI from the project root.

- **“database is locked”** (during seeding)  
  Stop the server, run `npm run seed`, then restart the server.

- **In-shell mistakes**  
  In sqlite, don’t type `sqlite3` again. Use `.open` to switch DBs. Use `;` to end a broken statement and `.quit` to exit.

---

## License

Student project — no license specified. Add an open-source license here if you plan to publish.

---

## Acknowledgements

- `express`, `express-session`, `better-sqlite3`, and the SQLite CLI.
