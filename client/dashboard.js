/* ---------------------------------
   Staff dashboard logic (admin-only)
   --------------------------------- */
const API_BASE = '/api';
let facilityChart = null;

// Time grid for maintenance block selects
const OPEN_TIME  = '08:00';
const CLOSE_TIME = '22:00';
const STEP_MIN   = 30;

// slug -> display
const FACILITY_NAME = {
  badminton:  'Badminton Court',
  swimming:   'Swimming Pool',
  gym:        'Gym',
  classroomA: 'Classroom A',
  classroomB: 'Classroom B',
  classroomC: 'Classroom C',
  classroomD: 'Classroom D',
};
// display (lowercase) -> slug
const NAME_TO_SLUG = Object.fromEntries(
  Object.entries(FACILITY_NAME).map(([slug, label]) => [label.toLowerCase(), slug])
);

function toMin(hhmm){ const [h,m]=(hhmm||'').split(':').map(Number); return h*60+m; }
function fromMin(min){ return String(Math.floor(min/60)).padStart(2,'0') + ':' + String(min%60).padStart(2,'0'); }

// Normalize any input to a nice display label
function niceFacility(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  if (FACILITY_NAME[v]) return FACILITY_NAME[v]; // already slug
  const slug = NAME_TO_SLUG[v];                  // from display -> slug
  return slug ? FACILITY_NAME[slug] : raw;
}

/* --------- Fetch helpers ---------- */
// attach admin name to each request so backend can log it
function authHeaders() {
  const name =
    localStorage.getItem('hogwartsId') ||
    localStorage.getItem('username') ||
    localStorage.getItem('role') || // last fallback
    '';
  return name ? { 'x-admin-name': name } : {};
}

async function getJSON(url) {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${res.statusText} – ${t}`);
  }
  return res.json().catch(() => ({}));
}

async function del(url) {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return true;
}

/* --------- Stats helpers ---------- */
function aggregateStats(rows) {
  const counts = new Map();
  for (const r of rows || []) {
    const key = niceFacility(r.facility);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + Number(r.count || 0));
  }
  return [...counts.entries()]
    .map(([facility, count]) => ({ facility, count }))
    .sort((a, b) => b.count - a.count);
}

/* --------- Admin guard ---------- */
(function earlyGuard() {
  const params = new URLSearchParams(location.search);
  if (params.get('admin') === '1') {
    localStorage.setItem('role', 'admin');
    localStorage.setItem('isAdmin', '1');
    if (history.replaceState) {
      history.replaceState(null, '', location.pathname + (location.hash || ''));
    }
  }
})();

/* ---------- ensure grid fields have the right classes for CSS layout ---------- */
function tagMaintenanceGridFields(){
  const grid = document.querySelector('.blocks-grid');
  if (!grid) return;
  const fields = grid.querySelectorAll('.field');
  fields[0]?.classList.add('facility'); // Facility
  fields[1]?.classList.add('date');     // Date
  fields[2]?.classList.add('start');    // Start
  fields[3]?.classList.add('end');      // End
  fields[4]?.classList.add('reason');   // Reason (textarea row)
  grid.querySelector('#addBlockBtn')?.classList.add('action'); // Add button
}

/* --------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  const isAdmin = localStorage.getItem('isAdmin') === '1' || role === 'admin';
  if (!isAdmin) {
    window.location.replace('/booking.html');
    return;
  }
  document.body.style.visibility = 'visible';

  // date picker: disallow past dates
  const blockDate = document.getElementById('blockDate');
  if (blockDate) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date(); // client local time
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Disallow picking any date before today
    blockDate.setAttribute('min', todayStr);

    // If empty or already in the past, snap to today
    if (!blockDate.value || blockDate.value < todayStr) {
      blockDate.value = todayStr;
      // If you populate Start/End options based on date, trigger change:
      blockDate.dispatchEvent(new Event('change'));
    }
  }

  // add the CSS layout classes to the grid items
  tagMaintenanceGridFields();

  // populate facility + time selects
  populateFacilitySelect();
  populateTimeSelects();

  // default block date = today
  const bd = document.getElementById('blockDate');
  if (bd && !bd.value) bd.valueAsDate = new Date();

  // header buttons
  document.getElementById('refresh')?.addEventListener('click', loadDashboard);
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
  });

  // block form events
  document.getElementById('addBlockBtn')?.addEventListener('click', submitBlockForm);

  // when facility/date change, recalc disabled times
  document.getElementById('blockFacility')?.addEventListener('change', updateDisabledTimes);
  document.getElementById('blockDate')?.addEventListener('change', updateDisabledTimes);

  loadDashboard().then(updateDisabledTimes);
});

/* --------- Loaders ---------- */
async function loadDashboard() {
  await Promise.all([
    loadTotalBookings(),
    loadStatsAndChart(),
    loadBookingsTable(),
    loadBlocksTable()
  ]);
}

async function loadTotalBookings() {
  try {
    const { count } = await getJSON(`${API_BASE}/booking-count`);
    document.getElementById('totalBookings').textContent = count ?? 0;
  } catch (e) {
    console.error('booking-count failed', e);
    document.getElementById('totalBookings').textContent = '—';
  }
}

async function loadStatsAndChart() {
  let raw = [];
  try {
    raw = await getJSON(`${API_BASE}/booking-stats`);
  } catch (e) {
    console.error('booking-stats failed', e);
  }
  const stats = aggregateStats(raw);
  const popular = document.getElementById('popularFacility');
  if (popular) popular.textContent = stats.length ? `${stats[0].facility} (${stats[0].count})` : '—';
  drawFacilityPie(stats);
}

async function loadBookingsTable(limit = 10) {
  try {
    const bookings = await getJSON(`${API_BASE}/bookings/recent?limit=${limit}`);
    const tbody = document.getElementById('bookingRows');
    if (!tbody) return;

    if (!Array.isArray(bookings) || bookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5">No recent bookings.</td></tr>`;
      return;
    }

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td>${b.id}</td>
        <td>${b.hogwartsId}</td>
        <td>${b.facility}</td>
        <td>${b.date}</td>
        <td>${b.timeSlot}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('bookings (recent) failed', e);
    const tbody = document.getElementById('bookingRows');
    if (tbody) tbody.innerHTML = `<tr><td colspan="5">Failed to load.</td></tr>`;
  }
}

