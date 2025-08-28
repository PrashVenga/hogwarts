# Hogwarts_Booking - Local Setup Guide

## Requirements
- Node.js (latest LTS recommended): https://nodejs.org/
- npm (comes with Node.js)
- SQLite3 (optional, for DB viewing): https://www.sqlite.org/download.html

## Folder Structure
C:\Users\<YourName>\OneDrive\Desktop\CW2\Hogwarts_Booking
│
├── client
│   ├── booking.html
│   ├── booking.js
│   ├── bookingDisplay.html
│   ├── dashboard.js
│   ├── images/
│   ├── index.html
│   ├── login.html
│   ├── music/
│   ├── registration.html
│   ├── script.js
│   ├── staff.html
│   └── style.css
│
├── server
│   ├── app.js
│   ├── db.js
│   ├── package.json
│   ├── package-lock.json
│   ├── db/
│   │   ├── bookings.db
│   │   ├── bookings.backup.db
│   │   ├── hogwarts1_nodb_updated_admin.db
│   │   └── ...
│   └── tools/
│       ├── default-pw.js
│       └── migrate-passwords-to-bcrypt.js
│
├── hogwarts_intergratedDB_finalized.sql
├── sqlite_reference.docx
└── README.txt

## Installation & Running
1. Unzip the project folder into your system (path example):
   C:\Users\<YourName>\OneDrive\Desktop\CW2\Hogwarts_Booking

2. Open a terminal and navigate into the `server` folder:
   ```bash
   cd C:\Users\<YourName>\OneDrive\Desktop\CW2\Hogwarts_Booking\server
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   node app.js
   ```

5. Open your browser at:
   http://localhost:3000

## Usage
- Students & Teachers can:
  - Register/Login
  - Book available facilities (up to 3 hours daily)
  - View and cancel their bookings

- Admins can:
  - Login via admin account
  - Access Staff Dashboard
  - Block time slots for maintenance (only future/unbooked slots, per final version rules)

## Notes
- DB files are stored in `/server/db`.
- No need to install SQLite to run the project, only if you want to manually view/edit the database.
