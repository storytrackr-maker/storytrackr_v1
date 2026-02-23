/* ── StoryTrackr App SPA ── */
'use strict';

// ── State ─────────────────────────────────────────────────────
const state = {
  user:      null,
  isDemoMode: false,
  roster:    null,   // { hs: { core:[], loose:[], fringe:[] }, ms:{...} }
  activity:  null,
  settings:  null,
  loading:   true,
  navOpen:   false,
};

// ── API helper ────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`/api/${path}`, opts);
  const ct  = res.headers.get('Content-Type') || '';
  if (ct.includes('application/json')) return res.json();
  return { ok: res.ok, status: res.status };
}

// ── Router ────────────────────────────────────────────────────
function getRoute() {
  return window.location.pathname || '/';
}

function navigate(path, replace = false) {
  if (replace) history.replaceState({}, '', path);
  else         history.pushState({}, '', path);
  render();
}

window.addEventListener('popstate', render);

// ── Root render ───────────────────────────────────────────────
async function render() {
  const path = getRoute();

  // Public routes (no auth needed)
  if (path === '/login')          return renderLogin();
  if (path === '/signup')         return renderSignup();
  if (path === '/forgot-password')return renderForgotPassword();
  if (path === '/reset-password') return renderResetPassword();

  // Demo init route
  if (path === '/demo') return renderDemoInit();

  // Require auth for all other routes
  if (!state.user) {
    await loadUser();
    if (!state.user) return navigate('/login', true);
  }

  // Route to views
  if (path === '/select-org')         return renderSelectOrg();
  if (path === '/onboarding')         return renderOnboarding();
  if (path === '/dashboard' || path === '/') return renderDashboard();
  if (path.startsWith('/students'))   return renderStudentsView();
  if (path === '/notes')              return renderNotes();
  if (path === '/settings')           return renderSettings();
  if (path === '/billing')            return renderBilling();
  if (path === '/brain-dump')         return renderBrainDump();

  navigate('/dashboard', true);
}

// ── Load current user ─────────────────────────────────────────
async function loadUser() {
  try {
    const data = await api('GET', 'me');
    state.user      = data.user || null;
    state.isDemoMode = !!data.isDemoMode;
  } catch (_) {
    state.user = null;
  }
}

// ── App shell ─────────────────────────────────────────────────
function appShell(content, activePage) {
  const u = state.user;
  const initials = u?.name ? u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';

  return `
    <div class="app-layout">
      ${state.isDemoMode ? `
        <div class="demo-banner">
          🎭 Demo mode (read-only) — <a href="https://storytrackr.app/signup">Start free trial</a>
        </div>` : ''}
      <header class="app-header">
        <span class="app-header-logo">StoryTrackr</span>
        <nav class="app-header-nav">
          ${navBtn('dashboard','📊 Dashboard', activePage)}
          ${navBtn('students','👥 Students', activePage)}
          ${navBtn('notes','📝 Notes', activePage)}
          ${navBtn('brain-dump','🧠 Brain Dump', activePage)}
          ${navBtn('settings','⚙️ Settings', activePage)}
        </nav>
        <div class="header-actions">
          <button class="avatar-btn" onclick="toggleUserMenu(this, event)" title="${u?.name || 'Profile'}">${initials}</button>
        </div>
      </header>
      <main class="app-main" id="main-content">
        ${content}
      </main>
      <nav class="bottom-nav">
        ${mobileNavBtn('dashboard','dashboard','📊')}
        ${mobileNavBtn('students','students','👥')}
        ${mobileNavBtn('notes','notes','📝')}
        ${mobileNavBtn('brain-dump','brain-dump','🧠')}
        ${mobileNavBtn('settings','settings','⚙️')}
      </nav>
      <div id="toast-container" class="toast-container"></div>
    </div>`;
}

function navBtn(page, label, active) {
  return `<button class="header-nav-btn ${active === page ? 'active' : ''}" onclick="navigate('/${page}')">${label}</button>`;
}
function mobileNavBtn(page, key, icon) {
  const active = getRoute().startsWith('/' + key) || (key === 'dashboard' && getRoute() === '/');
  return `<button class="bottom-nav-btn ${active ? 'active' : ''}" onclick="navigate('/${page}')">${icon}<span>${page.charAt(0).toUpperCase()+page.slice(1)}</span></button>`;
}

// ── User menu ─────────────────────────────────────────────────
window.toggleUserMenu = function(btn, e) {
  e.stopPropagation();
  const existing = document.getElementById('user-menu');
  if (existing) { existing.remove(); return; }
  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.style.cssText = `position:fixed;top:52px;right:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:.5rem;min-width:180px;z-index:100;box-shadow:var(--shadow)`;
  const u = state.user;
  menu.innerHTML = `
    <div style="padding:.6rem .8rem .4rem;border-bottom:1px solid var(--border);margin-bottom:.4rem">
      <div style="font-weight:600;font-size:.9rem">${esc(u?.name||'')}</div>
      <div style="font-size:.8rem;color:var(--muted)">${esc(u?.email||'Demo')}</div>
      <div style="margin-top:.3rem">${roleBadge(u?.role)}</div>
    </div>
    <button class="btn btn-ghost btn-sm w-full" style="justify-content:flex-start" onclick="navigate('/settings')">⚙️ Settings</button>
    ${!state.isDemoMode ? `<button class="btn btn-ghost btn-sm w-full" style="justify-content:flex-start" onclick="navigate('/billing')">💳 Billing</button>` : ''}
    <hr class="divider">
    ${state.isDemoMode
      ? `<a class="btn btn-primary btn-sm w-full" href="https://storytrackr.app/signup">Start Free Trial</a>`
      : `<button class="btn btn-ghost btn-sm w-full" style="justify-content:flex-start;color:var(--red)" onclick="doLogout()">↩ Log out</button>`}
  `;
  document.body.appendChild(menu);
  document.addEventListener('click', () => menu.remove(), { once: true });
};

