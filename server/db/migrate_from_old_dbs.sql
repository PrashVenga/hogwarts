PRAGMA foreign_keys=ON;

ATTACH DATABASE 'C:/Users/azri8/OneDrive/Desktop/CW2/Hogwarts_Booking/server/db/hogwarts1_nodb_updated_admin.db' AS old_users;
ATTACH DATABASE 'C:/Users/azri8/OneDrive/Desktop/CW2/Hogwarts_Booking/server/db/bookings.db'                      AS old_bookings;

-- 1) Migrate users from the old users DB into the integrated DB
INSERT OR IGNORE INTO users (user_id, username, password, role, initial_password)
SELECT user_id, username, password, role, COALESCE(initial_password, NULL)
FROM old_users.users;

-- 2) Seed any users referenced by bookings but missing in the integrated users table
INSERT OR IGNORE INTO users (username, password, role)
SELECT DISTINCT b.hogwartsId AS username,
       '$2b$10$k5yJWf9x.QYMsaAED4B75OMsrE4hYogQMHSADVE0.dxnYfL.VZqz6' AS password,  -- placeholder bcrypt
       'student' AS role
FROM old_bookings.bookings b
LEFT JOIN users u  -- join against the INTEGRATED users table (not old_users)
  ON LOWER(u.username) = LOWER(b.hogwartsId)
WHERE u.username IS NULL;

-- 3) Migrate bookings (map hogwartsId -> username)
INSERT INTO bookings (username, facility, date, timeSlot)
SELECT b.hogwartsId, b.facility, b.date, b.timeSlot
FROM old_bookings.bookings b;