/* --------- Maintenance Blocks ---------- */
async function loadBlocksTable() {
  const tbody = document.getElementById('blocksRows');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6">Loading…</td></tr>';

  try {
    // Active-only (backend already hides unblocked by default)
    const rows = await getJSON(`${API_BASE}/blocks`);

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">No active maintenance blocks.</td></tr>`;
      return;
    }

    tbody.innerHTML = '';
    rows.forEach(r => {
      // r.deleted_at should be null/undefined here, but guard anyway
      if (r.deleted_at) return;

      const dateStr = String(r.start_time).slice(0,10);
      const sh = String(r.start_time).slice(11,16);
      const eh = String(r.end_time).slice(11,16);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${niceFacility(r.facility)}</td>
        <td>${dateStr}</td>
        <td>${sh}–${eh}</td>
        <td>${r.reason || ''}</td>
        <td><button data-id="${r.id}" class="unblock-btn">Unblock</button></td>
      `;
      tbody.append(tr);
    });

    // Unblock handler
    tbody.onclick = async (e) => {
      const btn = e.target.closest('button[data-id]');
      if (!btn) return;

      const id = btn.getAttribute('data-id');
      const reason = prompt('Please enter a reason for unblocking this slot:');
      if (!reason || !reason.trim()) {
        alert('Unblock cancelled — a reason is required.');
        return;
      }

      const oldText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Unblocking…';

      try {
        await postJSON(`${API_BASE}/blocks/${id}/unblock`, { reason: reason.trim() });
        await loadBlocksTable();      // row disappears because it’s now unblocked
        await updateDisabledTimes();  // free up times
        alert('Maintenance block removed.');
      } catch (err) {
        alert('Failed to remove block: ' + err.message);
      } finally {
        if (btn && btn.isConnected) {
          btn.disabled = false;
          btn.textContent = oldText;
        }
      }
    };
  } catch (err) {
    console.error('loadBlocksTable error:', err);
    tbody.innerHTML = `<tr><td colspan="6" style="color:#f88">Failed to load blocks: ${err.message || err}</td></tr>`;
  }
}

/* --- Build facility select (value=slug, label=display) --- */
function populateFacilitySelect(){
  const sel = document.getElementById('blockFacility');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  sel.append(new Option('— Select Facility —', '', true, true));
  for (const [slug, label] of Object.entries(FACILITY_NAME)) {
    sel.append(new Option(label, slug, false, slug === prev));
  }
}

/* --- Build time selects and store base labels for later --- */
function populateTimeSelects() {
  const startSel = document.getElementById('blockStartSel');
  const endSel   = document.getElementById('blockEndSel');
  if (!startSel || !endSel) return;

  startSel.innerHTML = '';
  endSel.innerHTML   = '';

  const times = generateTimes(OPEN_TIME, CLOSE_TIME, STEP_MIN);
  const add = (sel, placeholder) => {
    const ph = new Option(placeholder, '', true, true);
    sel.append(ph);
    times.forEach(t => {
      const opt = new Option(t, t);
      opt.dataset.baseText = t;     // keep the clean text for restore
      sel.append(opt);
    });
  };
  add(startSel, '— Start —');
  add(endSel,   '— End —');

  // When start changes, pick the first valid end time after it
  startSel.addEventListener('change', () => {
    if (!startSel.value) return;
    const selMin = toMin(startSel.value);
    for (const opt of endSel.options) {
      if (!opt.value) continue;
      if (toMin(opt.value) > selMin && !opt.disabled) {
        endSel.value = opt.value;
        break;
      }
    }
  });
}

/* --- Grey/disable times that collide with student bookings OR admin blocks --- */
async function updateDisabledTimes(){
  const facSel  = document.getElementById('blockFacility');
  const dateInp = document.getElementById('blockDate');
  const startSel= document.getElementById('blockStartSel');
  const endSel  = document.getElementById('blockEndSel');
  if (!facSel || !dateInp || !startSel || !endSel) return;

  const slug = facSel.value;
  const date = dateInp.value;
  if (!slug || !date) { resetTimeDecor(startSel, endSel); return; }

  // bookings table uses DISPLAY name; blocks API uses SLUG
  const facilityDisplay = FACILITY_NAME[slug];

  let bookings = [], blocks = [];
  try {
    bookings = await getJSON(`${API_BASE}/bookings?facility=${encodeURIComponent(facilityDisplay)}&date=${encodeURIComponent(date)}`);
  } catch {}
  try {
    blocks = await getJSON(`${API_BASE}/blocks?facility=${encodeURIComponent(slug)}&date=${encodeURIComponent(date)}`);
  } catch {}

  // build minute ranges
  const bookedRanges = bookings.map(b => {
    const [s,e] = String(b.timeSlot).split('-');
    return { a: toMin(s), b: toMin(e) };
  });
  const blockedRanges = blocks.map(r => {
    const sh = String(r.start_time).slice(11,16);
    const eh = String(r.end_time).slice(11,16);
    return { a: toMin(sh), b: toMin(eh) };
  });

  // reset then mark
  resetTimeDecor(startSel, endSel);

  const mark = (opt) => {
    if (!opt.value) return;
    const m = toMin(opt.value);
    const isBooked  = bookedRanges.some(R => m >= R.a && m < R.b);
    const isBlocked = blockedRanges.some(R => m >= R.a && m < R.b);
    if (isBooked || isBlocked) {
      opt.disabled = true;
      const suffix = isBooked && isBlocked ? ' (unavailable)' : (isBooked ? ' (booked)' : ' (blocked)');
      opt.textContent = (opt.dataset.baseText || opt.textContent) + suffix;
      opt.style.textDecoration = 'line-through';
      opt.style.color = '#8b8b8b';
    }
  };

  [...startSel.options].forEach(mark);
  [...endSel.options].forEach(mark);

  // if current selections became invalid, clear them
  if (startSel.value && startSel.selectedOptions[0]?.disabled) startSel.value = '';
  if (endSel.value && endSel.selectedOptions[0]?.disabled)     endSel.value = '';
}

function resetTimeDecor(...sels){
  sels.forEach(sel => {
    [...sel.options].forEach(opt => {
      if (!opt.value) return;
      opt.disabled = false;
      if (opt.dataset.baseText) opt.textContent = opt.dataset.baseText;
      opt.style.textDecoration = 'none';
      opt.style.color = '';
    });
  });
}

function generateTimes(openHHMM, closeHHMM, stepMin) {
  const res = [];
  let t = toMin(openHHMM);
  const end = toMin(closeHHMM);
  while (t <= end) { res.push(fromMin(t)); t += stepMin; }
  return res;
}

async function submitBlockForm(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const facility = document.getElementById('blockFacility').value; // slug
  const date     = document.getElementById('blockDate').value;
  const start    = document.getElementById('blockStartSel').value;
  const end      = document.getElementById('blockEndSel').value;
  const reason   = document.getElementById('blockReason').value.trim();

  if (!facility || !date || !start || !end) {
    return alert('Please complete facility, date, start and end time.');
  }
  const startISO = `${date}T${start}:00`;
  const endISO   = `${date}T${end}:00`;
  if (endISO <= startISO) return alert('End time must be after start time.');

  try {
    await postJSON(`${API_BASE}/blocks`, {
      facility,           // slug
      start_time: startISO,
      end_time:   endISO,
      reason
    });

    // reset times/reason (keep facility/date for speed)
    document.getElementById('blockStartSel').value = '';
    document.getElementById('blockEndSel').value = '';
    document.getElementById('blockReason').value = '';

    await loadBlocksTable();
    await updateDisabledTimes();
    alert('Maintenance block added.');
  } catch (err) {
    alert('Failed to add block: ' + err.message);
  }
}

/* --------- Pie chart ---------- */
function drawFacilityPie(stats) {
  const labels = stats.map(s => s.facility);
  const data   = stats.map(s => s.count);

  const canvas = document.getElementById('facilityPie');
  const ctx = canvas.getContext('2d');

  if (facilityChart) { facilityChart.destroy(); facilityChart = null; }

  if (!data.length) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fceabb';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No bookings yet', canvas.width / 2, canvas.height / 2);
    return;
  }

  const palette = ['#ffdd57','#c77dff','#8ee4ff','#ffd7a8','#9effa1','#ff9ecb','#b5b8ff']
    .slice(0, labels.length);

  facilityChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data, backgroundColor: palette, borderColor: '#151527', borderWidth: 1 }]
    },
    options: {
      responsive: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#fceabb', boxWidth: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = data.reduce((a,b)=>a+b,0) || 1;
              const pct = Math.round((ctx.raw/total)*100);
              return `${ctx.label}: ${ctx.raw} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
