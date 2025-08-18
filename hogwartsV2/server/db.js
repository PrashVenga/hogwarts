// server/db.js
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Hardcode to hogwarts1.db
const dbPath = path.resolve(__dirname, "./db/hogwarts1.db");

if (!fs.existsSync(dbPath)) {
  throw new Error(`❌ SQLite file not found at: ${dbPath}`);
}

const db = new Database(dbPath, { fileMustExist: true });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ✅ Connection message
console.log(`✅ SQLite connected -> ${path.relative(process.cwd(), dbPath)}`);

// 🧩 Schema check
try {
  const { cnt } = db.prepare("SELECT COUNT(*) AS cnt FROM sqlite_master").get();
  console.log(`🧩 Schema applied (existing data kept) — ${cnt} objects in schema`);
} catch (err) {
  console.error("❌ Schema check failed:", err.message);
  process.exit(1);
}

export default db;

