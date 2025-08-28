// booking.js — heatmap-only selection, multi-select + daily quota

const API_BASE = '/api';
const MAX_DAILY_SESSIONS = 3;     // per student per date
const MAX_SLOTS_PER_BOOKING = 2;  // per submission

// Fixed timetable
const SLOTS = [
  '08:00-09:00','09:00-10:00','10:00-11:00',
  '11:00-12:00', '12:00-13:00','13:00-14:00','14:00-15:00',
  '15:00-16:00','16:00-17:00','17:00-18:00',
  '18:00-19:00','19:00-20:00','20:00-21:00','21:00-22:00'
];

// display ↔ slug
const DISPLAY_TO_SLUG = {
  'Badminton Court': 'badminton',
  'Swimming Pool':   'swimming',
  'Gym':             'gym',
  'Classroom A':     'classroomA',
  'Classroom B':     'classroomB',
  'Classroom C':     'classroomC',
  'Classroom D':     'classroomD',
};
const normSlug = (v) => (DISPLAY_TO_SLUG[v] || String(v || '')).trim().toLowerCase();

// ---------- utils
function toMin(hhmm) { const [h,m] = String(hhmm||'').split(':').map(Number); return h*60 + m; }
function overlaps(a1, a2, b1, b2) { return a1 < b2 && b1 < a2; }
function slotToRange(v) { const [s,e] = v.split('-'); return { value: v, a: toMin(s), b: toMin(e) }; }
function getAllSlotRanges() { return SLOTS.map(slotToRange); }

// ---------- selection state + refresh loop
const selectedSlots = new Set();
let refreshTimer = null;

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(refreshUI, 20000);
  document.addEventListener('visibilitychange', onVisChange);
}
function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
  document.removeEventListener('visibilitychange', onVisChange);
}
function onVisChange() {
  if (document.visibilityState === 'visible') refreshUI();
}

// ---------- API joins
async function fetchBookingsAndBlocks() {
  const facilityDisp = document.getElementById('facility').value;
  const date = document.getElementById('bookingDate').value;
  if (!facilityDisp || !date) return { bookings: [], blocks: [] };

  let bookings = [], blocks = [];
  try {
    const r1 = await fetch(
      `${API_BASE}/bookings?facility=${encodeURIComponent(facilityDisp)}&date=${encodeURIComponent(date)}`,
      { cache: 'no-store' }
    );
    bookings = r1.ok ? await r1.json() : [];
  } catch {}
  try {
    const r2 = await fetch(
      `${API_BASE}/blocks?facility=${encodeURIComponent(normSlug(facilityDisp))}&date=${encodeURIComponent(date)}`,
      { cache: 'no-store' }
    );
    blocks = r2.ok ? await r2.json() : [];
  } catch {}

  // safety filter
  bookings = (bookings || []).filter(
    (b) => String(b.date) === date && normSlug(b.facility) === normSlug(facilityDisp)
  );

  // ⚠️ Avoid Date() timezone surprises; compare via string slices
  blocks = (blocks || []).filter((r) => {
    const sDate = String(r.start_time || '').slice(0, 10); // 'YYYY-MM-DD'
    const eDate = String(r.end_time   || '').slice(0, 10);
    const sameDay = (sDate === date) || (eDate === date);
    return sameDay && normSlug(r.facility) === normSlug(facilityDisp);
  });

  return { bookings, blocks };
}

async function getMyDailyCount() {
  const hid = localStorage.getItem('hogwartsId') || localStorage.getItem('username') || '';
  const date = document.getElementById('bookingDate').value || '';
  if (!hid || !date) return 0;
  try {
    const r = await fetch(
      `${API_BASE}/my-bookings?hogwartsId=${encodeURIComponent(hid)}&date=${encodeURIComponent(date)}`,
      { cache: 'no-store' }
    );
    const rows = r.ok ? await r.json() : [];
    return rows.length || 0;
  } catch {
    return 0;
  }
}

function updateQuotaInfo(count) {
  let el = document.getElementById('quotaInfo');
  if (!el) {
    el = document.createElement('div');
    el.id = 'quotaInfo';
    el.style.margin = '6px 0 10px';
    el.style.opacity = '0.9';
    const form = document.getElementById('bookingForm');
    form.insertBefore(el, document.getElementById('availabilityGrid'));
  }
  const remaining = Math.max(0, MAX_DAILY_SESSIONS - count);
  el.textContent = `Daily quota: ${count}/${MAX_DAILY_SESSIONS} used — ${remaining} remaining`;
}

