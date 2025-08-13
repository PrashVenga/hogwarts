# db/db_config.py
import os
from dotenv import load_dotenv
load_dotenv()  # read .env from project root

DB_PARAMS = {
    "host": os.getenv("DB_HOST", "127.0.0.1"),
    "port": int(os.getenv("DB_PORT", "5433")),
    "dbname": os.getenv("DB_NAME", "hogwarts5"),
    "user": os.getenv("DB_USER", "up2547860"),
    "password": os.getenv("DB_PASSWORD", ""),
}
SECRET_KEY = os.getenv("FLASK_SECRET", "supersecretkey")
