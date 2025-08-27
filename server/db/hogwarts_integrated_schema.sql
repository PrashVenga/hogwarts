PRAGMA foreign_keys=ON;

-- Users: username is the canonical login (a.k.a. Hogwarts ID on frontend)
CREATE TABLE IF NOT EXISTS users (
  user_id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username         TEXT    NOT NULL UNIQUE,
  password         TEXT    NOT NULL,
  role             TEXT    NOT NULL,
  initial_password TEXT
);

-- Bookings: tie to users(username)
CREATE TABLE IF NOT EXISTS bookings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT    NOT NULL,         -- FK to users.username
  facility   TEXT    NOT NULL,         -- display name (e.g., 'Badminton Court')
  date       TEXT    NOT NULL,         -- YYYY-MM-DD
  timeSlot   TEXT    NOT NULL,         -- 'HH:MM-HH:MM'
  createdAt  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (username) REFERENCES users(username)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON bookings(username, date);
CREATE INDEX IF NOT EXISTS idx_bookings_facility_date ON bookings(facility, date);

-- Maintenance blocks: uses facility slug (lowercase), iso times
CREATE TABLE IF NOT EXISTS maintenance_blocks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  facility   TEXT NOT NULL,            -- slug: badminton, classrooma, etc.
  start_time TEXT NOT NULL,            -- ISO 'YYYY-MM-DDTHH:MM:SS'
  end_time   TEXT NOT NULL,
  reason     TEXT
);

CREATE INDEX IF NOT EXISTS idx_blocks_facility_time
  ON maintenance_blocks(facility, start_time, end_time);