function roleBadge(role) {
  const map = { admin: 'badge-purple', leader: 'badge-blue', approved: 'badge-green', demo: 'badge-yellow' };
  return `<span class="badge ${map[role]||'badge-gray'}">${role||'user'}</span>`;
}

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type = 'info', ms = 3000) {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

// ── Demo guard ────────────────────────────────────────────────
function demoBlock(action) {
  if (state.isDemoMode) { toast('Demo is read-only', 'error'); return true; }
  return false;
}

// ── Logout ────────────────────────────────────────────────────
window.doLogout = async function() {
  await api('POST', 'auth/logout');
  state.user = null;
  navigate('/login', true);
};

// ── Escape helper ─────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mount(html) {
  document.getElementById('root').innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// AUTH VIEWS
// ═══════════════════════════════════════════════════════════════

function renderLogin() {
  const params = new URLSearchParams(window.location.search);
  const notice = params.get('notice');
  mount(`
    <div class="auth-page">
      <div class="auth-card card card-body">
        <div class="auth-logo">StoryTrackr</div>
        ${notice === 'reset-ok' ? `<div style="background:#14532d;color:#86efac;padding:.75rem;border-radius:var(--radius-sm);font-size:.875rem;margin-bottom:1rem">Password reset — please log in.</div>` : ''}
        <h1 class="auth-title">Welcome back</h1>
        <p class="auth-sub">Sign in to your account</p>
        <form class="form-stack" id="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" name="password" placeholder="••••••••••" required autocomplete="current-password">
          </div>
          <div id="login-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-full" type="submit" id="login-btn">Sign in</button>
        </form>
        <div class="auth-footer">
          <a href="/forgot-password" onclick="navigate('/forgot-password');return false;">Forgot password?</a>
          &nbsp;·&nbsp;
          <a href="/signup" onclick="navigate('/signup');return false;">Create account</a>
        </div>
        <hr class="divider">
        <div style="text-align:center">
          <button class="btn btn-secondary btn-sm" onclick="startDemo()">Try Demo instead</button>
        </div>
      </div>
    </div>
  `);

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const err = document.getElementById('login-error');
    const fd  = new FormData(e.target);
    btn.disabled = true; btn.textContent = 'Signing in…';
    err.classList.add('hidden');
    try {
      const data = await api('POST', 'auth/login', { email: fd.get('email'), password: fd.get('password') });
      if (data.success) {
        state.user = data.user;
        state.isDemoMode = false;
        if (data.requireOrgPicker) navigate('/select-org', true);
        else navigate('/dashboard', true);
      } else {
        err.textContent = data.error || 'Login failed';
        err.classList.remove('hidden');
      }
    } catch (_) {
      err.textContent = 'Network error. Please try again.';
      err.classList.remove('hidden');
    }
    btn.disabled = false; btn.textContent = 'Sign in';
  });
}

function renderSignup() {
  mount(`
    <div class="auth-page">
      <div class="auth-card card card-body">
        <div class="auth-logo">StoryTrackr</div>
        <h1 class="auth-title">Create your account</h1>
        <p class="auth-sub">Start tracking your students today</p>
        <form class="form-stack" id="signup-form">
          <div class="form-group">
            <label class="form-label">Your name</label>
            <input class="form-input" type="text" name="name" placeholder="Alex Johnson" required>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" name="password" placeholder="10+ chars, upper/lower/number" required>
          </div>
          <div class="form-group">
            <label class="form-label">Ministry / Organization name <span style="color:var(--muted)">(optional)</span></label>
            <input class="form-input" type="text" name="orgName" placeholder="Westside Students">
            <span class="form-hint">Leave blank if joining an existing org via invite link.</span>
          </div>
          <div id="signup-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-full" type="submit" id="signup-btn">Create account</button>
        </form>
        <div class="auth-footer">
          Already have an account? <a href="/login" onclick="navigate('/login');return false;">Sign in</a>
        </div>
        <p style="font-size:.75rem;color:var(--muted);text-align:center;margin-top:.75rem">
          By signing up you agree to our <a href="https://storytrackr.app/terms.html" target="_blank">Terms</a> and <a href="https://storytrackr.app/privacy.html" target="_blank">Privacy Policy</a>.
        </p>
      </div>
    </div>
  `);

  document.getElementById('signup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('signup-btn');
    const err = document.getElementById('signup-error');
    const fd  = new FormData(e.target);
    btn.disabled = true; btn.textContent = 'Creating…';
    err.classList.add('hidden');
    try {
      const data = await api('POST', 'auth/signup', {
        name: fd.get('name'), email: fd.get('email'),
        password: fd.get('password'), orgName: fd.get('orgName') || undefined,
      });
      if (data.success) {
        if (data.onboarding) {
          state.user = data.user;
          navigate('/onboarding', true);
        } else {
          navigate('/login?notice=pending');
          toast('Account submitted for approval. An admin will review shortly.', 'info', 5000);
        }
      } else {
        err.textContent = data.error || 'Signup failed';
        err.classList.remove('hidden');
      }
    } catch (_) { err.textContent = 'Network error.'; err.classList.remove('hidden'); }
    btn.disabled = false; btn.textContent = 'Create account';
  });
}

function renderForgotPassword() {
  mount(`
    <div class="auth-page">
      <div class="auth-card card card-body">
        <div class="auth-logo">StoryTrackr</div>
        <h1 class="auth-title">Reset password</h1>
        <p class="auth-sub">Enter your email and we'll send a reset link.</p>
        <form class="form-stack" id="fp-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" name="email" placeholder="you@example.com" required>
          </div>
          <div id="fp-msg" class="hidden" style="font-size:.875rem;padding:.75rem;border-radius:var(--radius-sm)"></div>
          <button class="btn btn-primary btn-full" type="submit" id="fp-btn">Send reset link</button>
        </form>
        <div class="auth-footer"><a href="/login" onclick="navigate('/login');return false;">← Back to login</a></div>
      </div>
    </div>
  `);
  document.getElementById('fp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('fp-btn');
    const msg = document.getElementById('fp-msg');
    btn.disabled = true; btn.textContent = 'Sending…';
    const data = await api('POST', 'auth/forgot-password', { email: new FormData(e.target).get('email') });
    msg.textContent = data.message || 'If that account exists, a reset link has been sent.';
    msg.style.background = 'var(--surface-2)'; msg.style.color = 'var(--text-2)';
    msg.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Send reset link';
  });
}

