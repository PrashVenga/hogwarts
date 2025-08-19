async function injectLayout() {
  // Inject header
  const headerHolder = document.getElementById('site-header');
  if (headerHolder) {
    const r = await fetch('/partials/header.html', { cache: 'no-store' });
    if (r.ok) headerHolder.innerHTML = await r.text();
  }

  // (Optional) Inject footer only if it exists
  const footerHolder = document.getElementById('site-footer');
  if (footerHolder) {
    const f = await fetch('/partials/footer.html', { cache: 'no-store' });
    if (f.ok) footerHolder.innerHTML = await f.text();
    else footerHolder.remove();
  }

  await hydrateNav();  // toggle links + wire logout AFTER header is in DOM
}

async function hydrateNav() {
  try {
    const r = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' });
    const j = await r.json();
    const loggedIn = !!j.loggedIn || !!j.user;

    document.querySelectorAll('[data-auth="in"]')
      .forEach(el => el.style.display = loggedIn ? 'inline-block' : 'none');
    document.querySelectorAll('[data-auth="out"]')
      .forEach(el => el.style.display = loggedIn ? 'none' : 'inline-block');

    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.onclick = async (e) => {
        e.preventDefault();
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        // Force a fresh read of /api/auth/me and UI
        location.href = '/';
      };
    }
  } catch {
    // default to logged-out view if the check fails
    document.querySelectorAll('[data-auth="in"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('[data-auth="out"]').forEach(el => el.style.display = 'inline-block');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLayout);
} else {
  injectLayout();
}
