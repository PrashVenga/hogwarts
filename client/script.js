/* ===========================
   script.js (site-wide)
   - NO booking logic here; booking.js owns booking page
   =========================== */

// --- Admin auto-pivot (runs ASAP): if an admin lands on booking/index, go to staff
(function () {
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  const isAdmin = localStorage.getItem('isAdmin') === '1' || role === 'admin';

  const p = (location.pathname || '').toLowerCase();
  const isBookingLike =
    p.endsWith('/booking.html') ||
    p.endsWith('/index.html')   ||
    p === '/' ||
    p.endsWith('/');

  if (isAdmin && isBookingLike) {
    // use replace so back button won't pop back to booking
    window.location.replace('/staff.html');
  }
})();

console.log('✅ script.js loaded');

// ===========================
// Small helpers (site-wide)
// ===========================
const $ = (id) => document.getElementById(id) || null;

const isStaffPage = () => /\/staff\.html$/i.test(location.pathname);

const isAdmin = () => {
  const role = (localStorage.getItem('role') || '').trim().toLowerCase();
  return localStorage.getItem('isAdmin') === '1' || role === 'admin';
};

// Minimal fetch wrapper (used by login or other simple calls)
const API = {
  async get(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `GET ${url} failed`);
    return data;
  },
  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `POST ${url} failed`);
    return data;
  }
};

// ===========================
// Boot
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Page:', location.pathname);

  wireLoginHandler();
  wireLogoutButton();

  // Staff-page-only guard
  if (isStaffPage()) guardStaffPage();
});

// ===========================
// Logout (global)
// ===========================
function wireLogoutButton() {
  const btn = $('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    localStorage.removeItem('hogwartsId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
  });
}

// ===========================
// Staff guard (only on staff.html)
// ===========================
function guardStaffPage() {
  if (!isAdmin()) {
    console.warn('⛔ Not admin — redirecting to booking.html');
    window.location.replace('/booking.html');
  }
}

// ===========================
// Login (only on login page)
// ===========================
function wireLoginHandler() {
  const form = $('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id =
      ($('username')?.value ||
       $('hogwartsId')?.value || '').trim();
    const password = $('password')?.value || '';

    if (!id || !password) {
      alert('Enter your ID/Username and password.');
      return;
    }

    try {
      // Send both; server accepts either
      const data = await API.post('/api/login', { username: id, hogwartsId: id, password });

      // Save BEFORE redirect so guards don’t bounce you
      localStorage.setItem('username', id);
      localStorage.setItem('hogwartsId', id);
      localStorage.setItem('role', data.role || '');
      localStorage.setItem('isAdmin', data.isAdmin ? '1' : '0');

      // Follow server decision
      window.location.href = data.redirect;
    } catch (err) {
      console.error('Login error:', err);
      alert(err.message || 'Login failed');
    }
  });
}
