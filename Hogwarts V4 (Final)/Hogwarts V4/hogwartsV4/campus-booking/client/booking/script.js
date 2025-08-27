(() => {
  "use strict";
  if (window.__bookingScriptWired) return;
  window.__bookingScriptWired = true;

  // ---------- utils ----------
  const $  = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");

  // robust locator for the Book Now button
  function getBookBtn() {
    return document.getElementById("bookBtn")
        || document.getElementById("bookbtn")
        || document.querySelector('[data-action="book"]')
        || [...document.querySelectorAll("button, a, input[type='submit'], input[type='button']")]
             .find(n => /book\s*now/i.test(n.textContent || n.value || ""));
  }

  const todayYMD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // YYYY-MM-DD -> DD-MM-YYYY
  function ymdToDMY(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ""));
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (ymd || "");
  }

  // Normalize to YYYY-MM-DD from DD-MM-YYYY, YYYY-MM-DD, or MM/DD/YYYY
  function toYMD(val, inputEl) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;                 // 2025-08-25
    let m = (val || "").match(/^(\d{2})-(\d{2})-(\d{4})$/);          // 25-08-2025
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    m = (val || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);            // 08/25/2025
    if (m) return `${m[3]}-${m[1]}-${m[2]}`;
    const d = inputEl?.valueAsDate || (val ? new Date(val) : null);
    if (!d || isNaN(d)) {
      const t = new Date();
      return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // slot helpers
  const SLOT_LABELS = [
    "08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00",
    "12:00-13:00","13:00-14:00","14:00-15:00","15:00-16:00",
    "16:00-17:00","17:00-18:00","18:00-19:00","19:00-20:00",
    "20:00-21:00","21:00-22:00"
  ];
  const withSecs = (t) => (t && t.length === 5 ? `${t}:00` : (t || ""));

  // "08:00-09:00" -> "08:00:00-09:00:00"
  const labelToServer = (label) => {
    const [s, e] = label.split("-").map((x) => x.trim());
    return `${withSecs(s)}-${withSecs(e)}`;
  };

  // "HH:MM[-:SS]-HH:MM[-:SS]" -> "HH:MM:SS-HH:MM:SS" (no spaces)
  function normalizeSlot(s) {
    if (!s) return "";
    const t = String(s).replace(/\s/g, "");
    const [a, b] = t.split("-");
    const z = (x) => (x && x.length === 5 ? `${x}:00` : x || "");
    return `${z(a)}-${z(b)}`;
  }

  // Pretty "HH:MM(:SS)-HH:MM(:SS)" -> "HH:MM - HH:MM"
  function prettySlot(v) {
    const [s, e] = String(v || "").split("-");
    return `${(s||"").slice(0,5)} - ${(e||"").slice(0,5)}`;
  }

  // facility name (prefer visible text)
  function selectedFacilityName() {
    const sel = $("facility");
    if (!sel) return "";
    const opt = sel.options[sel.selectedIndex] || {};
    const val = (opt.value || "").trim();
    const txt = (opt.text || "").trim();
    if (!val || /select facility/i.test(txt)) return "";
    return txt || val;
  }

  // Tiny modal (falls back to alert if missing HTML)
  function showModal(title, html) {
    const m = document.getElementById("modal");
    if (!m) { alert((title ? title + ": " : "") + String(html || "").replace(/<[^>]+>/g,"")); return; }
    document.getElementById("modalTitle").textContent = title || "Notice";
    document.getElementById("modalBody").innerHTML = html || "";
    m.style.display = "flex";
  }
  (function wireModalClose(){
    const m = document.getElementById("modal");
    if (!m) return;
    document.getElementById("modalClose").onclick = () => m.style.display = "none";
    m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
  })();

  function setSlotsVisibility(show) {
    const box  = $("heatmapBox");
    const grid = $("slotGrid");
    const meta = $("hmMeta");
    if (box)  box.hidden  = !show;
    if (grid) grid.hidden = !show;
    if (!show && meta) meta.textContent = "";
  }

  // ---------- UI state ----------
  let selectedSlotLabel = null; // "08:00-09:00"


  function renderSlotButtons(booked, blocked) {
  const grid = document.getElementById("slotGrid");
  if (!grid) return;

  selectedSlotLabel = null;
  grid.innerHTML = "";
  const bookBtn = document.getElementById("bookBtn");
  if (bookBtn) bookBtn.disabled = true;

  const bookedSet  = new Set((booked  || []).map(normalizeSlot));
  const blockedSet = new Set((blocked || []).map(normalizeSlot));

  for (const label of SLOT_LABELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-btn";
    btn.textContent = label.replace("-", " - ");

    const fmt = labelToServer(label);
    const isBooked  = bookedSet.has(fmt);
    const isBlocked = blockedSet.has(fmt);

    if (isBooked)       btn.classList.add("booked");
    else if (isBlocked) btn.classList.add("blocked");
    else                btn.classList.add("available");

    // Allow selecting ANY state; bookNow() will decide what to do.
    btn.addEventListener("click", () => {
      selectedSlotLabel = label;
      grid.querySelectorAll(".slot-btn.selected").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");

      const sel = document.getElementById("timeSlot");
      if (sel) {
        sel.value = fmt;
        const opt = [...sel.options].find(o => o.value === fmt);
        if (opt) opt.dataset.state = isBooked ? "booked" : (isBlocked ? "blocked" : "free");
        sel.dispatchEvent(new Event("change", { bubbles:true }));
      }
      if (bookBtn) bookBtn.disabled = false;
    });

    grid.appendChild(btn);
  }
}

  // ---------- heatmap (based on hidden #timeSlot) ----------
function buildHeatmapSelect(booked, blocked) {
  const sel = $("timeSlot");
  if (!sel) return;

  sel.innerHTML = `<option value="">Select a time</option>`;

  const bookedSet  = new Set((booked  || []).map(normalizeSlot));
  const blockedSet = new Set((blocked || []).map(normalizeSlot));

  for (const label of SLOT_LABELS) {
    const [s, e] = label.split("-");
    const value = `${withSecs(s)}-${withSecs(e)}`; // "HH:MM:SS-HH:MM:SS"
    const o = document.createElement("option");
    o.value = value;
    o.textContent = label.replace("-", " - ");

    // DO NOT disable options; just store state
    if (bookedSet.has(value))       { o.dataset.state = "booked"; }
    else if (blockedSet.has(value)) { o.dataset.state = "blocked"; }
    else                            { o.dataset.state = "free"; }

    sel.appendChild(o);
  }

  renderHeatmap();
}


  function renderHeatmap() {
    if (typeof window.paintHeatmap === "function") {
      window.paintHeatmap();
    } else {
      drawSimpleHeatmap();
    }
  }

  function drawSimpleHeatmap() {
    const box = $("heatmapBox"),
          grid = $("hmGrid"),
          meta = $("hmMeta"),
          sel  = $("timeSlot");
    if (!box || !grid || !sel) return;

    const prettyLabel = v => (v || "").replace("-", " - ");
    const toDMY = ymd => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
      return m ? `${m[3]}-${m[2]}-${m[1]}` : ymd;
    };

    grid.innerHTML = "";
    const opts   = [...sel.options].filter(o => o.value);
    const counts = { free: 0, booked: 0, blocked: 0 };

    for (const o of opts) {
      const state = o.dataset.state || (o.disabled ? "booked" : "free");
      if (counts[state] != null) counts[state]++;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `hm-slot ${state}`;
      btn.textContent = prettyLabel(o.text || o.value);
      btn.disabled = state !== "free";

      if (state === "free") {
        btn.addEventListener("click", () => {
          [...grid.children].forEach(n => n.classList.remove("selected"));
          btn.classList.add("selected");
          sel.value = o.value;
          const book = getBookBtn();
          if (book) book.disabled = false;
        });
      }

      grid.appendChild(btn);
    }

    const dateRaw = $("date")?.value || "";
    const dmy     = toDMY(dateRaw);
    if (meta) {
      meta.textContent = `${dmy ? dmy + " • " : ""}AVAILABLE ${counts.free} • BOOKED ${counts.booked} • BLOCKED ${counts.blocked}`;
    }

    // do not auto-select anything here
    const bookBtn = getBookBtn();
    if (bookBtn) bookBtn.disabled = !sel.value;

    box.hidden = false;
  }

  function syncHeatmapSelection() {
    const sel = $("timeSlot"), grid = $("hmGrid");
    if (!sel || !grid) return;
    const label = [...sel.options].find(o => o.value === sel.value)?.text?.trim();
    grid.querySelectorAll(".hm-slot.selected").forEach(n => n.classList.remove("selected"));
    if (label) {
      const node = [...grid.children].find(n => n.textContent.trim() === label);
      node && node.classList.add("selected");
    }
  }

  function highlightGridSelection() {
    const grid = $("slotGrid");
    if (!grid || !selectedSlotLabel) return;
    grid.querySelectorAll(".slot-btn.selected").forEach(b => b.classList.remove("selected"));
    const target = [...grid.querySelectorAll(".slot-btn")]
      .find(b => b.textContent.trim().replace(/\s/g,"") === selectedSlotLabel.replace("-", " - ").replace(/\s/g,""));
    target && target.classList.add("selected");
  }

  // ---------- availability ----------
  async function loadAvailability() {
    const facility = selectedFacilityName();
    const dateEl = $("date");
    const dateY  = toYMD(dateEl?.value || "", dateEl);

    if (!facility) {
      // Clear selects and grids
      const sel = $("timeSlot");
      if (sel) sel.innerHTML = '<option value="">Select a facility first</option>';
      $("slotGrid")?.replaceChildren();
      setSlotsVisibility(false);
      const bb = getBookBtn(); if (bb) bb.disabled = true;
      return;
    }

    setSlotsVisibility(true);

    const qs = new URLSearchParams({ facility, date: dateY });
    const r = await fetch(`/api/availability?${qs.toString()}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) {
      alert('Failed to load availability: ' + (j.error || `HTTP ${r.status}`));
      return;
    }

    const booked  = j.booked  || [];
    const blocked = j.blocked || [];
    renderSlotButtons(booked, blocked);
    buildHeatmapSelect(booked, blocked);
  }


async function bookNow() {
  const hogwartsId = localStorage.getItem("hogwartsId");
  if (!hogwartsId) { location.assign("/login"); return; }

  const dateEl  = document.getElementById("date");
  const sel     = document.getElementById("timeSlot");
  const facility = selectedFacilityName();
  const dateY    = toYMD(dateEl?.value || "", dateEl);

  const selVal = sel?.value || "";
  if (!selVal) { showModal("Pick a time", "<p>Please select a time slot.</p>"); return; }

  // read selected option state (free | booked | blocked)
  let state = "free";
  if (sel) {
    const opt = [...sel.options].find(o => o.value === selVal);
    state = opt?.dataset?.state || (opt?.disabled ? "booked" : "free");
  }

  const [s, e] = String(selVal).split("-");
  const slotPretty = `${(s||'').slice(0,5)} - ${(e||'').slice(0,5)}`;
  const dateDMY    = ymdToDMY(dateY);

  if (state !== "free") {
    const reason = state === "booked" ? "already has a booking" : "is under maintenance";
    showModal(
      "Time Not Available",
      `<p><b>${facility}</b> on <b>${dateDMY}</b> at <b>${slotPretty}</b> ${reason}.</p>
       <p>Please choose another time.</p>`
    );
    return;
  }

  // proceed with booking for free slot
  const r = await fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hogwartsId, facility, date: dateY, timeSlot: selVal })
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok || j.ok === false) {
    showModal("Booking failed", `<p>${j.error || `HTTP ${r.status}`}</p>`);
    return;
  }

  showModal(
    "Booking Confirmed",
    `<p>Your booking for <b>${facility}</b> on <b>${dateDMY}</b> at <b>${slotPretty}</b> is confirmed.</p>
     <div style="display:flex;justify-content:flex-end;margin-top:10px">
       <button id="modalOk" style="all:unset;cursor:pointer;padding:6px 10px;border-radius:6px;background:linear-gradient(180deg,#ffe98f,#ffdd57);color:#111;font-weight:700">OK</button>
     </div>`
  );
  document.getElementById("modalOk")?.addEventListener("click", ()=>{
    const m=document.getElementById("modal"); if (m) m.style.display="none";
  });

  await loadAvailability();
}


  // ---------- book button finder / wiring ----------
  function wireBookButton() {
    const el = getBookBtn();
    if (!el || el._wired) return;
    el.addEventListener("click", (e)=>{ e.preventDefault(); bookNow(); });
    el._wired = true;
    if (el.tagName === "BUTTON") el.type = "button"; // avoid form submit
    el.disabled = true; // until a free slot is selected
  }

  // ---------- boot ----------
  document.addEventListener("DOMContentLoaded", () => {
    const dateEl = $("date");
    if (dateEl) {
      const t = todayYMD();
      dateEl.min = t;
      if (!dateEl.value || dateEl.value < t) dateEl.value = t;
    }

    // Hide slot UI until a real facility is chosen
    if (!selectedFacilityName()) {
      setSlotsVisibility(false);
      const sel = $("timeSlot");
      if (sel) sel.innerHTML = '<option value="">Select a facility first</option>';
    }

    $("facility")?.addEventListener("change", loadAvailability);
    $("date")?.addEventListener("change", loadAvailability);
    $("timeSlot")?.addEventListener("change", () => {
      syncHeatmapSelection();
      const sel = $("timeSlot");
      const opt = [...sel.options].find(o => o.value === sel.value);
      const state = opt?.dataset?.state || (opt?.disabled ? "booked" : "free");
      if (opt && state === "free") {
        selectedSlotLabel = opt.text.trim().replace(" - ", "-");
        highlightGridSelection();
        const b = getBookBtn(); if (b) b.disabled = false;
      } else {
        const b = getBookBtn(); if (b) b.disabled = true;
      }
    });

    wireBookButton();

    // only auto-fetch if a real facility is preselected
    if (selectedFacilityName()) loadAvailability();
  });
})();


// ─── Donut breakdown with hover + tooltip (used on Admin KPI) ───────────────
(() => {
  window.hogwarts = window.hogwarts || {};

  // evenly-spaced Hogwarts-y HSL palette (normal + hover)
  function makePalette(n) {
    const out = [];
    for (let i = 0; i < Math.max(1, n); i++) {
      const hue = Math.round((360 / Math.max(1, n)) * i);
      out.push({
        normal: `hsl(${hue} 70% 55%)`,
        hover:  `hsl(${hue} 70% 68%)`,
      });
    }
    return out;
  }

  // fetch rows [{facility, count}] from /api/booking-stats
  async function fetchStats() {
    try {
      const r = await fetch("/api/booking-stats");
      const j = await r.json();
      if (r.ok && j && Array.isArray(j.rows)) return j.rows;
    } catch {}
    return [];
  }

  function ensureLegend(canvas, id) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.style.marginTop = "8px";
      el.style.display = "grid";
      el.style.gap = "6px";
      el.style.justifyItems = "center";
      canvas.parentNode.appendChild(el);
    }
    return el;
  }

  function ensureTip(canvas) {
    if (canvas._tip) return canvas._tip;
    const tip = document.createElement("div");
    tip.style.position = "fixed";
    tip.style.pointerEvents = "none";
    tip.style.padding = "6px 8px";
    tip.style.border = "1px solid rgba(255,221,87,.5)";
    tip.style.background = "rgba(11,15,26,.95)";
    tip.style.color = "#f0e6c8";
    tip.style.borderRadius = "8px";
    tip.style.font = '600 12px "Cinzel Decorative", serif';
    tip.style.boxShadow = "0 10px 24px rgba(0,0,0,.3),0 0 12px rgba(255,221,87,.25)";
    tip.style.zIndex = "10060";
    tip.style.opacity = "0";
    tip.style.transition = "opacity .12s ease";
    document.body.appendChild(tip);
    canvas._tip = tip;
    return tip;
  }

  window.hogwarts.loadBreakdown = async function loadBreakdown(opts = {}) {
    const canvas = document.getElementById(opts.canvasId || "facilityPie");
    if (!canvas) return;

    // data
    const rows = await fetchStats();
    const labels = rows.map(r => r.facility);
    const values = rows.map(r => Number(r.count) || 0);
    const total  = values.reduce((a, b) => a + b, 0);

    // palette (legend OFF by default)
    const palette = makePalette(labels.length);

    if (opts.showLegend) {
      const legend = ensureLegend(canvas, (opts.legendId || canvas.id + "Legend"));
      legend.innerHTML = "";
      rows.forEach((r, i) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        row.innerHTML =
          `<span style="width:10px;height:10px;border-radius:2px;background:${palette[i]?.normal};display:inline-block"></span>
           <span style="opacity:.9">${r.facility}</span>
           <span style="margin-left:6px;opacity:.7">— ${r.count}</span>`;
        legend.appendChild(row);
      });
    } else {
      const ex = document.getElementById(opts.legendId || canvas.id + "Legend");
      if (ex) ex.remove();
    }

    // canvas sizing / crispness
    const DPR = window.devicePixelRatio || 1;
    const cssW = canvas.width, cssH = canvas.height;  // authoring width/height
    if (!canvas.style.width) { canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px"; }
    canvas.width  = Math.round(cssW * DPR);
    canvas.height = Math.round(cssH * DPR);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const w = cssW, h = cssH;
    const cx = w / 2, cy = h / 2;
    const rOuter = Math.min(w, h) / 2 - 8;
    const rInner = Math.max(26, rOuter * 0.62); // thickness ~38%
    const sum = total || 1;

    function draw(highlight = -1) {
      ctx.clearRect(0, 0, w, h);
      let a0 = -Math.PI / 2; // start from top
      for (let i = 0; i < Math.max(1, values.length); i++) {
        const v = values[i] ?? sum;                    // single grey ring when no data
        const frac = (values.length ? v : sum) / sum;
        const a1 = a0 + frac * Math.PI * 2;
        const mid = (a0 + a1) / 2;
        const bumped = (i === highlight) ? 6 : 0;
        const ox = Math.cos(mid) * bumped;
        const oy = Math.sin(mid) * bumped;

        ctx.beginPath();
        ctx.moveTo(cx + ox, cy + oy);
        ctx.arc(cx + ox, cy + oy, rOuter + (i === highlight ? 2 : 0), a0 + 0.012, a1 - 0.012);
        ctx.arc(cx + ox, cy + oy, rInner, a1 - 0.012, a0 + 0.012, true);
        ctx.closePath();

        let fill = palette[i]?.normal || "#c77dff";
        if (i === highlight) fill = palette[i]?.hover || "#d9a9ff";
        if (!values.length)  fill = "#394559"; // empty state ring

        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = "rgba(0,0,0,.35)"; // subtle divider
        ctx.lineWidth = 1;
        ctx.stroke();

        a0 = a1;
      }

      // center label
      ctx.fillStyle = "#f0e6c8";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = '700 14px "Cinzel Decorative", serif';
      if (highlight > -1 && labels[highlight]) {
        ctx.fillText(labels[highlight].toUpperCase(), cx, cy - 8);
        ctx.font = '700 18px "Cinzel Decorative", serif';
        const val = values[highlight];
        const pct = Math.round((val / (total || 1)) * 100);
        ctx.fillText(`${val} (${pct}%)`, cx, cy + 10);
      } else {
        ctx.fillText("TOTAL", cx, cy - 8);
        ctx.font = '700 22px "Cinzel Decorative", serif';
        ctx.fillText(String(total || 0), cx, cy + 12);
      }
    }

    function pickSlice(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left - canvas.clientLeft;
      const y = clientY - rect.top  - canvas.clientTop;
      const dx = x - w / 2, dy = y - h / 2;
      const dist = Math.hypot(dx, dy);
      if (dist < rInner || dist > rOuter + 3) return -1;

      let ang = Math.atan2(dy, dx) - (-Math.PI / 2); // align with a0
      while (ang < 0) ang += Math.PI * 2;

      let acc = 0;
      for (let i = 0; i < values.length; i++) {
        const span = (values[i] / sum) * Math.PI * 2;
        if (ang >= acc && ang < acc + span) return i;
        acc += span;
      }
      return -1;
    }

    const tip = ensureTip(canvas);
    let hi = -1;

    canvas.onmousemove = (e) => {
      const i = pickSlice(e.clientX, e.clientY);
      if (i !== hi) { hi = i; draw(hi); }
      if (i > -1) {
        const val = values[i], pct = Math.round((val / (total || 1)) * 100);
        tip.textContent = `${labels[i]}: ${val} (${pct}%)`;
        tip.style.left = (e.clientX + 12) + "px";
        tip.style.top  = (e.clientY + 12) + "px";
        tip.style.opacity = "1";
      } else {
        tip.style.opacity = "0";
      }
    };
    canvas.onmouseleave = () => { hi = -1; draw(-1); tip.style.opacity = "0"; };

    draw(-1);
  };
})();