function renderResetPassword() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  mount(`
    <div class="auth-page">
      <div class="auth-card card card-body">
        <div class="auth-logo">StoryTrackr</div>
        <h1 class="auth-title">Set new password</h1>
        <form class="form-stack" id="rp-form">
          <div class="form-group">
            <label class="form-label">New password</label>
            <input class="form-input" type="password" name="newPassword" placeholder="10+ chars, upper/lower/number" required>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm password</label>
            <input class="form-input" type="password" name="confirmPassword" placeholder="Same as above" required>
          </div>
          <div id="rp-error" class="form-error hidden"></div>
          <button class="btn btn-primary btn-full" type="submit" id="rp-btn">Set password</button>
        </form>
      </div>
    </div>
  `);
  document.getElementById('rp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('rp-btn');
    const err = document.getElementById('rp-error');
    const fd  = new FormData(e.target);
    btn.disabled = true; btn.textContent = 'Saving…';
    const data = await api('POST', 'auth/reset-password', { token, newPassword: fd.get('newPassword'), confirmPassword: fd.get('confirmPassword') });
    if (data.success) { navigate('/login?notice=reset-ok', true); }
    else { err.textContent = data.error || 'Reset failed'; err.classList.remove('hidden'); btn.disabled = false; btn.textContent = 'Set password'; }
  });
}

// ═══════════════════════════════════════════════════════════════
// DEMO INIT
// ═══════════════════════════════════════════════════════════════

async function renderDemoInit() {
  const token = new URLSearchParams(window.location.search).get('token');
  if (!token) {
    // No token — try to load existing demo session
    await loadUser();
    if (state.user?.role === 'demo' || state.isDemoMode) {
      navigate('/dashboard', true);
      return;
    }
    navigate('/login', true);
    return;
  }
  mount(`<div class="auth-page"><div class="card card-body text-center"><div class="auth-logo">StoryTrackr</div><p class="text-muted">Loading demo…</p><div class="spinner" style="margin:.5rem auto"></div></div></div>`);
  try {
    // Exchange token for session cookie
    const data = await api('POST', 'demo-session/redeem', { token });
    if (data.ok) {
      // Remove token from URL
      history.replaceState({}, '', '/demo');
      await loadUser();
      navigate('/dashboard', true);
    } else {
      mount(`<div class="auth-page"><div class="card card-body text-center"><h2>Demo session expired</h2><p class="text-muted mt-2">Please start a new demo from the marketing site.</p><a href="https://storytrackr.app" class="btn btn-primary mt-3">Back to StoryTrackr</a></div></div>`);
    }
  } catch (_) {
    mount(`<div class="auth-page"><div class="card card-body text-center"><h2>Something went wrong</h2><a href="https://storytrackr.app" class="btn btn-primary mt-3">Back to StoryTrackr</a></div></div>`);
  }
}

window.startDemo = async function() {
  try {
    const res  = await fetch('/api/demo-session', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.redirect) window.location.href = data.redirect;
  } catch (_) { toast('Could not start demo', 'error'); }
};

// ═══════════════════════════════════════════════════════════════
// SELECT ORG
// ═══════════════════════════════════════════════════════════════

function renderSelectOrg() {
  const orgs = state.user?.orgIds || [];
  mount(appShell(`
    <div class="page-sm" style="padding-top:3rem">
      <h1>Choose your organization</h1>
      <p class="text-muted mt-2 mb-3">You belong to multiple organizations. Pick one to continue.</p>
      <div class="org-picker">
        ${orgs.map(id => `
          <div class="org-option" onclick="selectOrg('${esc(id)}')">
            <div class="org-icon">🏛️</div>
            <div><div class="font-bold">${esc(id)}</div><div class="text-sm text-muted">Organization</div></div>
          </div>
        `).join('')}
      </div>
    </div>
  `, 'dashboard'));
}

window.selectOrg = async function(orgId) {
  // For now, just navigate — in full impl would call API to set session orgId
  navigate('/dashboard', true);
};

// ═══════════════════════════════════════════════════════════════
// ONBOARDING WIZARD
// ═══════════════════════════════════════════════════════════════

let onboardStep = 1;
const onboardData = {};

function renderOnboarding() {
  const steps = ['Create org', 'Invite leaders', 'Import roster', 'Done'];
  const dots  = steps.map((s, i) => `<div class="step-dot ${i < onboardStep-1 ? 'done' : i === onboardStep-1 ? 'active' : ''}" title="${s}"></div>`).join('');

  let content = '';
  if (onboardStep === 1) content = onboardStep1();
  if (onboardStep === 2) content = onboardStep2();
  if (onboardStep === 3) content = onboardStep3();
  if (onboardStep === 4) content = onboardStep4();

  mount(`
    <div class="onboarding-page">
      <div class="onboarding-header">
        <div class="auth-logo" style="text-align:left;margin-bottom:1rem">StoryTrackr</div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-muted">Step ${onboardStep} of 4: ${steps[onboardStep-1]}</span>
          <div class="steps-indicator">${dots}</div>
        </div>
      </div>
      <div class="onboarding-card card card-body">${content}</div>
    </div>
  `);
}

function onboardStep1() {
  return `
    <h2>Set up your ministry</h2>
    <p class="text-muted mt-1 mb-3">Tell us about your organization so we can customize StoryTrackr for you.</p>
    <form class="form-stack" onsubmit="onboard1Submit(event)">
      <div class="form-group">
        <label class="form-label">Ministry name *</label>
        <input class="form-input" name="ministryName" value="${esc(onboardData.ministryName||state.user?.orgId||'')}" placeholder="Westside Students" required>
      </div>
      <div class="form-group">
        <label class="form-label">Campus / Location</label>
        <input class="form-input" name="campus" value="${esc(onboardData.campus||'')}" placeholder="Main Campus">
      </div>
      <div class="form-group">
        <label class="form-label">Timezone</label>
        <select class="form-input form-select" name="timezone">
          <option value="America/New_York">Eastern (ET)</option>
          <option value="America/Chicago">Central (CT)</option>
          <option value="America/Denver">Mountain (MT)</option>
          <option value="America/Los_Angeles">Pacific (PT)</option>
          <option value="America/Anchorage">Alaska</option>
          <option value="Pacific/Honolulu">Hawaii</option>
        </select>
      </div>
      <div class="flex gap-2" style="justify-content:flex-end;margin-top:.5rem">
        <button class="btn btn-primary" type="submit">Next →</button>
      </div>
    </form>
  `;
}

