from flask import Flask, render_template, request, redirect, session, flash
from datetime import datetime, timedelta
import psycopg2
from psycopg2 import errors
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from db import db_config  # expects DB_PARAMS dict

load_dotenv()

app = Flask(__name__)
app.secret_key = "supersecretkey"
app.permanent_session_lifetime = timedelta(minutes=30)


def connect_db():
    return psycopg2.connect(connect_timeout=5, **db_config.DB_PARAMS)

def current_user_id():
    """Return the logged-in user's integer ID from the session."""
    return session.get("user_id")

# ---------- Helpers for booking ----------
SLOTS = [
    "08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00",
    "13:00-14:00","14:00-15:00","15:00-16:00","16:00-17:00",
    "17:00-18:00","18:00-19:00","19:00-20:00","20:00-21:00","21:00-22:00"
]

def parse_slot(slot_str: str):
    st_s, et_s = slot_str.split("-")
    return (datetime.strptime(st_s, "%H:%M").time(),
            datetime.strptime(et_s, "%H:%M").time())

def format_slot(st, et):
    return f"{st.strftime('%H:%M')}-{et.strftime('%H:%M')}"

def get_booked_slots(facility_id, date_str):
    with connect_db() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT start_time, end_time
            FROM facility_bookings
            WHERE facility_id=%s AND date=%s
        """, (facility_id, date_str))
        rows = cur.fetchall()
    return {format_slot(st, et) for (st, et) in rows}

# ---------- Core pages ----------
@app.route("/")
def home():
    return render_template("home.html")

# ---------- Auth ----------
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        uname = request.form["username"].strip()
        pwd = request.form["password"]

        with connect_db() as conn, conn.cursor() as cur:
            # fetch hashed password; assume PK column is user_id
            cur.execute("""
                SELECT user_id, username, role, password
                FROM users
                WHERE username=%s
            """, (uname,))
            row = cur.fetchone()

        if row and check_password_hash(row[3], pwd):
            session.permanent = True
            session["user_id"] = row[0]
            session["username"] = row[1]
            session["role"] = row[2]
            return redirect("/dashboard")
        else:
            flash("❌ Invalid username or password", "danger")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form["username"].strip()
        password = request.form["password"]

        if not username or not password:
            flash("Username and password are required.", "danger")
            return redirect("/register")

        hashed = generate_password_hash(password, method="scrypt")

        conn = cur = None
        try:
            conn = connect_db()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO users (username, password, role, initial_password)
                VALUES (%s, %s, %s, %s)
                """,
                (username, hashed, "user", password),   # <- keep plain in initial_password
            )
            conn.commit()
            flash("Registration successful. Please log in.", "success")
            return redirect("/login")

        except errors.UniqueViolation:
            if conn: conn.rollback()
            flash("Username already taken.", "warning")
            return redirect("/register")

        except Exception as e:
            if conn: conn.rollback()
            print("✗ Registration error:", e)
            flash("Something went wrong during registration.", "danger")
            return redirect("/register")

        finally:
            if cur: cur.close()
            if conn: conn.close()

    return render_template("register.html")


@app.route("/dashboard")
def dashboard():
    if "username" not in session:
        return redirect("/login")
    return render_template("dashboard.html", user=session["username"], role=session["role"])

@app.route("/booking-display", methods=["GET", "POST"])
def booking_display():
    # must be logged in
    if "username" not in session:
        return redirect("/login")

    uid = current_user_id()
    if uid is None:
        flash("❌ Not logged in properly.", "warning")
        return redirect("/login")

    msg = None
    selected_facility = request.values.get("facility_id")
    selected_date     = request.values.get("date")

    # create booking
    if request.method == "POST" and request.form.get("time_slot"):
        facility_id = request.form["facility_id"]
        date_str    = request.form["date"]
        time_slot   = request.form["time_slot"]
        st, et      = parse_slot(time_slot)

        with connect_db() as conn, conn.cursor() as cur:
            cur.execute("""
                SELECT 1
                FROM facility_bookings
                WHERE facility_id = %s AND date = %s
                  AND NOT (end_time <= %s OR start_time >= %s)
                LIMIT 1
            """, (facility_id, date_str, st, et))
            if cur.fetchone():
                msg = "❌ Time slot is already booked."
            else:
                cur.execute("""
                    INSERT INTO facility_bookings
                        (facility_id, booked_by, date, start_time, end_time, booking_action)
                    VALUES (%s, %s, %s, %s, %s, 'Add')
                """, (facility_id, uid, date_str, st, et))
                msg = "✅ Booking confirmed."

        selected_facility = facility_id
        selected_date = date_str

    # facilities for the dropdown
    with connect_db() as conn, conn.cursor() as cur:
        cur.execute("SELECT facility_id, name FROM facilities ORDER BY name")
        facilities = cur.fetchall()

    # booked slots for selected facility/date
    booked = set()
    if selected_facility and selected_date:
        booked = get_booked_slots(selected_facility, selected_date)

    # my bookings
    with connect_db() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT fb.booking_id AS id,
                   f.name,
                   fb.date,
                   fb.start_time,
                   fb.end_time
            FROM facility_bookings fb
            JOIN facilities f ON f.facility_id = fb.facility_id
            WHERE fb.booked_by = %s
            ORDER BY fb.date DESC, fb.start_time DESC
        """, (uid,))
        my_bookings = [{
            "id": r[0],
            "facility": r[1],
            "date": r[2].isoformat(),
            "timeslot": f"{r[3]} - {r[4]}",
        } for r in cur.fetchall()]

    return render_template(
        "booking_display.html",
        msg=msg,
        facilities=facilities,
        selected_facility=selected_facility,
        selected_date=selected_date,
        slots=SLOTS,
        booked=booked,
        my_bookings=my_bookings,
    )

@app.route("/booking-display/cancel/<int:booking_id>", methods=["POST"])
def booking_display_cancel(booking_id):
    if "username" not in session:
        return redirect("/login")

    uid = current_user_id()
    if uid is None:
        flash("❌ Not logged in properly.", "warning")
        return redirect("/login")

    with connect_db() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM facility_bookings WHERE booking_id = %s AND booked_by = %s",
            (booking_id, uid),
        )
        deleted = cur.rowcount

    flash(
        "✅ Booking canceled." if deleted else "❌ Not found or not yours to cancel.",
        "success" if deleted else "warning",
    )
    return redirect("/booking-display")

# ---------- Utilities ----------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

@app.route("/test_db")
def test_db():
    try:
        with connect_db() as conn, conn.cursor() as cur:
            cur.execute("SELECT version()")
            (ver,) = cur.fetchone()
        return f"✅ Connected to database!<br>Version: {ver}"
    except Exception as e:
        return f"❌ Failed to connect to the database: {e}"

@app.route("/db_info")
def db_info():
    p = db_config.DB_PARAMS
    dbname = p.get("database") or p.get("dbname")
    return f"DB -> host={p['host']} port={p['port']} db={dbname} user={p['user']}"

@app.route("/booking")
def booking_redirect():
    return redirect("/booking-display")

if __name__ == "__main__":
    app.run(debug=True)
