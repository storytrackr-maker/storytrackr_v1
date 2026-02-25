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
  if (path === '/dashboard' || path === '/') return renderStudentsView();
  if (path.startsWith('/students'))   return renderStudentsView();
  if (path === '/notes')              return renderNotes();
  if (path === '/settings')           return renderSettings();
  if (path === '/billing')            return renderBilling();
  if (path === '/brain-dump')         return renderBrainDump();
  if (path === '/adminland' || path === '/admin-land' || path === '/admin') return renderAdminLand();
  if (path === '/owner')              return renderOwnerDashboard();

  navigate('/students', true);
}

// ── Load current user ─────────────────────────────────────────
async function loadUser() {
  try {
    const data = await api('GET', 'me');
    state.user      = data.user || null;
    state.isDemoMode = !!data.isDemoMode;
    if (state.user?.preferences) applyTheme(state.user.preferences);
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
          ${navBtn('students','👥 Students', activePage)}
          ${navBtn('notes','📝 Notes', activePage)}
          ${navBtn('brain-dump','🧠 Brain Dump', activePage)}
          ${navBtn('settings','⚙️ Settings', activePage)}
          ${u?.role === 'admin' || u?.orgRole === 'admin' ? navBtn('adminland','🏛️ AdminLand', activePage) : ''}
        </nav>
        <div class="header-actions">
          <button class="avatar-btn" onclick="toggleUserMenu(this, event)" title="${u?.name || 'Profile'}">${initials}</button>
        </div>
      </header>
      <main class="app-main" id="main-content">
        ${content}
      </main>
      <nav class="bottom-nav">
        ${mobileNavBtn('students','students','👥')}
        ${mobileNavBtn('notes','notes','📝')}
        ${mobileNavBtn('brain-dump','brain-dump','🧠')}
        ${mobileNavBtn('settings','settings','⚙️')}
        ${u?.role === 'admin' || u?.orgRole === 'admin' ? mobileNavBtn('adminland','adminland','🏛️') : ''}
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
  state.roster = null;
  state.activity = null;
  state.settings = null;
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
        state.roster = null;
        state.activity = null;
        state.settings = null;
        applyTheme(data.user?.preferences);
        if (data.requireOrgPicker) navigate('/select-org', true);
        else navigate('/students', true);
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
        password: fd.get('password'),
      });
      if (data.success) {
        if (data.onboarding) {
          state.user = data.user;
          state.roster = null;
          state.activity = null;
          state.settings = null;
          applyTheme(data.user?.preferences);
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
        <input class="form-input" name="ministryName" value="${esc(onboardData.ministryName||state.user?.orgName||'')}" placeholder="Westside Students" required>
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
        <button class="btn btn-primary btn-sm" onclick="${state.isDemoMode ? 'demoBlock()' : 'openLogModal()'}">+ Add Note</button>
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
          `).join('') : '<p class="text-sm text-muted">No activity yet. Add a note to get started!</p>'}
        </div>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════

function isInactive(student, days) {
  if (!student.lastInteractionDate) return true;
  const diff = (Date.now() - new Date(student.lastInteractionDate).getTime()) / 86400000;
  return diff > days;
}

function applyFilters(students, filters, inactivityDays) {
  return students.filter(s => {
    if (filters.archived !== undefined) {
      if (filters.archived && !s.archivedAt) return false;
      if (!filters.archived && s.archivedAt) return false;
    } else {
      // By default hide archived
      if (s.archivedAt) return false;
    }
    if (filters.grade && String(s.grade) !== String(filters.grade)) return false;
    if (filters.school && s.school !== filters.school) return false;
    if (filters.familyContacted !== undefined && !!s.familyContacted !== filters.familyContacted) return false;
    if (filters.inactive && !isInactive(s, inactivityDays)) return false;
    if (filters.birthdayMonth) {
      const bday = s.birthday ? new Date(s.birthday).getMonth() + 1 : null;
      if (!bday || String(bday) !== String(filters.birthdayMonth)) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) &&
          !(s.school || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

async function renderStudentsView() {
  const path = getRoute();
  // Student detail: /students/SOME_ID
  const idMatch = path.match(/^\/students\/(.+)$/);
  if (idMatch) return renderStudentDetail(idMatch[1]);

  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'students'));

  // Load settings and roster in parallel
  const [rosterData, settingsData, statsData] = await Promise.allSettled([
    state.roster ? Promise.resolve({ roster: state.roster }) : api('GET', 'students'),
    state.settings ? Promise.resolve(state.settings) : api('GET', `settings/public?orgId=${encodeURIComponent(state.user?.orgId || 'default')}`),
    api('GET', 'activity/stats'),
  ]);

  if (rosterData.status === 'fulfilled') {
    state.roster = rosterData.value.roster || rosterData.value || { hs: { core:[], loose:[], fringe:[] }, ms: { core:[], loose:[], fringe:[] } };
  }
  if (settingsData.status === 'fulfilled') {
    state.settings = settingsData.value;
  }
  const stats = statsData.status === 'fulfilled' ? statsData.value : {};
  const settings = state.settings || {};
  const inactivityDays = settings.inactivityDays ?? 90;
  const statCards = settings.statCards || { totalStudents:true, totalInteractions:true, interactionsThisMonth:true, activeLeaders:true };

  // Collect all unique schools/grades for filter options
  let allStudentsFlat = [];
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    (state.roster[sk]?.[sec]||[]).forEach(s => allStudentsFlat.push({ ...s, _sk: sk }));
  }
  const uniqueGrades  = [...new Set(allStudentsFlat.map(s => s.grade).filter(Boolean))].sort((a,b) => a-b);
  const uniqueSchools = [...new Set(allStudentsFlat.map(s => s.school).filter(Boolean))].sort();

  let currentSk    = 'hs';
  let searchQuery  = '';
  let showFilters  = false;
  let activeFilters = {};

  // Stat cards HTML
  function renderStatCards() {
    const totalStudents = allStudentsFlat.filter(s => !s.archivedAt).length;
    const cards = [];
    if (statCards.totalStudents)        cards.push({ label: 'Total Students',           value: totalStudents });
    if (statCards.totalInteractions)    cards.push({ label: 'Total Interactions',        value: stats.totalInteractions ?? '—' });
    if (statCards.interactionsThisMonth)cards.push({ label: 'This Month',                value: stats.thisMonth ?? '—' });
    if (statCards.activeLeaders)        cards.push({ label: 'Active Leaders',            value: stats.uniqueLeaders ?? '—' });
    if (!cards.length) return '';
    return `<div class="stats-grid mb-3">${cards.map(c => `<div class="stat-card"><div class="stat-value">${c.value}</div><div class="stat-label">${c.label}</div></div>`).join('')}</div>`;
  }

  function renderRoster() {
    const skStudents = [];
    for (const sec of ['core','loose','fringe']) {
      (state.roster[currentSk]?.[sec]||[]).forEach(s => skStudents.push(s));
    }
    const filtered = applyFilters(skStudents, { ...activeFilters, search: searchQuery || activeFilters.search }, inactivityDays);

    const filterActive = Object.keys(activeFilters).length > 0;

    document.getElementById('main-content').innerHTML = `
      <div class="page">
        <div class="flex items-center justify-between mb-3">
          <h1>Students</h1>
          <div class="flex gap-2">
            <div style="position:relative">
              <input class="form-input" style="max-width:200px;padding:.4rem .75rem;font-size:.875rem;padding-right:2rem" placeholder="Search…" value="${esc(searchQuery)}" id="student-search"
                oninput="searchStudents(this.value)"
                onfocus="if(!showFiltersOpen){showStudentFilters()}"
              >
              ${filterActive ? `<span style="position:absolute;top:50%;right:.5rem;transform:translateY(-50%);width:8px;height:8px;background:var(--primary);border-radius:50%"></span>` : ''}
            </div>
            <button class="btn btn-secondary btn-sm" onclick="toggleStudentFilters()" title="Filters" style="${filterActive ? 'border-color:var(--primary);color:var(--primary)' : ''}">⚙ Filters</button>
            ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" onclick="openAddStudentModal()">+ Add Student</button>` : ''}
          </div>
        </div>

        ${renderStatCards()}

        <div id="student-filter-panel" class="${showFilters ? '' : 'hidden'}" style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.75rem">
            <div class="form-group" style="margin:0">
              <label class="form-label" style="font-size:.75rem">Grade</label>
              <select class="form-input form-select" style="font-size:.8rem;padding:.3rem .5rem" onchange="setFilter('grade',this.value||undefined)">
                <option value="">Any grade</option>
                ${uniqueGrades.map(g => `<option value="${g}" ${activeFilters.grade==g?'selected':''}>${g}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label" style="font-size:.75rem">School</label>
              <select class="form-input form-select" style="font-size:.8rem;padding:.3rem .5rem" onchange="setFilter('school',this.value||undefined)">
                <option value="">Any school</option>
                ${uniqueSchools.map(s => `<option value="${esc(s)}" ${activeFilters.school===s?'selected':''}>${esc(s)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label" style="font-size:.75rem">Birthday Month</label>
              <select class="form-input form-select" style="font-size:.8rem;padding:.3rem .5rem" onchange="setFilter('birthdayMonth',this.value||undefined)">
                <option value="">Any month</option>
                ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => `<option value="${i+1}" ${activeFilters.birthdayMonth==i+1?'selected':''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0;display:flex;flex-direction:column;justify-content:flex-end">
              <label style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;cursor:pointer">
                <input type="checkbox" ${activeFilters.familyContacted?'checked':''} onchange="setFilter('familyContacted',this.checked?true:undefined)">
                Family Contacted
              </label>
            </div>
            <div class="form-group" style="margin:0;display:flex;flex-direction:column;justify-content:flex-end">
              <label style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;cursor:pointer">
                <input type="checkbox" ${activeFilters.inactive?'checked':''} onchange="setFilter('inactive',this.checked?true:undefined)">
                Inactive (${inactivityDays}d)
              </label>
            </div>
            <div class="form-group" style="margin:0;display:flex;flex-direction:column;justify-content:flex-end">
              <label style="display:flex;align-items:center;gap:.4rem;font-size:.8rem;cursor:pointer">
                <input type="checkbox" ${activeFilters.archived?'checked':''} onchange="setFilter('archived',this.checked?true:undefined)">
                Archived
              </label>
            </div>
          </div>
          ${filterActive ? `<button class="btn btn-ghost btn-sm mt-2" onclick="clearFilters()">Clear filters</button>` : ''}
        </div>

        <div class="tabs mb-3">
          <button class="tab-btn ${currentSk==='hs'?'active':''}" onclick="switchSk('hs')">High School</button>
          <button class="tab-btn ${currentSk==='ms'?'active':''}" onclick="switchSk('ms')">Middle School</button>
        </div>

        ${filtered.length ? `
          <div class="student-grid">
            ${filtered.map(s => `
              <div class="student-card" onclick="navigate('/students/${esc(s.id)}')">
                <div class="student-avatar">
                  ${s.photoUrl ? `<img src="${esc(s.photoUrl)}" alt="${esc(s.name)}">` : s.name.charAt(0).toUpperCase()}
                </div>
                <div class="student-info">
                  <div class="student-name">${esc(s.name)}</div>
                  <div class="student-meta">
                    ${[s.grade ? `Gr. ${esc(String(s.grade))}` : '', esc(s.school||''), s.birthday ? formatBirthday(s.birthday) : ''].filter(Boolean).join(' · ')}
                  </div>
                  ${s.lastInteractionDate ? `<div class="student-meta" style="font-size:.75rem">Last: ${formatDate(s.lastInteractionDate)}</div>` : ''}
                </div>
                <div class="student-status" style="display:flex;flex-direction:column;align-items:flex-end;gap:.3rem">
                  ${s.archivedAt ? `<span class="badge badge-gray">Archived</span>` : isInactive(s, inactivityDays) ? `<span class="badge badge-yellow" style="background:#fef9c3;color:#854d0e">Inactive</span>` : `<span class="badge badge-green">Active</span>`}
                  <label onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:.3rem;font-size:.75rem;cursor:pointer;color:var(--muted)">
                    <input type="checkbox" ${s.familyContacted?'checked':''} onchange="toggleFamilyContacted('${esc(s.id)}',this.checked);event.stopPropagation()">
                    Family
                  </label>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-title">${filterActive || searchQuery ? 'No students match your filters' : "It's quiet here."}</div>
            <p class="empty-desc">${filterActive || searchQuery ? 'Try adjusting your search or filters.' : state.isDemoMode ? 'Demo data will appear here.' : 'Add your first student to get started.'}</p>
            ${!state.isDemoMode && !filterActive && !searchQuery ? `<button class="btn btn-primary mt-3" onclick="openAddStudentModal()">+ Add Student</button>` : ''}
          </div>
        `}
      </div>
    `;
  }

  let showFiltersOpen = false;

  window.switchSk = function(sk) { currentSk = sk; renderRoster(); };
  window.searchStudents = function(q) { searchQuery = q; renderRoster(); };
  window.showStudentFilters = function() { showFilters = true; showFiltersOpen = true; renderRoster(); };
  window.toggleStudentFilters = function() { showFilters = !showFilters; showFiltersOpen = showFilters; renderRoster(); };
  window.setFilter = function(key, val) {
    if (val === undefined) delete activeFilters[key];
    else activeFilters[key] = val;
    renderRoster();
  };
  window.clearFilters = function() { activeFilters = {}; renderRoster(); };
  window.toggleFamilyContacted = async function(id, val) {
    const data = await api('PUT', `students/${id}`, { familyContacted: val });
    if (data.success || data.student) {
      // Update local roster cache
      for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
        const list = state.roster[sk]?.[sec] || [];
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) { list[idx] = { ...list[idx], familyContacted: val }; }
      }
    }
  };

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

  const [interactionRes, settingsRes] = await Promise.allSettled([
    api('GET', `student/interactions?sk=${student.sk||'hs'}&section=${student.section||'core'}&index=${student.index||0}`),
    state.settings ? Promise.resolve(state.settings) : api('GET', `settings/public?orgId=${encodeURIComponent(state.user?.orgId||'default')}`),
  ]);
  const interactions = interactionRes.status === 'fulfilled' ? (interactionRes.value.interactions || []) : [];
  if (settingsRes.status === 'fulfilled') state.settings = settingsRes.value;
  const features = state.settings?.features || { goals:true, notes:true, activity:true, familyContact:true };
  const inactivityDays = state.settings?.inactivityDays ?? 90;

  let editing = false;

  function renderDetail() {
    const age = calcAge(student.birthday);
    document.getElementById('main-content').innerHTML = `
      <div class="page" style="padding-top:0">
        <div style="padding:1rem 0;display:flex;align-items:center;justify-content:space-between">
          <button class="btn btn-ghost btn-sm" onclick="navigate('/students')">← Back to roster</button>
          ${!state.isDemoMode ? `
            <div class="flex gap-2">
              ${editing
                ? `<button class="btn btn-ghost btn-sm" onclick="cancelEditStudent()">Cancel</button>
                   <button class="btn btn-primary btn-sm" onclick="saveStudentEdit('${esc(student.id)}')">Save</button>`
                : `<button class="btn btn-secondary btn-sm" onclick="startEditStudent()">Edit</button>
                   <button class="btn btn-primary btn-sm" onclick="openLogModal('${esc(student.id)}','${esc(student.name)}','${esc(student.sk||'hs')}','${esc(student.section||'core')}',${student.index||0})">+ Add Note</button>`}
            </div>
          ` : `<span class="badge badge-yellow">Demo</span>`}
        </div>
        <div class="card">
          <div class="student-detail-header">
            <div class="student-detail-avatar" id="student-photo-wrap" style="position:relative;cursor:${editing&&!state.isDemoMode?'pointer':'default'}" ${editing&&!state.isDemoMode?'onclick="triggerPhotoUpload()"':''}>
              ${student.photoUrl ? `<img src="${esc(student.photoUrl)}" alt="" id="student-photo-img">` : `<span>${student.name.charAt(0).toUpperCase()}</span>`}
              ${editing&&!state.isDemoMode ? `<div style="position:absolute;bottom:0;right:0;background:var(--primary);color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:.7rem">📷</div>` : ''}
            </div>
            <input type="file" id="student-photo-file" accept="image/*" class="hidden" onchange="handleStudentPhotoUpload(event,'${esc(student.id)}')">
            <div class="student-detail-info" style="flex:1">
              ${editing
                ? `<input class="form-input" id="edit-name" value="${esc(student.name)}" style="font-size:1.2rem;font-weight:700;margin-bottom:.5rem">`
                : `<h1 style="font-size:1.4rem">${esc(student.name)}</h1>`}
              <div style="font-size:.85rem;color:var(--muted);margin-top:.25rem">
                ${editing ? `
                  <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem">
                    <input class="form-input" id="edit-grade" value="${esc(String(student.grade||''))}" placeholder="Grade" style="width:80px;font-size:.85rem;padding:.3rem .5rem">
                    <input class="form-input" id="edit-school" value="${esc(student.school||'')}" placeholder="School" style="flex:1;min-width:120px;font-size:.85rem;padding:.3rem .5rem">
                    <input class="form-input" id="edit-birthday" type="date" value="${esc(student.birthday||'')}" style="font-size:.85rem;padding:.3rem .5rem">
                    <input class="form-input" id="edit-group" value="${esc(student.group||'')}" placeholder="Group/Sport" style="flex:1;min-width:120px;font-size:.85rem;padding:.3rem .5rem">
                  </div>
                ` : `
                  ${[student.grade ? `Grade ${student.grade}` : '', student.school, student.group].filter(Boolean).join(' · ')}
                  ${student.birthday ? `<span style="margin-left:.5rem">🎂 ${formatBirthday(student.birthday)}${age !== null ? ` (age ${age})` : ''}</span>` : ''}
                `}
              </div>
              ${features.familyContact ? `
                <label style="display:inline-flex;align-items:center;gap:.4rem;margin-top:.5rem;font-size:.85rem;cursor:pointer">
                  <input type="checkbox" id="detail-family" ${student.familyContacted?'checked':''} onchange="toggleFamilyContacted('${esc(student.id)}',this.checked)">
                  Family Contacted
                </label>
              ` : ''}
              <div class="flex gap-2 mt-2">
                ${isInactive(student, inactivityDays) && !student.archivedAt ? `<span class="badge" style="background:#fef9c3;color:#854d0e">Inactive</span>` : ''}
                ${student.archivedAt ? `<span class="badge badge-gray">Archived</span>` : ''}
              </div>
            </div>
          </div>

          ${features.goals && (student.goals||[]).length > 0 ? `
            <div style="padding:1rem 1.5rem;border-top:1px solid var(--border)">
              <h3 style="font-size:.9rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">Goals</h3>
              ${renderGoalsList(student)}
            </div>
          ` : ''}

          ${features.activity || features.notes ? `
            <div style="padding:1rem 1.5rem;border-top:1px solid var(--border)">
              <h3 style="font-size:.9rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">Activity (${interactions.length})</h3>
              ${renderInteractionsList(interactions, student)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  window.startEditStudent  = function() { editing = true;  renderDetail(); };
  window.cancelEditStudent = function() { editing = false; renderDetail(); };
  window.saveStudentEdit   = async function(id) {
    const updates = {
      name:     document.getElementById('edit-name')?.value || student.name,
      grade:    document.getElementById('edit-grade')?.value ? Number(document.getElementById('edit-grade').value) : null,
      school:   document.getElementById('edit-school')?.value || '',
      birthday: document.getElementById('edit-birthday')?.value || '',
      group:    document.getElementById('edit-group')?.value || '',
    };
    const data = await api('PUT', `students/${id}`, updates);
    if (data.success || data.student) {
      student = { ...student, ...updates, ...(data.student || {}) };
      if (state.roster) {
        for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
          const list = state.roster[sk]?.[sec] || [];
          const idx = list.findIndex(s => s.id === id);
          if (idx !== -1) list[idx] = { ...list[idx], ...updates };
        }
      }
      editing = false; renderDetail(); toast('Saved', 'success');
    } else { toast(data.error || 'Save failed', 'error'); }
  };

  window.triggerPhotoUpload = function() { document.getElementById('student-photo-file')?.click(); };

  window.handleStudentPhotoUpload = async function(e, id) {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropModal(file, async blob => {
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      try {
        const res = await fetch('/api/upload-photo?type=student', { method:'POST', credentials:'include', body:form });
        const data = await res.json();
        if (data.url) {
          await api('PUT', `students/${id}`, { photoUrl: data.url });
          student.photoUrl = data.url;
          if (state.roster) {
            for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
              const list = state.roster[sk]?.[sec] || [];
              const idx = list.findIndex(s => s.id === id);
              if (idx !== -1) list[idx].photoUrl = data.url;
            }
          }
          renderDetail();
        }
      } catch(_) { toast('Photo upload failed', 'error'); }
    });
  };

  renderDetail();
}

function renderInteractionsList(interactions, student) {
  if (!interactions.length) return `<div class="card-body"><div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No notes yet</div><p class="empty-desc">Add a note to start building this student's story.</p></div></div>`;
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
        <button class="btn btn-primary btn-sm" onclick="${state.isDemoMode ? 'demoBlock()' : 'openLogModal()'}">+ Add Note</button>
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
          `).join('') : `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No notes yet</div><p class="empty-desc">Add notes and they'll appear here.</p></div>`}
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
  // Build roster name list (load if not cached)
  if (!state.roster) {
    const data = await api('GET', 'students');
    state.roster = data.roster || { hs: { core:[], loose:[], fringe:[] }, ms: { core:[], loose:[], fringe:[] } };
  }
  const names = [];
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    (state.roster[sk]?.[sec]||[]).forEach(s => names.push(s.name));
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
  // Load roster if not yet cached
  if (!state.roster) {
    const data = await api('GET', 'students');
    state.roster = data.roster || { hs: { core:[], loose:[], fringe:[] }, ms: { core:[], loose:[], fringe:[] } };
  }
  // Find student in roster
  let found = null;
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    found = (state.roster[sk]?.[sec]||[]).find(s => s.name === name);
    if (found) break; if (found) break;
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
          <a href="https://storytrackr.app/pricing" class="btn btn-primary btn-sm">Upgrade Plan</a>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Plan Comparison</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-2">Compare plans on our <a href="https://storytrackr.app/pricing" target="_blank">pricing page</a> or contact us at <a href="mailto:billing@storytrackr.app">billing@storytrackr.app</a> for questions.</p>
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
      <h2 class="modal-title">Add Note</h2>
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
    sk: fd.get('sk') || 'hs', section: 'core', school: fd.get('school'), birthday: fd.get('birthday'),
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

function formatBirthday(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  } catch (_) { return ''; }
}

function calcAge(dateStr) {
  if (!dateStr) return null;
  try {
    const dob = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    return age;
  } catch (_) { return null; }
}

// ═══════════════════════════════════════════════════════════════
// THEME / APPEARANCE
// ═══════════════════════════════════════════════════════════════

function applyTheme(prefs) {
  const p = prefs || {};
  const theme = p.theme || 'auto';
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else if (theme === 'light') {
    document.documentElement.dataset.theme = 'light';
  } else {
    // auto — follow system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  }
  document.body.classList.toggle('compact', !!p.compactMode);
  document.body.classList.toggle('no-sticky-nav', p.stickyBottomNav === false);
}

// ═══════════════════════════════════════════════════════════════
// CROP MODAL (Phase 6)
// ═══════════════════════════════════════════════════════════════

function openCropModal(file, onCropComplete) {
  const url = URL.createObjectURL(file);
  showModal(`
    <div class="modal-header">
      <h2 class="modal-title">Crop Photo</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="text-align:center">
      <div style="position:relative;overflow:hidden;width:260px;height:260px;margin:0 auto;border-radius:50%;border:2px solid var(--border);cursor:move;background:#000" id="crop-container">
        <img id="crop-img" src="${url}" style="position:absolute;top:0;left:0;transform-origin:top left;user-select:none;max-width:none">
      </div>
      <p class="text-sm text-muted mt-2">Drag to reposition · Scroll to zoom</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="cropAndComplete()">Use Photo</button>
    </div>
  `);

  let scale = 1, ox = 0, oy = 0, dragging = false, startX, startY;
  const img = document.getElementById('crop-img');
  const container = document.getElementById('crop-container');
  const SIZE = 260;

  img.onload = () => {
    scale = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
    ox = (SIZE - img.naturalWidth * scale) / 2;
    oy = (SIZE - img.naturalHeight * scale) / 2;
    updateTransform();
  };

  function updateTransform() {
    img.style.transform = `translate(${ox}px,${oy}px) scale(${scale})`;
  }

  container.addEventListener('mousedown', e => { dragging = true; startX = e.clientX - ox; startY = e.clientY - oy; });
  window.addEventListener('mousemove', e => { if (!dragging) return; ox = e.clientX - startX; oy = e.clientY - startY; updateTransform(); });
  window.addEventListener('mouseup', () => { dragging = false; });
  container.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.max(SIZE / img.naturalWidth, scale * delta);
    updateTransform();
  }, { passive: false });

  window.cropAndComplete = function() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, -ox / scale, -oy / scale, SIZE / scale, SIZE / scale, 0, 0, SIZE, SIZE);
    canvas.toBlob(blob => {
      closeModal();
      URL.revokeObjectURL(url);
      onCropComplete(blob);
    }, 'image/jpeg', 0.9);
  };
}

// ═══════════════════════════════════════════════════════════════
// ADMINLAND (Phase 4)
// ═══════════════════════════════════════════════════════════════

async function renderAdminLand() {
  const role = state.user?.role || state.user?.orgRole;
  if (role !== 'admin') {
    mount(appShell(`
      <div class="page">
        <div class="empty-state">
          <div class="empty-icon">🔒</div>
          <div class="empty-title">Admin access required</div>
          <p class="empty-desc">Contact your admin for access.</p>
        </div>
      </div>
    `, 'adminland'));
    return;
  }

  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'adminland'));

  const [usersRes, settingsRes, analyticsRes] = await Promise.allSettled([
    api('GET', 'admin/users'),
    api('GET', `settings/public?orgId=${encodeURIComponent(state.user?.orgId||'default')}`),
    api('GET', 'admin/analytics'),
  ]);

  const users    = usersRes.status === 'fulfilled' ? (usersRes.value.users || []) : [];
  const settings = settingsRes.status === 'fulfilled' ? settingsRes.value : {};
  const analytics= analyticsRes.status === 'fulfilled' ? analyticsRes.value : {};
  if (settingsRes.status === 'fulfilled') state.settings = settings;

  const features  = settings.features  || { goals:true, notes:true, activity:true, familyContact:true };
  const statCards = settings.statCards || { totalStudents:true, totalInteractions:true, interactionsThisMonth:true, activeLeaders:true };

  document.getElementById('main-content').innerHTML = `
    <div class="page">
      <h1>AdminLand</h1>
      <p class="text-muted mt-1 mb-4">Manage your ministry settings, leaders, and data.</p>

      <!-- Ministry Controls -->
      <div class="card mb-3">
        <div class="card-header"><h3>Ministry Controls</h3></div>
        <div class="card-body">
          <form class="form-stack" onsubmit="saveAdminSettings(event)">
            <div class="form-group">
              <label class="form-label">Ministry name</label>
              <input class="form-input" id="admin-ministry-name" value="${esc(settings.ministryName||'')}">
            </div>
            <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Save Name</button>
          </form>
          <hr class="divider mt-3 mb-3">
          <div class="flex gap-2 flex-wrap">
            <button class="btn btn-secondary btn-sm" onclick="archiveGraduates()">Archive Grade-12 Students</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteMinistry()">Delete Ministry…</button>
          </div>
        </div>
      </div>

      <!-- Data Visibility -->
      <div class="card mb-3">
        <div class="card-header"><h3>Data Visibility</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-3">Control which features are visible to all leaders.</p>
          <div style="display:flex;flex-direction:column;gap:.6rem">
            ${[
              ['goals','Goals / Spiritual Goals'],
              ['notes','Notes'],
              ['activity','Activity feed'],
              ['familyContact','Family Contacted toggle'],
            ].map(([k,label]) => `
              <label style="display:flex;align-items:center;gap:.5rem;font-size:.9rem;cursor:pointer">
                <input type="checkbox" id="feat-${k}" ${features[k]?'checked':''} onchange="saveFeature('${k}',this.checked)">
                ${label}
              </label>
            `).join('')}
          </div>
          <hr class="divider mt-3 mb-3">
          <p class="text-sm text-muted mb-2">Stat cards shown on the Students page:</p>
          <div style="display:flex;flex-direction:column;gap:.6rem">
            ${[
              ['totalStudents','Total Students'],
              ['totalInteractions','Total Interactions'],
              ['interactionsThisMonth','This Month'],
              ['activeLeaders','Active Leaders'],
            ].map(([k,label]) => `
              <label style="display:flex;align-items:center;gap:.5rem;font-size:.9rem;cursor:pointer">
                <input type="checkbox" id="sc-${k}" ${statCards[k]?'checked':''} onchange="saveStatCard('${k}',this.checked)">
                ${label}
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Leader Analytics -->
      <div class="card mb-3">
        <div class="card-header"><h3>Leader Analytics</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-3">Total interactions tracked: <strong>${analytics.total ?? '—'}</strong></p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <h4 style="font-size:.85rem;font-weight:600;margin-bottom:.5rem">Top Leaders</h4>
              ${(analytics.topLeaders||[]).length ? analytics.topLeaders.map(l=>`
                <div class="flex items-center justify-between" style="padding:.3rem 0;border-bottom:1px solid var(--border)">
                  <span class="text-sm">${esc(l.name)}</span>
                  <span class="badge badge-blue">${l.count}</span>
                </div>`).join('') : '<p class="text-sm text-muted">No data yet</p>'}
            </div>
            <div>
              <h4 style="font-size:.85rem;font-weight:600;margin-bottom:.5rem">Most Connected Students</h4>
              ${(analytics.topStudents||[]).length ? analytics.topStudents.map(s=>`
                <div class="flex items-center justify-between" style="padding:.3rem 0;border-bottom:1px solid var(--border)">
                  <span class="text-sm">${esc(s.name)}</span>
                  <span class="badge badge-green">${s.count}</span>
                </div>`).join('') : '<p class="text-sm text-muted">No data yet</p>'}
            </div>
          </div>
        </div>
      </div>

      <!-- Invite Leaders -->
      <div class="card mb-3">
        <div class="card-header"><h3>Invite Leaders</h3></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div>
              <h4 style="font-size:.9rem;font-weight:600;margin-bottom:.5rem">Email Invite</h4>
              <form class="form-stack" onsubmit="sendManualInvite(event)">
                <input class="form-input" name="inviteName" placeholder="Their name" required style="font-size:.85rem">
                <input class="form-input" type="email" name="inviteEmail" placeholder="their@email.com" required style="font-size:.85rem">
                <button class="btn btn-secondary btn-sm" type="submit">Send Invite</button>
              </form>
            </div>
            <div>
              <h4 style="font-size:.9rem;font-weight:600;margin-bottom:.5rem">QR / Link Invite</h4>
              <button class="btn btn-secondary btn-sm" onclick="generateQrInvite()">Generate Invite Link</button>
              <div id="qr-invite-result" class="mt-2"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Leader Management -->
      <div class="card">
        <div class="card-header"><h3>Leaders (${users.length})</h3></div>
        <div class="card-body">
          ${users.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  ${users.map(u => `
                    <tr>
                      <td class="text-sm">${esc(u.name||'')}</td>
                      <td class="text-sm">${esc(u.email||'')}</td>
                      <td><span class="badge badge-blue">${esc(u.role||'')}</span></td>
                      <td><span class="badge ${u.status==='approved'?'badge-green':'badge-gray'}">${esc(u.status||'pending')}</span></td>
                      <td>
                        ${u.email !== state.user?.email ? `
                          <div class="flex gap-2">
                            ${u.status !== 'approved' ? `<button class="btn btn-primary btn-sm" onclick="updateLeader('${esc(u.email)}','${esc(u.role||'leader')}','approved',true)">Approve</button>` : ''}
                            <button class="btn btn-ghost btn-sm" onclick="showUpdateLeaderModal('${esc(u.email)}','${esc(u.role||'leader')}','${esc(u.status||'')}')">Edit</button>
                          </div>
                        ` : '<span class="text-sm text-muted">You</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p class="text-sm text-muted">No leaders yet.</p>'}
        </div>
      </div>
    </div>
  `;

  window.saveAdminSettings = async function(e) {
    e.preventDefault();
    const name = document.getElementById('admin-ministry-name').value;
    await api('POST', 'settings', { ministryName: name });
    toast('Ministry name saved', 'success');
  };

  window.saveFeature = async function(key, val) {
    const current = state.settings?.features || {};
    await api('POST', 'settings', { features: { ...current, [key]: val } });
    if (state.settings) state.settings.features = { ...current, [key]: val };
  };

  window.saveStatCard = async function(key, val) {
    const current = state.settings?.statCards || {};
    await api('POST', 'settings', { statCards: { ...current, [key]: val } });
    if (state.settings) state.settings.statCards = { ...current, [key]: val };
  };

  window.archiveGraduates = async function() {
    if (!confirm('Archive all Grade 12 students?')) return;
    const data = await api('POST', 'admin/archive-graduates');
    if (data.success) { toast(`Archived ${data.archived} students`, 'success'); state.roster = null; }
    else toast(data.error || 'Failed', 'error');
  };

  window.confirmDeleteMinistry = function() {
    const name = state.settings?.ministryName || state.user?.orgName || '';
    showModal(`
      <div class="modal-header"><h2 class="modal-title" style="color:var(--red)">Delete Ministry</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <p class="text-sm text-muted mb-3">This will permanently delete <strong>${esc(name)}</strong> and all its data. This cannot be undone.</p>
        <div class="form-group">
          <label class="form-label">Type the ministry name to confirm</label>
          <input class="form-input" id="delete-confirm-name" placeholder="${esc(name)}">
        </div>
        <div id="delete-error" class="form-error hidden"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="deleteMinistry('${esc(name)}')">Delete permanently</button>
      </div>
    `);
  };

  window.deleteMinistry = async function(expectedName) {
    const confirmName = document.getElementById('delete-confirm-name')?.value;
    if (confirmName !== expectedName) {
      document.getElementById('delete-error').textContent = 'Name does not match';
      document.getElementById('delete-error').classList.remove('hidden');
      return;
    }
    const data = await api('DELETE', 'admin/ministry', { confirmName });
    if (data.success) { closeModal(); toast('Ministry deleted', 'success'); await doLogout(); }
    else toast(data.error || 'Failed', 'error');
  };

  window.sendManualInvite = async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await api('POST', 'admin/invite/manual', { name: fd.get('inviteName'), email: fd.get('inviteEmail') });
    if (data.success) { toast('Invite sent', 'success'); e.target.reset(); }
    else toast(data.error || 'Failed', 'error');
  };

  window.generateQrInvite = async function() {
    const data = await api('POST', 'admin/invite/qr', {});
    const result = document.getElementById('qr-invite-result');
    if (data.inviteLink) {
      result.innerHTML = `
        <div style="font-size:.8rem;word-break:break-all;background:var(--surface-2);padding:.5rem;border-radius:var(--radius-sm);margin-bottom:.5rem">${esc(data.inviteLink)}</div>
        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${esc(data.inviteLink)}').then(()=>toast('Copied!','success'))">Copy Link</button>
        <div id="qr-canvas" style="margin-top:.5rem"></div>
      `;
      // Load QR code library and render
      if (!window.QRCode) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        script.onload = () => { new window.QRCode(document.getElementById('qr-canvas'), { text: data.inviteLink, width: 128, height: 128 }); };
        document.head.appendChild(script);
      } else {
        new window.QRCode(document.getElementById('qr-canvas'), { text: data.inviteLink, width: 128, height: 128 });
      }
    } else { toast(data.error || 'Failed', 'error'); }
  };

  window.updateLeader = async function(email, role, status, notify) {
    const data = await api('POST', 'admin/update', { email, role, status, notifyUser: !!notify });
    if (data.success) { toast('Updated', 'success'); renderAdminLand(); }
    else toast(data.error || 'Failed', 'error');
  };

  window.showUpdateLeaderModal = function(email, currentRole, currentStatus) {
    showModal(`
      <div class="modal-header"><h2 class="modal-title">Edit Leader</h2><button class="modal-close" onclick="closeModal()">✕</button></div>
      <div class="modal-body">
        <p class="text-sm text-muted mb-3">${esc(email)}</p>
        <div class="form-group">
          <label class="form-label">Role</label>
          <select class="form-input form-select" id="edit-role">
            ${['pending','approved','leader','admin'].map(r => `<option value="${r}" ${r===currentRole?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-input form-select" id="edit-status">
            ${['pending_approval','approved'].map(s => `<option value="${s}" ${s===currentStatus?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <label style="display:flex;align-items:center;gap:.5rem;font-size:.875rem;margin-top:.5rem">
          <input type="checkbox" id="edit-notify" checked> Notify user by email
        </label>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="updateLeader('${esc(email)}',document.getElementById('edit-role').value,document.getElementById('edit-status').value,document.getElementById('edit-notify').checked);closeModal()">Save</button>
      </div>
    `);
  };
}

// ═══════════════════════════════════════════════════════════════
// OWNER DASHBOARD (Phase 5C)
// ═══════════════════════════════════════════════════════════════

async function renderOwnerDashboard() {
  mount(`
    <div class="auth-page">
      <div class="auth-card card card-body">
        <div class="auth-logo">StoryTrackr Owner</div>
        <h1 class="auth-title" style="font-size:1.4rem">Owner Dashboard</h1>
        <div class="form-group">
          <label class="form-label">Owner Secret</label>
          <input class="form-input" type="password" id="owner-secret" placeholder="Bearer token" value="${esc(sessionStorage.getItem('ownerSecret')||'')}">
        </div>
        <button class="btn btn-primary btn-full" onclick="loadOwnerData()">Load Ministries</button>
        <div id="owner-content" class="mt-3"></div>
      </div>
    </div>
  `);

  window.loadOwnerData = async function() {
    const secret = document.getElementById('owner-secret')?.value;
    sessionStorage.setItem('ownerSecret', secret);
    const container = document.getElementById('owner-content');
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div></div>`;
    try {
      const res = await fetch('/api/owner/ministries', { headers: { 'Authorization': `Bearer ${secret}` } });
      const data = await res.json();
      if (!data.ministries) { container.innerHTML = `<p class="text-sm" style="color:var(--red)">${esc(data.error||'Unauthorized')}</p>`; return; }
      const ms = data.ministries;
      container.innerHTML = `
        <p class="text-sm text-muted mb-2">${ms.length} ministries</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Students</th><th>Leaders</th><th>Activity</th><th>Created</th><th></th></tr></thead>
            <tbody>
              ${ms.map(m => `
                <tr>
                  <td class="text-sm font-bold">${esc(m.name)}</td>
                  <td class="text-sm">${m.studentCount}</td>
                  <td class="text-sm">${m.leaderCount}</td>
                  <td class="text-sm">${m.activityCount}</td>
                  <td class="text-sm">${m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="ownerDeleteMinistry('${esc(m.id)}','${esc(m.name)}')">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch(e) { container.innerHTML = `<p style="color:var(--red)">Error: ${esc(e.message)}</p>`; }
  };

  window.ownerDeleteMinistry = async function(id, name) {
    if (!confirm(`Delete ministry "${name}"? This cannot be undone.`)) return;
    const secret = document.getElementById('owner-secret')?.value;
    const res = await fetch(`/api/owner/ministry/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${secret}` } });
    const data = await res.json();
    if (data.success) { toast(`Deleted (${data.deleted} keys)`, 'success'); loadOwnerData(); }
    else toast(data.error || 'Failed', 'error');
  };

  // Auto-load if secret is already set
  if (sessionStorage.getItem('ownerSecret')) loadOwnerData();
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS (extended — Phase 7)
// ═══════════════════════════════════════════════════════════════

async function renderSettings() {
  mount(appShell(`<div class="loading-state"><div class="spinner"></div></div>`, 'settings'));
  const orgId = state.user?.orgId || 'default';
  const data = await api('GET', `settings/public?orgId=${encodeURIComponent(orgId)}`);
  const s    = data;
  const prefs = state.user?.preferences || {};

  document.getElementById('main-content').innerHTML = `
    <div class="page">
      <h1>Settings</h1>
      ${state.isDemoMode ? `<div class="demo-banner mt-2 mb-3" style="border-radius:var(--radius)">Settings are read-only in demo mode.</div>` : ''}

      <!-- Profile -->
      <div class="card mb-3">
        <div class="card-header"><h3>Profile</h3></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
            <div class="student-detail-avatar" style="width:64px;height:64px;cursor:pointer;position:relative" onclick="${state.isDemoMode?'':'triggerLeaderPhotoUpload()'}">
              ${state.user?.photoUrl ? `<img src="${esc(state.user.photoUrl)}" alt="">` : `<span>${(state.user?.name||'?').charAt(0).toUpperCase()}</span>`}
              ${!state.isDemoMode ? `<div style="position:absolute;bottom:-2px;right:-2px;background:var(--primary);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.6rem">📷</div>` : ''}
            </div>
            <div>
              <div class="font-bold">${esc(state.user?.name||'')}</div>
              <div class="text-sm text-muted">${esc(state.user?.email||'')}</div>
            </div>
          </div>
          <input type="file" id="leader-photo-file" accept="image/*" class="hidden" onchange="handleLeaderPhotoUpload(event)">
          ${!state.isDemoMode ? `
            <form class="form-stack" id="profile-form" onsubmit="saveProfile(event)">
              <div class="form-group">
                <label class="form-label">Display name</label>
                <input class="form-input" name="name" value="${esc(state.user?.name||'')}">
              </div>
              <div class="form-group">
                <label class="form-label">Leader since</label>
                <input class="form-input" name="leaderSince" value="${esc(state.user?.leaderSince||'')}" placeholder="2021">
              </div>
              <div class="form-group">
                <label class="form-label">Fun fact</label>
                <input class="form-input" name="funFact" value="${esc(state.user?.funFact||'')}" placeholder="Something fun about you">
              </div>
              <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Save Profile</button>
            </form>
          ` : ''}
        </div>
      </div>

      <!-- Appearance -->
      <div class="card mb-3">
        <div class="card-header"><h3>Appearance</h3></div>
        <div class="card-body">
          <form class="form-stack" id="appearance-form" onsubmit="saveAppearance(event)">
            <div class="form-group">
              <label class="form-label">Theme</label>
              <select class="form-input form-select" name="theme" ${state.isDemoMode?'disabled':''}>
                <option value="auto" ${(prefs.theme||'auto')==='auto'?'selected':''}>Auto (system)</option>
                <option value="light" ${prefs.theme==='light'?'selected':''}>Light</option>
                <option value="dark" ${prefs.theme==='dark'?'selected':''}>Dark</option>
              </select>
            </div>
            <label style="display:flex;align-items:center;gap:.5rem;font-size:.9rem;cursor:pointer">
              <input type="checkbox" name="compactMode" ${prefs.compactMode?'checked':''} ${state.isDemoMode?'disabled':''}>
              Compact mode (reduced spacing)
            </label>
            <label style="display:flex;align-items:center;gap:.5rem;font-size:.9rem;cursor:pointer">
              <input type="checkbox" name="stickyBottomNav" ${prefs.stickyBottomNav===false?'':'checked'} ${state.isDemoMode?'disabled':''}>
              Sticky bottom navigation
            </label>
            ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Save Appearance</button>` : ''}
          </form>
        </div>
      </div>

      <!-- Organization -->
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
            <div class="form-group">
              <label class="form-label">Inactivity threshold (days)</label>
              <input class="form-input" type="number" name="inactivityDays" value="${s.inactivityDays ?? 90}" min="7" max="365" ${state.isDemoMode ? 'readonly' : ''}>
            </div>
            ${!state.isDemoMode ? `<button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Save</button>` : ''}
          </form>
        </div>
      </div>

      <!-- Security -->
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
              <button class="btn btn-secondary btn-sm" type="submit" style="align-self:flex-start">Change password</button>
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

  window.saveProfile = async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updates = { name: fd.get('name'), leaderSince: fd.get('leaderSince'), funFact: fd.get('funFact') };
    const data = await api('POST', 'profile/update', updates);
    if (data.success) {
      state.user = { ...state.user, ...updates };
      toast('Profile saved', 'success');
    } else toast(data.error || 'Failed', 'error');
  };

  window.saveAppearance = async function(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const prefs = {
      theme: fd.get('theme') || 'auto',
      compactMode: fd.get('compactMode') === 'on',
      stickyBottomNav: fd.get('stickyBottomNav') === 'on',
    };
    const data = await api('POST', 'profile/update', { preferences: prefs });
    if (data.success) {
      state.user = { ...state.user, preferences: prefs };
      applyTheme(prefs);
      toast('Appearance saved', 'success');
    } else toast(data.error || 'Failed', 'error');
  };

  window.saveOrgSettings = async function(e) {
    e.preventDefault();
    if (demoBlock()) return;
    const fd = new FormData(e.target);
    await api('POST', 'settings', { ministryName: fd.get('ministryName'), campus: fd.get('campus'), inactivityDays: Number(fd.get('inactivityDays')) });
    state.settings = null; // invalidate cache
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

  window.triggerLeaderPhotoUpload = function() { document.getElementById('leader-photo-file')?.click(); };

  window.handleLeaderPhotoUpload = async function(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    openCropModal(file, async blob => {
      const form = new FormData();
      form.append('file', blob, 'photo.jpg');
      try {
        const res = await fetch('/api/upload-photo?type=leader', { method:'POST', credentials:'include', body:form });
        const data = await res.json();
        if (data.url) {
          await api('POST', 'profile/update', { photoUrl: data.url });
          state.user = { ...state.user, photoUrl: data.url };
          toast('Photo updated', 'success');
          renderSettings();
        }
      } catch(_) { toast('Upload failed', 'error'); }
    });
  };
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