window.onboard1Submit = async function(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  onboardData.ministryName = fd.get('ministryName');
  onboardData.campus       = fd.get('campus');
  onboardData.timezone     = fd.get('timezone');
  // Save to settings
  await api('POST', 'settings', { ministryName: onboardData.ministryName, campus: onboardData.campus });
  onboardStep = 2; renderOnboarding();
};

function onboardStep2() {
  return `
    <h2>Invite your leaders</h2>
    <p class="text-muted mt-1 mb-3">Add leaders to your team. You can always invite more later from Settings.</p>
    <div id="invite-list" style="display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem"></div>
    <form class="flex gap-2" id="invite-add-form" onsubmit="addInvite(event)">
      <input class="form-input" name="email" type="email" placeholder="leader@example.com" style="flex:1">
      <button class="btn btn-secondary" type="submit">Add</button>
    </form>
    <p class="form-hint mt-2">They'll receive an email to set up their account.</p>
    <div class="flex gap-2" style="justify-content:space-between;margin-top:1.5rem">
      <button class="btn btn-ghost" onclick="onboardStep=1;renderOnboarding()">← Back</button>
      <button class="btn btn-primary" onclick="onboard2Next()">Next →</button>
    </div>
  `;
}

const inviteList = [];
window.addInvite = async function(e) {
  e.preventDefault();
  const email = new FormData(e.target).get('email');
  if (!email || inviteList.includes(email)) return;
  inviteList.push(email);
  e.target.reset();
  const list = document.getElementById('invite-list');
  const item = document.createElement('div');
  item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);padding:.6rem .875rem;border-radius:var(--radius-xs);font-size:.875rem';
  item.innerHTML = `<span>${esc(email)}</span><button style="background:none;border:none;cursor:pointer;color:var(--muted)" onclick="this.parentElement.remove()">✕</button>`;
  list.appendChild(item);
};

window.onboard2Next = async function() {
  // Fire-and-forget invites
  inviteList.forEach(email => api('POST', 'admin/invite/manual', { email, name: email.split('@')[0], role: 'leader' }).catch(() => {}));
  onboardStep = 3; renderOnboarding();
};

function onboardStep3() {
  return `
    <h2>Import your roster</h2>
    <p class="text-muted mt-1 mb-3">Upload a CSV file with your student roster, or start fresh and add students manually.</p>
    <div class="dropzone" id="csv-drop" onclick="document.getElementById('csv-file').click()">
      <div style="font-size:2rem;margin-bottom:.5rem">📂</div>
      <p style="font-weight:600;color:var(--text)">Click to upload CSV</p>
      <p class="text-sm text-muted">Expected columns: Name, Grade, School, Birthday, Section (core/loose/fringe), Group</p>
    </div>
    <input type="file" id="csv-file" accept=".csv" class="hidden" onchange="handleCSV(event)">
    <div id="csv-preview" class="mt-3"></div>
    <div class="flex gap-2" style="justify-content:space-between;margin-top:1.5rem">
      <button class="btn btn-ghost" onclick="onboardStep=2;renderOnboarding()">← Back</button>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="onboard3Skip()">Skip for now</button>
        <button class="btn btn-primary" id="import-btn" onclick="onboard3Import()" disabled>Import →</button>
      </div>
    </div>
  `;
}

