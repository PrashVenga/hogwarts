import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()  # reads .env from project root if present

HOST = os.getenv("DB_HOST", "127.0.0.1")
PORT = int(os.getenv("DB_PORT", "5433"))     # <-- 5433 was your working port
NAME = os.getenv("DB_NAME", "hogwarts5")
USER = os.getenv("DB_USER", "up2547860")
PASS = os.getenv("DB_PASSWORD", "CT0385713!")

try:
    print(f"→ Connecting to {HOST}:{PORT} db={NAME} user={USER}")
    with psycopg2.connect(
        host=HOST,
        port=PORT,
        dbname=NAME,
        user=USER,
        password=PASS,
        connect_timeout=5,
    ) as conn:
        with conn.cursor() as cur:
            cur.execute("SHOW port;")
            (port_used,) = cur.fetchone()
            cur.execute("SELECT current_database(), current_user, version();")
            db, usr, ver = cur.fetchone()
            print(f"✅ Connected: db={db}, user={usr}, port={port_used}")
            print(ver)
except Exception as e:
    print("❌ Database connection failed:", e)
