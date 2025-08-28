# 🪄 Hogwarts_Booking — Project Documentation (Windows Path Edition)

**Project Root (example):**  
`C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking`

This document is tailored to the actual folders/files you shared so a third-party can run everything on **localhost:3000** quickly and safely.

---

## 1) Repository Layout (as provided)

```
C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking
├─ .vs\                       (Visual Studio workspace data)
├─ client\
│  ├─ images\
│  ├─ music\
│  ├─ booking.html
│  ├─ booking.js
│  ├─ bookingDisplay.html
│  ├─ dashboard.js
│  ├─ index.html
│  ├─ login.html
│  ├─ registration.html
│  ├─ script.js
│  ├─ staff.html
│  └─ style.css
├─ server\
│  ├─ db\
│  │  ├─ bookings.backup.db
│  │  ├─ bookings.db
│  │  ├─ bookings.db-shm
│  │  ├─ booking.db.wal              (WAL; note singular ‘booking’ vs ‘bookings’)
│  │  ├─ hogwarts1_nodb_sqlite.BAK
│  │  ├─ hogwarts1_nodb_updated_admin.BAK
│  │  └─ hogwarts1_nodb_updated_admin.db
│  ├─ node_modules\                  (created after npm install)
│  ├─ tools\
│  │  ├─ default pw.js
│  │  └─ migrate-passwords-to-bcrypt.js
│  ├─ app.js
│  ├─ db.js
│  ├─ package.json
│  ├─ package-lock.json
│  └─ README
├─ hogwarts_intergratedDB finalized.sql
└─ sqlite_reference word.doc
```

> **Note on SQLite files**  
> - `bookings.db` is your primary bookings database.  
> - `bookings.db-shm` and `booking.db.wal` are SQLite journaling files created when **WAL (Write-Ahead Logging)** mode is enabled. They are expected; **do not delete** while the DB is in use.  
> - Users DB appears to be `hogwarts1_nodb_updated_admin.db` (the `.BAK` files are backups). Your `server/db.js` will determine which one is actually loaded.

---

## 2) Prerequisites

- **Node.js** v18+ (LTS) → https://nodejs.org/
- Internet access to install npm packages on first run
- A browser (Chrome/Edge) to open the client pages
- (Optional) SQLite Browser to inspect DB files

> ⚠️ **OneDrive tip:** Running from a OneDrive path is fine, but if you hit file locking issues (rare with WAL), copy the `Hogwarts_Booking` folder to a non‑synced path like `C:\Hogwarts_Booking` temporarily.

---

## 3) Install & Run (Backend on port 3000)

Open **Command Prompt** or **PowerShell**:

```bat
cd C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking\server
npm install
node app.js
```

You should see logs similar to:
```
Server listening on http://localhost:3000
```
API base URL: `http://localhost:3000/api`

> If port **3000** is in use, edit `server\app.js` and change:  
> `const PORT = process.env.PORT || 3000;` → to another free port (e.g., 3001).

---

## 4) Run the Frontend

### Option A — Open HTML directly
Double‑click files under `client\` (e.g., `index.html`, `booking.html`, `registration.html`).  
This works if your client JS fetches `http://localhost:3000/api/...`.

### Option B — Serve the `client` folder (recommended)
In a new terminal:
```bat
cd C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking\client
npx serve .
```
Open the printed URL (e.g., `http://localhost:5173`), while the backend keeps running on `http://localhost:3000`.

> If CORS is enabled/required in your server, ensure it allows requests from your static server origin.

---

## 5) Configuration (Databases & Paths)

Open `server\db.js` and confirm the DB filenames used. Typical examples you might see:

```js
// Example only — adjust to what's in your db.js
const USER_DB = path.join(__dirname, 'db', 'hogwarts1_nodb_updated_admin.db');
const BOOKINGS_DB = path.join(__dirname, 'db', 'bookings.db');
```

- Ensure **USER_DB** points to:  
  `C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking\server\db\hogwarts1_nodb_updated_admin.db`
- Ensure **BOOKINGS_DB** points to:  
  `C:\Users\azri8\OneDrive\Desktop\CW2\Hogwarts_Booking\server\db\bookings.db`

> If WAL is enabled, `*.db-shm` and `*.db-wal` will appear automatically when the DB is opened. This is normal.

---

## 6) Key Pages & Scripts

- **client\index.html** — landing page
- **client\registration.html** — register (with pulsing magical button)
- **client\login.html** — login
- **client\booking.html** — create bookings; gold calendar icon on date inputs
- **client\bookingDisplay.html** — “My Bookings”, with **Back** (top-left) and **Refresh** (top-right) tiny buttons
- **client\staff.html** — staff dashboard (Logout left, Refresh right)
- **client\style.css** — unified theme (gold/violet), corner utility buttons, gradients, icons
- **client\booking.js / dashboard.js / script.js** — page logic

- **server\app.js** — Express app & routes
- **server\db.js** — DB connections / queries
- **server\tools\migrate-passwords-to-bcrypt.js** — one‑off script to migrate plaintext/legacy hashes
- **server\tools\default pw.js** — default/password tooling (name suggests defaults; inspect before use)

---

## 7) API Endpoints (typical)

> Check your `server\app.js` routes for exact signatures. Common ones:

- `POST /api/register` — `{ hogwartsId, password, role }`
- `POST /api/login` — returns auth/session (if implemented)
- `GET  /api/my-bookings?hogwartsId=...`
- `DELETE /api/book/:id`
- `POST /api/blocks` / `DELETE /api/blocks/:id` (if staff maintenance is implemented)

---

## 8) Troubleshooting

- **Button looks huge / full width**  
  There may be a global `button { width:100% }`. Override specific buttons with:  
  `display:inline-flex; width:auto !important;`  
  Also ensure the corner container has `position: relative`.

- **Absolute offsets not moving**  
  The button’s `position:absolute` needs the parent container set to `position:relative`.

- **Animation not working (Register)**  
  Confirm the button has class `.register-btn` and styles appear at the **end** of `style.css`.

- **DB locked / WAL files persist**  
  Close the server process to flush WAL. Avoid editing `.db` in external tools while the server is running.

- **OneDrive conflicts**  
  If files are syncing mid‑run, copy the folder to a non‑synced path (e.g., `C:\Hogwarts_Booking`) for development.

---

## 9) Hand‑off Guide (ZIP → Localhost)

For someone who receives `Hogwarts_Booking.zip`:

1. **Unzip** to: `C:\Hogwarts_Booking` (or the same OneDrive path above).
2. Backend:
   ```bat
   cd C:\Hogwarts_Booking\server
   npm install
   node app.js
   ```
3. Frontend: open `client\index.html` (or `booking.html`) **or** serve with `npx serve .` from `client`.
4. Use **registration** page to create a user (Student/Teacher).  
5. Go to **booking** → create a booking → view it in **bookingDisplay.html**.  
6. Staff operations available in **staff.html** (requires staff role data in the Users DB).

That’s it — you’re live on **http://localhost:3000** 🎉

---

## 10) Credits & License

Built by **Azwee**. All DB files and content © their respective authors.