let csvStudents = [];
window.handleCSV = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const rows = ev.target.result.trim().split('\n');
    const headers = rows[0].toLowerCase().split(',').map(h => h.trim());
    csvStudents = rows.slice(1).filter(r => r.trim()).map(row => {
      const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const get  = (...keys) => { for (const k of keys) { const i = headers.findIndex(h => h.includes(k)); if (i !== -1 && cols[i]) return cols[i]; } return ''; };
      return { name: get('name'), grade: get('grade'), school: get('school'), birthday: get('birthday','birth'), section: get('section','group type') || 'core', group: get('group','sport','activity'), sk: 'hs' };
    }).filter(s => s.name);
    const preview = document.getElementById('csv-preview');
    preview.innerHTML = `<p class="text-sm text-muted mb-2">${csvStudents.length} students found</p><div class="table-wrap"><table><thead><tr><th>Name</th><th>Grade</th><th>Section</th></tr></thead><tbody>${csvStudents.slice(0,5).map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.grade)}</td><td>${esc(s.section)}</td></tr>`).join('')}${csvStudents.length > 5 ? `<tr><td colspan="3" style="color:var(--muted);text-align:center">…and ${csvStudents.length - 5} more</td></tr>` : ''}</tbody></table></div>`;
    document.getElementById('import-btn').disabled = false;
  };
  reader.readAsText(file);
};

window.onboard3Import = async function() {
  const btn = document.getElementById('import-btn');
  btn.disabled = true; btn.textContent = 'Importing…';
  await Promise.allSettled(csvStudents.map(s => api('POST', 'students', s)));
  onboardStep = 4; renderOnboarding();
};
window.onboard3Skip = function() { onboardStep = 4; renderOnboarding(); };

function onboardStep4() {
  return `
    <div class="text-center" style="padding:1rem 0">
      <div style="font-size:3.5rem;margin-bottom:1rem">🎉</div>
      <h2>You're all set!</h2>
      <p class="text-muted mt-2 mb-4">Your StoryTrackr is ready. Start by adding your first student or exploring the dashboard.</p>
      <div class="flex gap-2" style="justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary btn-lg" onclick="navigate('/dashboard',true)">Go to Dashboard</button>
        <button class="btn btn-secondary btn-lg" onclick="navigate('/students',true)">View Roster</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function renderDashboard() {
  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'dashboard'));
  const [statsData, activityData] = await Promise.allSettled([
    api('GET', 'activity/stats'),
    api('GET', 'activity/recent'),
  ]);
  const stats    = statsData.status === 'fulfilled' ? statsData.value : {};
  const activity = activityData.status === 'fulfilled' ? activityData.value?.items || [] : [];

  document.getElementById('main-content').innerHTML = `
    <div class="page">
      <div class="flex items-center justify-between mb-3">
        <h1>Dashboard</h1>
        ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" onclick="openLogModal()">+ Log Hangout</button>` : ''}
      </div>

      <div class="stats-grid mb-3">
        <div class="stat-card"><div class="stat-value">${stats.totalInteractions ?? '—'}</div><div class="stat-label">Total interactions</div></div>
        <div class="stat-card"><div class="stat-value">${stats.thisMonth ?? '—'}</div><div class="stat-label">This month</div></div>
        <div class="stat-card"><div class="stat-value">${stats.uniqueStudents ?? '—'}</div><div class="stat-label">Students reached</div></div>
        <div class="stat-card"><div class="stat-value">${stats.uniqueLeaders ?? '—'}</div><div class="stat-label">Active leaders</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="card">
          <div class="card-header"><h3>Top Leaders</h3></div>
          <div class="card-body">
            ${(stats.topLeaders||[]).length ? stats.topLeaders.map(l => `<div class="flex items-center justify-between" style="padding:.4rem 0;border-bottom:1px solid var(--border)"><span class="text-sm">${esc(l.name)}</span><span class="badge badge-blue">${l.count}</span></div>`).join('') : '<p class="text-sm text-muted">No data yet</p>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Most Connected</h3></div>
          <div class="card-body">
            ${(stats.topStudents||[]).length ? stats.topStudents.map(s => `<div class="flex items-center justify-between" style="padding:.4rem 0;border-bottom:1px solid var(--border)"><span class="text-sm">${esc(s.name)}</span><span class="badge badge-green">${s.count}</span></div>`).join('') : '<p class="text-sm text-muted">No data yet</p>'}
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-header"><h3>Recent Activity</h3><a href="/notes" onclick="navigate('/notes');return false;" class="text-sm" style="color:var(--primary)">View all</a></div>
        <div class="card-body">
          ${activity.length ? activity.slice(0,10).map(a => `
            <div class="interaction-item">
              <div class="interaction-dot"></div>
              <div class="interaction-body">
                <div class="interaction-meta">${esc(a.leader||'Leader')} · ${esc(a.studentName||'Student')} · ${formatDate(a.date||a.createdAt)}</div>
                <div class="interaction-summary">${esc(a.summary||'').slice(0,200)}</div>
              </div>
            </div>
          `).join('') : '<p class="text-sm text-muted">No activity yet. Start by logging a hangout!</p>'}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════

async function renderStudentsView() {
  const path = getRoute();
  // Student detail: /students/SOME_ID
  const idMatch = path.match(/^\/students\/(.+)$/);
  if (idMatch) return renderStudentDetail(idMatch[1]);

  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'students'));
  if (!state.roster) {
    const data = await api('GET', 'students');
    state.roster = data.roster || { hs: { core:[], loose:[], fringe:[] }, ms: { core:[], loose:[], fringe:[] } };
  }

  let currentSk      = 'hs';
  let currentSection = 'core';
  let searchQuery    = '';

  function renderRoster() {
    const allStudents = (state.roster[currentSk]?.[currentSection] || [])
      .filter(s => !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    document.getElementById('main-content').innerHTML = `
      <div class="page">
        <div class="flex items-center justify-between mb-3">
          <h1>Students</h1>
          <div class="flex gap-2">
            <input class="form-input" style="max-width:200px;padding:.4rem .75rem;font-size:.875rem" placeholder="Search…" value="${esc(searchQuery)}" id="student-search" oninput="searchStudents(this.value)">
            ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ Add Student</button>` : ''}
          </div>
        </div>

        <div class="tabs mb-3">
          <button class="tab-btn ${currentSk==='hs'?'active':''}" onclick="switchSk('hs')">High School</button>
          <button class="tab-btn ${currentSk==='ms'?'active':''}" onclick="switchSk('ms')">Middle School</button>
        </div>
        <div class="tabs mb-3">
          <button class="tab-btn ${currentSection==='core'?'active':''}" onclick="switchSection('core')">Core</button>
          <button class="tab-btn ${currentSection==='loose'?'active':''}" onclick="switchSection('loose')">Loose</button>
          <button class="tab-btn ${currentSection==='fringe'?'active':''}" onclick="switchSection('fringe')">Fringe</button>
        </div>

        ${allStudents.length ? `
          <div class="student-grid">
            ${allStudents.map((s, i) => `
              <div class="student-card" onclick="navigate('/students/${esc(s.id||i)}')">
                <div class="student-avatar">
                  ${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="${esc(s.name)}">` : s.name.charAt(0).toUpperCase()}
                </div>
                <div class="student-info">
                  <div class="student-name">${esc(s.name)}</div>
                  <div class="student-meta">
                    ${s.grade ? `Grade ${esc(String(s.grade))}` : ''}
                    ${s.grade && s.lastInteractionDate ? ' · ' : ''}
                    ${s.lastInteractionDate ? `Last: ${formatDate(s.lastInteractionDate)}` : ''}
                  </div>
                </div>
                <div class="student-status">
                  ${s.connectedThisQuarter
                    ? `<span class="badge badge-green">✓</span>`
                    : `<span class="badge badge-gray">–</span>`}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-title">No students yet</div>
            <p class="empty-desc">${state.isDemoMode ? 'Demo data will appear here.' : 'Add your first student to get started.'}</p>
            ${!state.isDemoMode ? `<button class="btn btn-primary mt-3" onclick="openAddStudentModal()">+ Add Student</button>` : ''}
          </div>
        `}
      </div>
    `;
  }

  window.switchSk      = function(sk)  { currentSk = sk; renderRoster(); };
  window.switchSection = function(sec) { currentSection = sec; renderRoster(); };
  window.searchStudents = function(q)  { searchQuery = q; renderRoster(); };

  renderRoster();
}

async function renderStudentDetail(studentId) {
  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'students'));

  // Find student in roster (or fetch)
  let student = null;
  if (state.roster) {
    for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
      student = (state.roster[sk]?.[sec]||[]).find(s => s.id === studentId || String(s.index) === studentId);
      if (student) break; if (student) break;
    }
  }
  if (!student) {
    try {
      const data = await api('GET', `students/${studentId}`);
      student = data.student;
    } catch (_) {}
  }
  if (!student) {
    document.getElementById('main-content').innerHTML = `<div class="empty-state"><div class="empty-title">Student not found</div><button class="btn btn-secondary mt-3" onclick="navigate('/students')">← Back</button></div>`;
    return;
  }

  const interactions = (await api('GET', `student/interactions?sk=${student.sk||'hs'}&section=${student.section||'core'}&index=${student.index||0}`)).interactions || [];

  document.getElementById('main-content').innerHTML = `
    <div class="page" style="padding-top:0">
      <div style="padding:1rem 0">
        <button class="btn btn-ghost btn-sm" onclick="navigate('/students')">← Back to roster</button>
      </div>
      <div class="card">
        <div class="student-detail-header">
          <div class="student-detail-avatar">
            ${student.photoUrl ? `<img src="${esc(student.photoUrl)}" alt="">` : student.name.charAt(0).toUpperCase()}
          </div>
          <div class="student-detail-info">
            <h1>${esc(student.name)}</h1>
            <p class="student-detail-meta">
              ${[student.grade ? `Grade ${student.grade}` : '', student.school, student.group].filter(Boolean).join(' · ')}
            </p>
            <div class="flex gap-2 mt-2">
              <span class="badge ${student.section === 'core' ? 'badge-blue' : student.section === 'loose' ? 'badge-purple' : 'badge-gray'}">${student.section||'core'}</span>
              <span class="badge ${student.connectedThisQuarter ? 'badge-green' : 'badge-gray'}">${student.connectedThisQuarter ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
          ${!state.isDemoMode ? `
            <div style="margin-left:auto">
              <button class="btn btn-primary btn-sm" onclick="openLogModal('${esc(student.id)}','${esc(student.name)}','${esc(student.sk||'hs')}','${esc(student.section||'core')}',${student.index||0})">+ Log Hangout</button>
            </div>
          ` : `<span class="badge badge-yellow" style="margin-left:auto">Demo</span>`}
        </div>

        <div class="tabs" id="student-tabs">
          <button class="tab-btn active" onclick="switchStudentTab('notes')">Notes (${interactions.length})</button>
          <button class="tab-btn" onclick="switchStudentTab('goals')">Goals (${(student.goals||[]).length})</button>
          <button class="tab-btn" onclick="switchStudentTab('info')">Info</button>
        </div>

        <div id="student-tab-content">
          ${renderInteractionsList(interactions, student)}
        </div>
      </div>
    </div>
  `;

  window.switchStudentTab = function(tab) {
    document.querySelectorAll('#student-tabs .tab-btn').forEach((b,i) => b.classList.toggle('active', ['notes','goals','info'][i] === tab));
    const c = document.getElementById('student-tab-content');
    if (tab === 'notes')  c.innerHTML = renderInteractionsList(interactions, student);
    if (tab === 'goals')  c.innerHTML = renderGoalsList(student);
    if (tab === 'info')   c.innerHTML = renderStudentInfo(student);
  };
}

function renderInteractionsList(interactions, student) {
  if (!interactions.length) return `<div class="card-body"><div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No notes yet</div><p class="empty-desc">Log a hangout to start building this student's story.</p></div></div>`;
  return `<div class="card-body"><div>${interactions.slice().reverse().map(n => `
    <div class="interaction-item">
      <div class="interaction-dot"></div>
      <div class="interaction-body">
        <div class="interaction-meta">${esc(n.leader||'')} · ${formatDate(n.date||n.createdAt)}</div>
        <div class="interaction-summary">${esc(n.summary||'')}</div>
        ${n.tags?.length ? `<div class="flex gap-2 mt-1">${n.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `).join('')}</div></div>`;
}

function renderGoalsList(student) {
  const goals = student.goals || [];
  if (!goals.length) return `<div class="card-body"><p class="text-muted text-sm">No goals set yet.</p></div>`;
  return `<div class="card-body"><div style="display:flex;flex-direction:column;gap:.5rem">${goals.map((g,i) => `
    <div class="goal-item">
      <button class="goal-check ${g.done ? 'done' : ''}" ${state.isDemoMode ? 'onclick="demoBlock()"' : `onclick="toggleGoal(${i})"`}>${g.done ? '✓' : ''}</button>
      <span class="goal-text ${g.done ? 'done' : ''}">${esc(g.text||g)}</span>
    </div>
  `).join('')}</div></div>`;
}

function renderStudentInfo(student) {
  const rows = [
    ['Birthday', student.birthday],
    ['School', student.school],
    ['Grade', student.grade],
    ['Group / Sport', student.group],
    ['Primary Goal', student.primaryGoal],
    ['Interaction Count', student.interactionCount],
    ['Last Leader', student.lastLeader],
  ].filter(r => r[1]);
  return `<div class="card-body"><div style="display:grid;grid-template-columns:auto 1fr;gap:.75rem 1.5rem">${rows.map(([k,v]) => `<span class="text-sm text-muted">${esc(k)}</span><span class="text-sm">${esc(String(v))}</span>`).join('')}</div></div>`;
}

// ═══════════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════════

async function renderNotes() {
  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'notes'));
  const data     = await api('GET', 'activity/recent');
  const activity = data.items || [];

  document.getElementById('main-content').innerHTML = `
    <div class="page">
      <div class="flex items-center justify-between mb-3">
        <h1>Notes &amp; Activity</h1>
        ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" onclick="openLogModal()">+ Log Hangout</button>` : ''}
      </div>
      <div class="card">
        <div class="card-body">
          ${activity.length ? activity.map(a => `
            <div class="interaction-item">
              <div class="interaction-dot"></div>
              <div class="interaction-body">
                <div class="interaction-meta">${esc(a.leader||'')} · ${esc(a.studentName||'')} · ${formatDate(a.date||a.createdAt)}</div>
                <div class="interaction-summary">${esc(a.summary||'')}</div>
                ${a.tags?.length ? `<div class="flex gap-2 mt-1">${a.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
              </div>
            </div>
          `).join('') : `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No notes yet</div><p class="empty-desc">Start logging hangouts and they'll appear here.</p></div>`}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BRAIN DUMP
// ═══════════════════════════════════════════════════════════════

async function renderBrainDump() {
  mount(appShell(`
    <div class="page">
      <h1>Brain Dump</h1>
      <p class="text-muted mt-1 mb-3">Write freely about your week. StoryTrackr will find the students you mentioned and create draft notes.</p>
      <div class="card card-body">
        <div class="form-group">
          <label class="form-label">What happened this week?</label>
          <textarea class="form-input form-textarea" id="bd-text" style="min-height:180px" placeholder="I caught up with Tyler after church — he's been going through a tough time at home. Also ran into Maya at coffee shop and we talked about her upcoming baptism…" ${state.isDemoMode ? 'readonly' : ''}></textarea>
        </div>
        ${!state.isDemoMode ? `
          <button class="btn btn-primary mt-2" onclick="runBrainDump()">Find Students →</button>
        ` : `<button class="btn btn-secondary mt-2" onclick="demoBlock()">Demo is read-only</button>`}
        <div id="bd-results" class="mt-3"></div>
      </div>
    </div>
  `, 'brain-dump'));
}

window.runBrainDump = async function() {
  const text = document.getElementById('bd-text')?.value;
  if (!text) return;
  const results = document.getElementById('bd-results');
  results.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
  // Build roster name list
  const names = [];
  if (state.roster) {
    for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
      (state.roster[sk]?.[sec]||[]).forEach(s => names.push(s.name));
    }
  }
  const data = await api('POST', 'brain-dump', { text, roster: names });
  const parsed = data.parsed || [];
  if (!parsed.length) { results.innerHTML = `<p class="text-muted text-sm">No student names found. Try mentioning students by name.</p>`; return; }
  results.innerHTML = `<h3 class="mb-2">Found ${parsed.length} mention${parsed.length !== 1 ? 's' : ''}</h3>` + parsed.map(p => `
    <div class="card card-body mb-2">
      <div class="flex items-center justify-between mb-2">
        <strong>${esc(p.name)}</strong>
        ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" onclick="saveBrainDumpNote('${esc(p.name)}','${esc(p.summary.replace(/'/g,"\\'"))}')">Save Note</button>` : ''}
      </div>
      <p class="text-sm text-muted">${esc(p.summary)}</p>
    </div>
  `).join('');
};

window.saveBrainDumpNote = async function(name, summary) {
  // Find student in roster
  let found = null;
  if (state.roster) {
    for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
      found = (state.roster[sk]?.[sec]||[]).find(s => s.name === name);
      if (found) break; if (found) break;
    }
  }
  if (!found) { toast('Student not found in roster', 'error'); return; }
  const interaction = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    summary, leader: state.user?.name || '', leaderEmail: state.user?.email || '',
    date: new Date().toISOString().slice(0,10), tags: [], createdAt: new Date().toISOString(),
  };
  await api('POST', 'student/interactions', { sk: found.sk||'hs', section: found.section||'core', index: found.index||0, interaction, studentName: found.name });
  toast(`Note saved for ${name}`, 'success');
};

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════

async function renderSettings() {
  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'settings'));
  const data = await api('GET', 'settings/public');
  const s    = data;

  document.getElementById('main-content').innerHTML = `
    <div class="page">
      <h1>Settings</h1>
      ${state.isDemoMode ? `<div class="demo-banner mt-2 mb-3" style="border-radius:var(--radius)">Settings are read-only in demo mode.</div>` : ''}

      <div class="card mb-3">
        <div class="card-header"><h3>Organization</h3></div>
        <div class="card-body">
          <form class="form-stack" id="org-form" onsubmit="saveOrgSettings(event)">
            <div class="form-group">
              <label class="form-label">Ministry name</label>
              <input class="form-input" name="ministryName" value="${esc(s.ministryName||'')}" ${state.isDemoMode ? 'readonly' : ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Campus</label>
              <input class="form-input" name="campus" value="${esc(s.campus||'')}" ${state.isDemoMode ? 'readonly' : ''}>
            </div>
            ${!state.isDemoMode ? `<button class="btn btn-primary" type="submit" style="align-self:flex-start">Save</button>` : ''}
          </form>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header"><h3>Team Members</h3></div>
        <div class="card-body">
          ${!state.isDemoMode ? `
            <button class="btn btn-secondary btn-sm" onclick="navigate('/settings/team')">Manage Team</button>
          ` : `<p class="text-sm text-muted">Team management available in full version.</p>`}
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header"><h3>Security</h3></div>
        <div class="card-body">
          ${!state.isDemoMode ? `
            <form class="form-stack" id="pw-form" onsubmit="changePassword(event)">
              <div class="form-group">
                <label class="form-label">Current password</label>
                <input class="form-input" type="password" name="oldPassword">
              </div>
              <div class="form-group">
                <label class="form-label">New password</label>
                <input class="form-input" type="password" name="newPassword" placeholder="10+ chars">
              </div>
              <div class="form-group">
                <label class="form-label">Confirm new password</label>
                <input class="form-input" type="password" name="confirmPassword">
              </div>
              <div id="pw-msg" class="hidden form-error"></div>
              <button class="btn btn-secondary" type="submit" style="align-self:flex-start">Change password</button>
            </form>
          ` : `<p class="text-sm text-muted">Account security settings available after login.</p>`}
        </div>
      </div>

      ${!state.isDemoMode ? `
        <div class="card">
          <div class="card-header"><h3 style="color:var(--red)">Danger Zone</h3></div>
          <div class="card-body">
            <button class="btn btn-danger btn-sm" onclick="doLogout()">Log out of all devices</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  window.saveOrgSettings = async function(e) {
    e.preventDefault();
    if (demoBlock()) return;
    const fd = new FormData(e.target);
    await api('POST', 'settings', { ministryName: fd.get('ministryName'), campus: fd.get('campus') });
    toast('Settings saved', 'success');
  };

  window.changePassword = async function(e) {
    e.preventDefault();
    const fd  = new FormData(e.target);
    const msg = document.getElementById('pw-msg');
    const data = await api('POST', 'auth/change-password', { oldPassword: fd.get('oldPassword'), newPassword: fd.get('newPassword'), confirmPassword: fd.get('confirmPassword') });
    if (data.success) { toast('Password changed', 'success'); e.target.reset(); }
    else { msg.textContent = data.error; msg.classList.remove('hidden'); }
  };
}

// ═══════════════════════════════════════════════════════════════
// BILLING
// ═══════════════════════════════════════════════════════════════

function renderBilling() {
  mount(appShell(`
    <div class="page">
      <h1>Billing</h1>
      ${state.isDemoMode ? `<div class="demo-banner mt-2 mb-3" style="border-radius:var(--radius)">Billing is not available in demo mode.</div>` : ''}
      <div class="card mb-3">
        <div class="card-header"><h3>Current Plan</h3></div>
        <div class="card-body">
          <div class="flex items-center gap-3 mb-3">
            <div>
              <div class="font-bold" style="font-size:1.1rem">Starter</div>
              <div class="text-sm text-muted">Free plan · Up to 50 students</div>
            </div>
            <span class="badge badge-green" style="margin-left:auto">Active</span>
          </div>
          <a href="https://storytrackr.app/pricing.html" class="btn btn-primary btn-sm">Upgrade Plan</a>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Plan Comparison</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-2">Compare plans on our <a href="https://storytrackr.app/pricing.html" target="_blank">pricing page</a> or contact us at <a href="mailto:billing@storytrackr.app">billing@storytrackr.app</a> for questions.</p>
        </div>
      </div>
    </div>
  `, 'settings'));
}

// ═══════════════════════════════════════════════════════════════
// LOG HANGOUT MODAL
// ═══════════════════════════════════════════════════════════════

window.openLogModal = function(studentId, studentName, sk, section, index) {
  if (demoBlock()) return;

  // Build student selector options if no specific student
  let studentOptions = '';
  if (!studentId && state.roster) {
    for (const s of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
      (state.roster[s]?.[sec]||[]).forEach(st => {
        studentOptions += `<option value="${esc(st.id)}|${esc(st.sk||s)}|${esc(st.section||sec)}|${st.index||0}|${esc(st.name)}">${esc(st.name)}</option>`;
      });
    }
  }

  showModal(`
    <div class="modal-header">
      <h2 class="modal-title">Log Hangout</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form class="form-stack" id="log-form">
        ${studentId ? `<input type="hidden" name="studentId" value="${esc(studentId)}"><input type="hidden" name="sk" value="${esc(sk)}"><input type="hidden" name="section" value="${esc(section)}"><input type="hidden" name="index" value="${index}"><div class="form-group"><label class="form-label">Student</label><input class="form-input" value="${esc(studentName)}" readonly></div>` : `
          <div class="form-group">
            <label class="form-label">Student</label>
            <select class="form-input form-select" name="studentSelect" required>
              <option value="">Select student…</option>
              ${studentOptions}
            </select>
          </div>`}
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Summary *</label>
          <textarea class="form-input form-textarea" name="summary" placeholder="What did you talk about? What was on their heart?" required></textarea>
        </div>
        <div id="log-error" class="form-error hidden"></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitLogForm()">Save note</button>
    </div>
  `);
};

window.submitLogForm = async function() {
  const form = document.getElementById('log-form');
  const err  = document.getElementById('log-error');
  const fd   = new FormData(form);
  let sk, section, index, studentName, studentId;

  if (fd.get('studentSelect')) {
    const parts = fd.get('studentSelect').split('|');
    studentId = parts[0]; sk = parts[1]; section = parts[2]; index = parseInt(parts[3]); studentName = parts[4];
  } else {
    studentId = fd.get('studentId'); sk = fd.get('sk'); section = fd.get('section'); index = parseInt(fd.get('index'));
    // find name from roster
    if (state.roster) {
      for (const s of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
        const found = (state.roster[s]?.[sec]||[]).find(st => st.id === studentId);
        if (found) { studentName = found.name; break; }
      }
    }
  }

  const summary = fd.get('summary');
  if (!summary) { err.textContent = 'Summary required'; err.classList.remove('hidden'); return; }

  const interaction = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    summary, leader: state.user?.name || '', leaderEmail: state.user?.email || '',
    date: fd.get('date'), tags: [], createdAt: new Date().toISOString(),
  };

  const data = await api('POST', 'student/interactions', { sk, section, index, interaction, studentName });
  if (data.success) {
    closeModal();
    toast('Note saved!', 'success');
    state.roster = null; // invalidate cache
    state.activity = null;
  } else {
    err.textContent = data.error || 'Failed to save'; err.classList.remove('hidden');
  }
};

// ═══════════════════════════════════════════════════════════════
// ADD STUDENT MODAL
// ═══════════════════════════════════════════════════════════════

window.openAddStudentModal = function() {
  if (demoBlock()) return;
  showModal(`
    <div class="modal-header">
      <h2 class="modal-title">Add Student</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form class="form-stack" id="add-student-form">
        <div class="form-group">
          <label class="form-label">Full name *</label>
          <input class="form-input" name="name" placeholder="First Last" required>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div class="form-group">
            <label class="form-label">Grade</label>
            <input class="form-input" name="grade" type="number" min="6" max="12" placeholder="10">
          </div>
          <div class="form-group">
            <label class="form-label">Division</label>
            <select class="form-input form-select" name="sk">
              <option value="hs">High School</option>
              <option value="ms">Middle School</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Section</label>
          <select class="form-input form-select" name="section">
            <option value="core">Core</option>
            <option value="loose">Loose</option>
            <option value="fringe">Fringe</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">School</label>
          <input class="form-input" name="school" placeholder="Lincoln High">
        </div>
        <div class="form-group">
          <label class="form-label">Birthday</label>
          <input class="form-input" type="date" name="birthday">
        </div>
        <div id="add-student-error" class="form-error hidden"></div>
      </form>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="submitAddStudent()">Add student</button>
    </div>
  `);
};

window.submitAddStudent = async function() {
  const form = document.getElementById('add-student-form');
  const err  = document.getElementById('add-student-error');
  const fd   = new FormData(form);
  if (!fd.get('name')) { err.textContent = 'Name required'; err.classList.remove('hidden'); return; }
  const data = await api('POST', 'students', {
    name: fd.get('name'), grade: fd.get('grade') ? Number(fd.get('grade')) : null,
    sk: fd.get('sk'), section: fd.get('section'), school: fd.get('school'), birthday: fd.get('birthday'),
  });
  if (data.success) { closeModal(); toast('Student added', 'success'); state.roster = null; renderStudentsView(); }
  else { err.textContent = data.error || 'Failed'; err.classList.remove('hidden'); }
};

// ═══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════════════

function showModal(html) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}
window.closeModal = function() { document.getElementById('modal-overlay')?.remove(); };

// ═══════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (_) { return dateStr; }
}

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════

(async function boot() {
  const path = getRoute();
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/demo'];
  if (!publicPaths.some(p => path.startsWith(p))) {
    await loadUser();
  }
  render();
})();
