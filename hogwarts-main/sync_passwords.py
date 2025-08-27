import psycopg2
from werkzeug.security import generate_password_hash
from db import db_config

with psycopg2.connect(**db_config.DB_PARAMS) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT user_id, initial_password FROM users WHERE initial_password IS NOT NULL")
        rows = cur.fetchall()
        updated = 0
        for uid, plain in rows:
            hashed = generate_password_hash(plain, method="scrypt")
            cur.execute("UPDATE users SET password=%s WHERE user_id=%s", (hashed, uid))
            updated += 1
    conn.commit()
print(f"✅ Synced {updated} user(s) to initial_password")
