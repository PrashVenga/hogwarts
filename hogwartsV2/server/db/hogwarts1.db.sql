-- hogwarts1.db.sql (SQLite)
PRAGMA foreign_keys = ON;

-- Core tables
CREATE TABLE IF NOT EXISTS facilities (
  facility_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  type        TEXT
);

CREATE TABLE IF NOT EXISTS classrooms (
  classroom_id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id  INTEGER,
  room_number  TEXT,
  capacity     INTEGER,
  FOREIGN KEY (facility_id) REFERENCES facilities(facility_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS facility_staff (
  staff_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  role       TEXT
);

CREATE TABLE IF NOT EXISTS students (
  student_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name   TEXT NOT NULL,
  age         INTEGER,
  class_name  TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
  teacher_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name   TEXT NOT NULL,
  subject     TEXT
);

-- 🔐 Users (used by your app for login)
CREATE TABLE IF NOT EXISTS users (
  user_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  hogwartsId TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,             -- store scrypt hash from your API
  role       TEXT NOT NULL DEFAULT 'user'
);

-- Bookings (FK to users.user_id)
CREATE TABLE IF NOT EXISTS facility_bookings (
  booking_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id    INTEGER,
  booked_by      INTEGER,               -- references users.user_id
  date           TEXT,                  -- 'YYYY-MM-DD'
  start_time     TEXT,                  -- 'HH:MM:SS'
  end_time       TEXT,                  -- 'HH:MM:SS'
  booking_action TEXT,                  -- e.g., 'Add'
  FOREIGN KEY (facility_id) REFERENCES facilities(facility_id) ON DELETE SET NULL,
  FOREIGN KEY (booked_by)   REFERENCES users(user_id)          ON DELETE CASCADE
);

-- Views based on facility_bookings
CREATE VIEW IF NOT EXISTS staff_a_bookings AS
  SELECT booking_id, facility_id, booked_by, date, start_time, end_time, booking_action
  FROM facility_bookings
  WHERE facility_id BETWEEN 1 AND 4;

CREATE VIEW IF NOT EXISTS staff_b_bookings AS
  SELECT booking_id, facility_id, booked_by, date, start_time, end_time, booking_action
  FROM facility_bookings
  WHERE facility_id = 5;

CREATE VIEW IF NOT EXISTS staff_c_bookings AS
  SELECT booking_id, facility_id, booked_by, date, start_time, end_time, booking_action
  FROM facility_bookings
  WHERE facility_id = 6;

CREATE VIEW IF NOT EXISTS staff_d_bookings AS
  SELECT booking_id, facility_id, booked_by, date, start_time, end_time, booking_action
  FROM facility_bookings
  WHERE facility_id = 7;

-- -------------------
-- Seed data (same as before; safe with FKs)
-- -------------------

-- facilities
INSERT INTO facilities (facility_id, name, type) VALUES (1, 'Classroom 1', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (2, 'Classroom 2', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (3, 'Classroom 3', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (4, 'Classroom 4', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (5, 'Badminton Court', 'Court');
INSERT INTO facilities (facility_id, name, type) VALUES (6, 'Swimming Pool', 'Pool');
INSERT INTO facilities (facility_id, name, type) VALUES (7, 'Gym', 'Gym');

-- classrooms
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (1, 1, 'CR101', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (2, 2, 'CR102', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (3, 3, 'CR103', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (4, 4, 'CR104', 30);

-- facility_staff
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (1, 'Staff A', 'Administrator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (2, 'Staff B', 'Coordinator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (3, 'Staff C', 'Operator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (4, 'Staff D', 'Supervisor');

-- students (1..100)
-- (keep your existing long student inserts here unchanged)

-- teachers
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (1, 'Teacher 1', 'Subject 1');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (2, 'Teacher 2', 'Subject 2');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (3, 'Teacher 3', 'Subject 3');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (4, 'Teacher 4', 'Subject 4');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (5, 'Teacher 5', 'Subject 5');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (6, 'Teacher 6', 'Subject 1');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (7, 'Teacher 7', 'Subject 2');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (8, 'Teacher 8', 'Subject 3');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (9, 'Teacher 9', 'Subject 4');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (10, 'Teacher 10', 'Subject 5');

-- NOTE: don't seed facility_bookings here unless you have real users (user_id values).
-- After registering users via API, you can insert bookings referencing those user_id values.
