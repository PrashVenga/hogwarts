// client/booking/script.js
const API = ""; // same-origin

// ==== Time slots (built from the <select>) ==================================
let TIME_SLOTS = [];
function buildTimeSlotArrayFromSelect(sel) {
  TIME_SLOTS = [...sel.options].map(o => o.value).filter(Boolean);
}

// ==== Mini heatmap (green/free, red/booked) =================================
function renderHeatmap(bookedSet) {
  const host = document.getElementById('availabilityGrid');
  if (!host) return;

  // Build table
  const table = document.createElement('table');
  table.className = 'heatmap';

  // Head row
  table.innerHTML = `
    <thead>
      <tr>
        <th>Time</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  TIME_SLOTS.forEach(slot => {
    const tr = document.createElement('tr');

    // Time cell
    const tdTime = document.createElement('td');
    tdTime.className = 'heatmap-slot';
    tdTime.textContent = slot.replace(/-/g, '–');

    // Status cell
    const tdStatus = document.createElement('td');
    tdStatus.className = 'heatmap-cell';

    const pill = document.createElement('span');
    const isBooked = bookedSet.has(slot);
    pill.className = 'status-pill ' + (isBooked ? 'status-booked' : 'status-free');
    pill.textContent = isBooked ? 'Booked' : 'Free';

    tdStatus.appendChild(pill);

    tr.appendChild(tdTime);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });

  host.innerHTML = '';
  host.appendChild(table);
}


// ==== Toast (supports { placement: 'below' }) ===============================
function showToast(message, isError = false, opts = {}) {
  const placeBelow = opts.placement === "below";

  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }

  if (placeBelow) {
    const host = document.querySelector(".booking-container") || document.body;
    if (el.parentElement !== host) host.appendChild(el);
    el.classList.add("toast--below");
  } else {
    if (el.parentElement !== document.body) document.body.appendChild(el);
    el.classList.remove("toast--below");
  }

  el.textContent = message;
  el.classList.toggle("error", !!isError);
  void el.offsetWidth; // reflow to restart transition
  el.classList.add("show");

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

// ==== Helpers ===============================================================
const toISO  = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(d).toISOString().slice(0,10));
const toHHMM = (t) => (t || "").slice(0,5);
const normSlot = (s) => {
  const [a, b] = String(s || "").split("-");
  return `${toHHMM(a)}-${toHHMM(b)}`;
};
const currentHogwartsId = () =>
  localStorage.getItem("hogwartsId") || localStorage.getItem("username");

// ==== Main ==================================================================
document.addEventListener("DOMContentLoaded", () => {
  const form        = document.getElementById("bookingForm");
  const selFacility = document.getElementById("facility");
  const inputDate   = document.getElementById("bookingDate");
  const selTime     = document.getElementById("timeSlot");
  const resultEl    = document.getElementById("bookingResult");
  const logoutBtn   = document.getElementById("logoutBtn");

  if (!form || !selFacility || !inputDate || !selTime) {
    console.error("Booking page elements not found. Check index.html.");
    return;
  }

  // Build TIME_SLOTS from the dropdown once
  buildTimeSlotArrayFromSelect(selTime);

  // Default date = today
  inputDate.value = new Date().toISOString().slice(0, 10);

  // Load availability and disable booked slots + draw heatmap
  async function loadAvailability() {
    resultEl.textContent = "";
    const facility = selFacility.value;  // numeric ID or name; server accepts both
    const date     = toISO(inputDate.value);
    if (!facility || !date) return;

    try {
      const r = await fetch(
        `${API}/api/availability?facility=${encodeURIComponent(facility)}&date=${encodeURIComponent(date)}`
      );
      if (!r.ok) throw new Error(`availability ${r.status}`);

      const data   = await r.json();
      const booked = new Set((data.booked || []).map(normSlot));

      // Disable already booked options in the select
      for (const opt of selTime.options) {
        if (!opt.value) continue;
        opt.disabled = booked.has(opt.value);
      }

      // Draw the green/red column
      renderHeatmap(booked);
    } catch (e) {
      console.error(e);
      resultEl.textContent = "ERROR LOADING AVAILABILITY";
      showToast("Error loading availability", true, { placement: "below" });
    }
  }

  // Submit booking
  async function submitBooking(e) {
    e.preventDefault();
    resultEl.textContent = "";

    const facility   = selFacility.value;   // your HTML uses numeric IDs
    const date       = toISO(inputDate.value);
    const timeSlot   = selTime.value;
    const hogwartsId = currentHogwartsId();

    if (!hogwartsId) {
      resultEl.textContent = "Please log in again.";
      window.location.href = "../login/index.html";
      return;
    }
    if (!facility || !date || !timeSlot) {
      resultEl.textContent = "Please pick facility, date and time.";
      showToast("Pick facility, date and time", true, { placement: "below" });
      return;
    }

    try {
      const r = await fetch(`${API}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hogwartsId, facility, date, timeSlot }),
      });

      const payload = await r.json().catch(() => ({}));

      if (r.status === 409) {
        resultEl.textContent = "❌ Time slot already booked.";
        showToast("Time slot already booked", true, { placement: "below" });
        return;
      }
      if (!r.ok) throw new Error(payload?.error || "Booking failed");

      // Success UI
      resultEl.textContent = `✅ BOOKING CONFIRMED! (ID: ${payload.bookingId})`;
      showToast("✅ Booking successful", false, { placement: "below" });

      // Update the selected option's text to reflect booking
      const chosen = [...selTime.options].find(o => o.value === timeSlot);
      if (chosen && !/\(booked\)$/i.test(chosen.textContent)) {
        chosen.textContent = `${chosen.value} (booked)`;
      }

      // Refresh availability/heatmap so the slot turns red
      loadAvailability();
    } catch (err) {
      console.error(err);
      resultEl.textContent = err.message || "Booking failed";
      showToast(err.message || "Booking failed", true, { placement: "below" });
    }
  }

  // Wire up
  form.addEventListener("submit", submitBooking);
  selFacility.addEventListener("change", () => {
    selTime.selectedIndex = 0; // reset selection when facility changes
    loadAvailability();
  });
  inputDate.addEventListener("change", () => {
    selTime.selectedIndex = 0; // reset selection when date changes
    loadAvailability();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "../login/index.html";
    });
  }

  // Initial fetch
  loadAvailability();
});