// ---------- UI
async function renderHeatmap() {
  const grid = document.getElementById('availabilityGrid');
  const facilityDisp = document.getElementById('facility').value;
  const date = document.getElementById('bookingDate').value;
  if (!facilityDisp || !date) {
  grid.innerHTML = '';   // don't add a placeholder; avoid the duplicate
  return;
}

  const [{ bookings, blocks }, myCount] = await Promise.all([fetchBookingsAndBlocks(), getMyDailyCount()]);
  updateQuotaInfo(myCount);
  const remaining = Math.max(0, MAX_DAILY_SESSIONS - myCount);

  const ranges = getAllSlotRanges();
  const bookedRanges = bookings.map((b) => {
    const [s, e] = String(b.timeSlot).split('-');
    return { a: toMin(s), b: toMin(e) };
  });

  // Parse HH:MM from block times without constructing Date objects
  const blockedRanges = (blocks || []).map((r) => {
    const sh = String(r.start_time || '').slice(11, 16); // 'HH:MM'
    const eh = String(r.end_time   || '').slice(11, 16);
    return { a: toMin(sh), b: toMin(eh) };
  });

  grid.innerHTML = '';
  ranges.forEach((R) => {
    const isBlocked = blockedRanges.some((B) => overlaps(R.a, R.b, B.a, B.b));
    const isBooked  = bookedRanges.some((B) => overlaps(R.a, R.b, B.a, B.b));
    const state = isBlocked ? 'blocked' : (isBooked ? 'booked' : 'available');

    const el = document.createElement('button');
    el.type = 'button';
    el.className = `slot ${state}${selectedSlots.has(R.value) ? ' selected' : ''}`;
    el.textContent = R.value;
    el.disabled = state !== 'available';

    if (state === 'available') {
      el.addEventListener('click', () => {
        if (selectedSlots.has(R.value)) {
          selectedSlots.delete(R.value);
          el.classList.remove('selected');
        } else {
          const canPickMore = selectedSlots.size < Math.min(MAX_SLOTS_PER_BOOKING, remaining);
          if (!canPickMore) {
            alert(`You can select up to ${Math.min(MAX_SLOTS_PER_BOOKING, remaining)} slot(s) right now.`);
            return;
          }
          selectedSlots.add(R.value);
          el.classList.add('selected');
        }
      });
    }
    grid.appendChild(el);
  });
}

async function refreshUI() {
  await renderHeatmap();
}

// ---------- booking submit + fallback
async function submitBooking(e) {
  e.preventDefault();
  const facility = document.getElementById('facility').value;
  const date     = document.getElementById('bookingDate').value;
  const resultEl = document.getElementById('bookingResult');
  const bookBtn  = document.querySelector('.book-now-btn');

  const hogwartsId = localStorage.getItem('hogwartsId') || localStorage.getItem('username');
  if (!hogwartsId) return alert('⚠️ Please log in first.');
  if (!facility || !date)  return alert('Select facility and date.');

  const chosen = [...selectedSlots];
  if (chosen.length === 0) return alert('Tap the green tiles to select up to 2 slot(s).');
  if (chosen.length > 2)   return alert('You can book up to 2 slot(s) at once.');

  if (bookBtn) bookBtn.disabled = true;
  resultEl.textContent = '';

  try {
    if (chosen.length === 1) {
      const id = await postSingleSlot({ hogwartsId, facility, date, timeSlot: chosen[0] });
      resultEl.textContent = `✅ Booking confirmed (ID: ${id}).`;
    } else {
      // Try multi first
      const multiRes = await fetch(`${API_BASE}/book-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hogwartsId, facility, date, timeSlots: chosen })
      });

      if (multiRes.ok) {
        resultEl.textContent = `✅ Booked ${chosen.length} slots.`;
      } else {
        // If server returned a clear 409 (blocked/duplicate/quota), surface it
        let msg = '';
        try { const body = await multiRes.json(); msg = body?.error || ''; } catch {}
        if (multiRes.status === 409 && msg) throw new Error(msg);

        // Fallback for ANY other non-OK: sequential with rollback
        const id1 = await postSingleSlot({ hogwartsId, facility, date, timeSlot: chosen[0] });
        try {
          await postSingleSlot({ hogwartsId, facility, date, timeSlot: chosen[1] });
          resultEl.textContent = `✅ Booked 2 slots.`;
        } catch (e2) {
          try { await fetch(`${API_BASE}/book/${id1}`, { method: 'DELETE' }); } catch {}
          throw e2;
        }
      }
    }

    selectedSlots.clear();
    await refreshUI();
  } catch (err) {
    resultEl.textContent = '❌ ' + (err.message || 'Booking failed');
  } finally {
    if (bookBtn) bookBtn.disabled = false;
  }
}

// ---------- helpers
async function postSingleSlot({ hogwartsId, facility, date, timeSlot }) {
  const res = await fetch(`${API_BASE}/book`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ hogwartsId, facility, date, timeSlot })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body.bookingId || body.id || 0;
}

// ---------- boot
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('bookingDate');

  // ✅ Prevent past-date bookings (and default to today)
  if (d) {
    const today = new Date();
    const isoToday = today.toISOString().slice(0, 10);
    d.setAttribute('min', isoToday);
    if (!d.value) d.valueAsDate = today;}

  if (d && !d.value) d.valueAsDate = new Date();

  document.getElementById('facility')?.addEventListener('change', () => {
    selectedSlots.clear();
    refreshUI();
  });
  document.getElementById('bookingDate')?.addEventListener('change', () => {
    selectedSlots.clear();
    refreshUI();
  });
  document.getElementById('bookingForm')?.addEventListener('submit', submitBooking);

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  window.addEventListener('beforeunload', stopAutoRefresh);

  refreshUI();
  startAutoRefresh();
});


