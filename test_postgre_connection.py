import psycopg2

try:
    connection = psycopg2.connect(
        host="127.0.0.1",
        port="6543",
        database="hogwarts5",
        user="up2547860",
        password="CT0385713!"  # Replace this
    )
    cursor = connection.cursor()
    cursor.execute("SELECT version();")
    db_version = cursor.fetchone()
    print("✅ Connected to PostgreSQL database")
    print("Database version:", db_version)

except Exception as error:
    print("❌ Database connection failed:", error)

finally:
    if 'connection' in locals() and connection:
        cursor.close()
        connection.close()
        print("Connection closed.")
