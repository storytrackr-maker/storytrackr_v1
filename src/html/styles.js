export const CSS = `
/* ── RESET & VARS ──────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --surface2: #18181f;
  --surface3: #202028;
  --surface4: #28283a;
  --accent: #f5c842;
  --accent2: #f0a800;
  --accent-glow: rgba(245,200,66,.14);
  --accent-border: rgba(245,200,66,.28);
  --text: #f0f0f8;
  --text2: #b0b0c8;
  --muted: #5a5a78;
  --connected: #4ade80;
  --not-connected: #f87171;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.11);
  --warning: #fbbf24;
  --radius: 14px;
  --radius-sm: 9px;
  --radius-lg: 20px;
  --shadow: 0 8px 32px rgba(0,0,0,.5);
  --shadow-lg: 0 24px 64px rgba(0,0,0,.7);
  --ease: cubic-bezier(.22,1,.36,1);
}
/* ── LIGHT THEME ───────────────────────────────────────────── */
:root[data-theme="light"] {
  --bg: #f5f5f7;
  --surface: #ffffff;
  --surface2: #f5f5f7;
  --surface3: #ebebed;
  --surface4: #d8d8db;
  --text: #1d1d1f;
  --text2: #6e6e73;
  --muted: #8e8e93;
  --border: rgba(0,0,0,0.07);
  --border2: rgba(0,0,0,0.12);
  --shadow: 0 2px 20px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.12);
  --accent-glow: rgba(245,200,66,0.2);
  --accent-border: rgba(200,140,0,0.35);
}
:root[data-theme="light"] .top-nav {
  background: rgba(245,245,247,0.88);
}
:root[data-theme="light"] .bottom-nav {
  background: rgba(245,245,247,0.92);
}
:root[data-theme="light"] .mobile-nav-drawer {
  background: rgba(245,245,247,0.97);
}
:root[data-theme="light"] .modal {
  background: var(--surface);
}
:root[data-theme="light"] .field input,
:root[data-theme="light"] .field textarea,
:root[data-theme="light"] .field select {
  color: var(--text);
}
:root[data-theme="light"] .search-input {
  color: var(--text);
}
:root[data-theme="light"] .filter-select {
  color: var(--text);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238e8e93' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
}
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  padding-bottom: env(safe-area-inset-bottom);
}

/* ── SCROLLBAR ─────────────────────────────────────────────── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--surface4); border-radius: 3px; }

/* ── BG GLOW ───────────────────────────────────────────────── */
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.bg-glow::before {
  content: ''; position: absolute; width: 900px; height: 900px;
  background: radial-gradient(circle, rgba(245,200,66,.055) 0%, transparent 70%);
  top: -350px; left: -350px; animation: floatA 18s ease-in-out infinite alternate;
}
.bg-glow::after {
  content: ''; position: absolute; width: 700px; height: 700px;
  background: radial-gradient(circle, rgba(245,200,66,.03) 0%, transparent 70%);
  bottom: -250px; right: -250px; animation: floatB 22s ease-in-out infinite alternate;
}
@keyframes floatA { to { transform: translate(160px,140px); } }
@keyframes floatB { to { transform: translate(-140px,-110px); } }

/* ── SCREENS ───────────────────────────────────────────────── */
.screen { display: none; position: relative; z-index: 1; }
.screen.active { display: block; }

/* ── GATE ──────────────────────────────────────────────────── */
#screen-gate {
  min-height: 100vh; display: none; align-items: center;
  justify-content: center; padding: 24px;
  padding-top: max(env(safe-area-inset-top), 24px);
}
#screen-gate.active { display: flex; }
.gate-box { width: 100%; max-width: 560px; text-align: center; }
.gate-logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(64px,16vw,110px);
  letter-spacing: .06em; line-height: .9; color: var(--text);
  animation: fadeDown .7s var(--ease) both;
}
.gate-logo span { color: var(--accent); }
.gate-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: .28em; text-transform: uppercase;
  color: var(--muted); margin: 10px 0 40px;
  animation: fadeDown .7s .1s var(--ease) both;
}
.gate-form { display: flex; flex-direction: column; gap: 12px; max-width: 380px; margin: 0 auto; width: 100%; animation: fadeDown .7s .2s var(--ease) both; }
.gate-input {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--radius); padding: 15px 18px; color: var(--text);
  font-size: 16px; outline: none; text-align: center;
  letter-spacing: .1em; font-family: 'Inter', sans-serif;
  transition: border-color .2s, box-shadow .2s;
}
.gate-input:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }
.gate-input::placeholder { color: var(--muted); letter-spacing: .04em; }
.gate-btn {
  background: var(--accent); border: none; color: #000;
  font-family: 'Inter', sans-serif; font-weight: 700; font-size: 15px;
  padding: 15px; border-radius: var(--radius); cursor: pointer;
  transition: opacity .2s, transform .2s, box-shadow .2s;
}
.gate-btn:hover { opacity: .9; transform: scale(1.02); box-shadow: 0 8px 28px rgba(245,200,66,.35); }
.gate-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.gate-error { font-size: 12px; color: var(--not-connected); font-family: 'JetBrains Mono', monospace; min-height: 18px; margin-top: 4px; }
/* Two-lane home screen */
.gate-lanes {
  display: flex; gap: 16px; margin-bottom: 28px;
  animation: fadeDown .7s .2s var(--ease) both;
}
.gate-lane {
  flex: 1; background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--radius-lg); padding: 28px 18px 22px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  transition: border-color .2s, transform .2s;
}
.gate-lane:hover { border-color: var(--accent-border); transform: translateY(-2px); }
.gate-lane-leader { border-color: rgba(99,102,241,.2); }
.gate-lane-leader:hover { border-color: rgba(99,102,241,.45); }
.lane-icon { font-size: 30px; line-height: 1; }
.lane-title { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: .06em; }
.lane-desc { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; text-align: center; line-height: 1.5; }
.lane-btn {
  margin-top: 8px; width: 100%; padding: 12px; border-radius: var(--radius);
  font-weight: 700; font-size: 13px; cursor: pointer;
  transition: opacity .2s, transform .2s;
}
.lane-btn:hover { opacity: .88; transform: scale(1.02); }
.lane-btn-view {
  background: var(--surface2); border: 1px solid var(--border2); color: var(--text2);
}
.lane-btn-view:hover { border-color: var(--accent-border); color: var(--accent); }
.lane-btn-leader {
  background: var(--accent); border: none; color: #000;
}
.lane-btn-leader:hover { box-shadow: 0 6px 20px rgba(245,200,66,.35); }
/* Gate sub-form navigation */
.gate-form-back {
  display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
}
.back-btn {
  background: none; border: none; color: var(--muted); font-size: 13px;
  cursor: pointer; padding: 4px 0; transition: color .2s; font-family: 'Inter', sans-serif;
}
.back-btn:hover { color: var(--text); }
.form-title {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .2em; text-transform: uppercase; color: var(--muted);
}
.gate-link {
  display: block; margin-top: 8px; font-size: 12px; color: var(--muted);
  text-decoration: none; font-family: 'JetBrains Mono', monospace;
  transition: color .2s;
}
.gate-link:hover { color: var(--text); }
.gate-need-access {
  display: inline-block; margin-top: 28px; font-size: 11px; color: var(--muted);
  text-decoration: none; font-family: 'JetBrains Mono', monospace;
  letter-spacing: .1em; transition: color .2s;
}
.gate-need-access:hover { color: var(--accent); }
@media (max-width: 480px) {
  .gate-lanes { flex-direction: column; }
  .gate-box { max-width: 360px; }
}

/* ── NAV ───────────────────────────────────────────────────── */
.top-nav {
  position: sticky; top: 0; z-index: 200;
  background: rgba(10,10,15,.88);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border-bottom: 1px solid var(--border);
  padding-top: env(safe-area-inset-top);
}
.nav-inner {
  max-width: 1200px; margin: 0 auto; height: 56px;
  padding: 0 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.nav-logo {
  font-family: 'Bebas Neue', sans-serif; font-size: 21px; letter-spacing: .1em;
  color: var(--text); user-select: none;
}
.nav-logo span { color: var(--accent); }
.nav-pills { display: flex; gap: 3px; }
.nav-pill {
  font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 30px;
  border: none; cursor: pointer; background: transparent; color: var(--muted);
  transition: background .2s, color .2s;
}
.nav-pill:hover { color: var(--text); background: var(--surface2); }
.nav-pill.active { background: var(--accent); color: #000; font-weight: 600; }
.nav-right { display: flex; align-items: center; gap: 8px; }
.nav-btn {
  font-size: 12px; font-weight: 500; padding: 7px 14px; border-radius: 30px;
  border: 1px solid var(--border2); background: transparent; color: var(--text2);
  cursor: pointer; transition: all .2s;
}
.nav-btn:hover { background: var(--surface2); color: var(--text); }
.nav-btn.primary { background: var(--accent); border-color: var(--accent); color: #000; font-weight: 700; }
.nav-btn.primary:hover { opacity: .88; box-shadow: 0 4px 18px rgba(245,200,66,.35); }
.nav-btn.danger { color: var(--not-connected); border-color: rgba(248,113,113,.2); }
.nav-btn.danger:hover { background: rgba(248,113,113,.08); }
.nav-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--accent); display: flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: 700; color: #000;
  cursor: pointer; border: none; transition: transform .2s, box-shadow .2s;
}
.nav-avatar:hover { transform: scale(1.1); box-shadow: 0 4px 16px rgba(245,200,66,.4); }
.nav-avatar.has-photo { padding: 0; background: transparent; border: 1px solid var(--accent-border); }
.nav-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
.nav-hamburger {
  display: none; flex-direction: column; justify-content: center; align-items: center;
  gap: 5px; width: 36px; height: 36px; background: transparent; border: 1px solid var(--border2);
  border-radius: 8px; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .2s, border-color .2s;
}
.nav-hamburger:hover { background: var(--surface2); border-color: var(--accent-border); }
.nav-hamburger span { display: block; width: 16px; height: 2px; background: var(--text2); border-radius: 2px; transition: background .2s; }
.nav-hamburger:hover span { background: var(--text); }
.mobile-nav-overlay {
  display: none; position: fixed; inset: 0; z-index: 190;
  background: rgba(0,0,0,.5); backdrop-filter: blur(2px);
}
.mobile-nav-overlay.open { display: block; }
.mobile-nav-drawer {
  display: none; position: fixed; top: calc(env(safe-area-inset-top) + 56px); left: 0; right: 0; z-index: 195;
  background: rgba(10,10,15,.97); border-bottom: 1px solid var(--border);
  flex-direction: column; gap: 4px; padding: 8px 16px 16px;
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
}
.mobile-nav-drawer.open { display: flex; }
.mob-nav-pill {
  font-size: 15px; font-weight: 500; padding: 12px 16px; border-radius: var(--radius-sm);
  border: none; cursor: pointer; background: transparent; color: var(--muted);
  text-align: left; transition: background .2s, color .2s;
}
.mob-nav-pill:hover { color: var(--text); background: var(--surface2); }
.mob-nav-pill.active { color: var(--accent); background: var(--accent-glow); }
.role-badge {
  font-size: 10px; font-family: 'JetBrains Mono', monospace;
  padding: 2px 8px; border-radius: 20px; letter-spacing: .06em; text-transform: uppercase;
}
.role-badge.approved { background: rgba(74,222,128,.1); color: var(--connected); border: 1px solid rgba(74,222,128,.2); }
.role-badge.admin    { background: var(--accent-glow); color: var(--accent); border: 1px solid var(--accent-border); }
.role-badge.leader   { background: rgba(99,102,241,.12); color: #818cf8; border: 1px solid rgba(99,102,241,.25); }
.role-badge.pending  { background: rgba(251,191,36,.08); color: var(--warning); border: 1px solid rgba(251,191,36,.2); }

/* ── CONTAINER ─────────────────────────────────────────────── */
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px 60px; position: relative; z-index: 1; }

/* ── HEADER ────────────────────────────────────────────────── */
header { padding: 44px 0 24px; text-align: center; }
.logo-line {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(56px, 12vw, 120px);
  letter-spacing: .06em; line-height: .9; color: var(--text);
  animation: fadeDown .7s var(--ease) both;
}
.logo-line span { color: var(--accent); }
.subtitle {
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  letter-spacing: .28em; text-transform: uppercase; color: var(--muted);
  margin-top: 10px; animation: fadeDown .7s .12s var(--ease) both;
}

/* ── ANIMATIONS ────────────────────────────────────────────── */
@keyframes fadeDown { from { opacity:0; transform:translateY(-14px); } to { opacity:1; transform:none; } }
@keyframes fadeUp   { from { opacity:0; transform:translateY(14px);  } to { opacity:1; transform:none; } }
@keyframes fadeIn   { from { opacity:0; }                              to { opacity:1; } }
@keyframes cardIn   { to   { opacity:1; transform:translateY(0);   } }
@keyframes spin     { to   { transform: rotate(360deg); } }

/* ── BANNERS ───────────────────────────────────────────────── */
.readonly-banner {
  background: rgba(245,200,66,.04); border: 1px solid var(--accent-border);
  border-radius: var(--radius); padding: 12px 18px; margin-bottom: 22px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.readonly-banner p { font-size: 13px; color: var(--text2); }

/* ── TABS (HS/MS) ──────────────────────────────────────────── */
.seg-tabs {
  display: flex; gap: 0; background: var(--surface); border-radius: 30px;
  padding: 4px; width: fit-content; margin: 0 auto 20px;
  animation: fadeDown .7s .18s var(--ease) both;
}
.seg-btn {
  font-size: 13px; font-weight: 500; padding: 8px 22px; border-radius: 30px;
  border: none; cursor: pointer; background: transparent; color: var(--muted);
  transition: all .22s;
}
.seg-btn.active { background: var(--accent); color: #000; font-weight: 700; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* ── SEARCH ────────────────────────────────────────────────── */
.search-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.search-wrap { position: relative; flex: 1; }
.search-icon { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 15px; pointer-events: none; }
.search-clear {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  background: var(--surface3); border: none; border-radius: 50%;
  width: 20px; height: 20px; display: none; align-items: center; justify-content: center;
  font-size: 10px; color: var(--muted); cursor: pointer; padding: 0;
}
.search-clear.visible { display: flex; }
.search-input {
  width: 100%; background: var(--surface); border: 1px solid var(--border2);
  border-radius: 30px; padding: 11px 36px 11px 40px; color: var(--text);
  font-size: 14px; outline: none; font-family: 'Inter', sans-serif;
  transition: border-color .2s, box-shadow .2s;
}
.search-input:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }
.search-input::placeholder { color: var(--muted); }
.filter-toggle-btn {
  display: flex; align-items: center; gap: 7px; white-space: nowrap;
  padding: 10px 16px; border-radius: 30px;
  background: var(--surface); border: 1px solid var(--border2);
  color: var(--text2); font-size: 13px; cursor: pointer;
  transition: all .2s; font-family: 'Inter', sans-serif;
}
.filter-toggle-btn:hover { border-color: var(--accent-border); color: var(--text); }
.filter-toggle-btn.active { border-color: var(--accent-border); color: var(--accent); background: var(--accent-glow); }
.filter-toggle-btn.has-filters { border-color: var(--accent-border); color: var(--accent); }
.filter-count {
  display: none; background: var(--accent); color: #000;
  border-radius: 20px; padding: 1px 7px; font-size: 11px; font-weight: 700;
  font-family: 'Inter', sans-serif;
}
.filter-count.visible { display: inline-block; }
.filter-panel {
  display: none; background: var(--surface2); border: 1px solid var(--border2);
  border-radius: var(--radius); padding: 14px 16px;
  margin-bottom: 16px; animation: fadeDown .2s var(--ease);
}
.filter-panel.open { display: block; }

/* ── STATS ─────────────────────────────────────────────────── */
.stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 28px; }
.stat {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 15px 20px;
  display: flex; flex-direction: column; gap: 3px;
  transition: border-color .2s, transform .2s;
}
.stat:hover { border-color: var(--accent-border); transform: translateY(-2px); }
.stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 38px; line-height: 1; color: var(--accent); }
.stat-label { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: .12em; text-transform: uppercase; }

/* ── SECTION HEADERS ───────────────────────────────────────── */
.section-header { display: flex; align-items: center; gap: 12px; margin: 30px 0 14px; }
.section-label {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .3em; text-transform: uppercase; color: var(--accent);
  padding: 0 0 0 11px; border-left: 2px solid var(--accent);
}
.add-btn {
  margin-left: auto; background: transparent;
  border: 1px solid var(--accent-border); color: var(--accent);
  font-size: 12px; font-weight: 500; padding: 5px 14px; border-radius: 30px;
  cursor: pointer; transition: all .2s;
}
.add-btn:hover { background: var(--accent); color: #000; }
.sect-divider {
  height: 1px; margin: 36px 0 28px;
  background: linear-gradient(90deg, transparent, var(--border2), transparent);
}

/* ── ROSTER GRID ───────────────────────────────────────────── */
.roster-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px; margin-bottom: 20px;
}
.card {
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: var(--radius-lg); padding: 20px 18px 16px;
  position: relative; overflow: hidden; cursor: pointer;
  opacity: 0; transform: translateY(20px);
  animation: cardIn .45s var(--ease) forwards;
  transition: transform .28s var(--ease), border-color .28s, box-shadow .28s;
}
.card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--accent-glow) 0%, transparent 60%);
  opacity: 0; transition: opacity .28s; pointer-events: none;
}
.card:hover { transform: translateY(-4px); border-color: var(--accent-border); box-shadow: 0 12px 40px rgba(245,200,66,.1); }
.card:hover::before { opacity: 1; }
.card:nth-child(1){animation-delay:.04s}.card:nth-child(2){animation-delay:.08s}.card:nth-child(3){animation-delay:.12s}.card:nth-child(4){animation-delay:.16s}.card:nth-child(5){animation-delay:.20s}.card:nth-child(6){animation-delay:.24s}.card:nth-child(7){animation-delay:.28s}.card:nth-child(8){animation-delay:.32s}.card:nth-child(n+9){animation-delay:.36s}

.card-avatar { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 14px; position: relative; overflow: hidden; border: 2px solid var(--border2); flex-shrink: 0; cursor: pointer; }
.av-fallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #000; }
.card-avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; opacity: 0; transition: opacity .35s; }
.card-avatar img.loaded { opacity: 1; }
.av-edit-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.45); display: flex; align-items: center;
  justify-content: center; font-size: 20px; opacity: 0;
  transition: opacity .2s; pointer-events: none; z-index: 1;
}
.card-avatar:hover .av-edit-overlay, .card-avatar:active .av-edit-overlay { opacity: 1; }
.card-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.card-name { font-size: 16px; font-weight: 700; line-height: 1.2; flex: 1; }
.badge-grade { font-family: 'JetBrains Mono', monospace; font-size: 9px; background: var(--accent-glow); color: var(--accent); border: 1px solid var(--accent-border); border-radius: 20px; padding: 2px 6px; }
.card-meta { display: flex; flex-direction: column; gap: 3px; margin-top: 2px; }
.meta-item { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; display: flex; gap: 5px; align-items: flex-start; }
.badge-status { display: inline-block; font-size: 9px; font-family: 'JetBrains Mono', monospace; letter-spacing: .06em; padding: 3px 8px; border-radius: 20px; margin-top: 8px; }
.badge-status.connected    { background: rgba(74,222,128,.08); color: var(--connected); border: 1px solid rgba(74,222,128,.18); }
.badge-status.not-connected { background: rgba(248,113,113,.07); color: var(--not-connected); border: 1px solid rgba(248,113,113,.16); }
.card-edit-btn { position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%; background: transparent; border: 1px solid transparent; color: var(--muted); font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: all .2s; }
.card:hover .card-edit-btn { opacity: 1; }
.card-edit-btn:hover { background: var(--accent-glow); border-color: var(--accent-border); color: var(--accent); }
.goal-bar-wrap { margin-top: 10px; }
.goal-bar-label { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; margin-bottom: 3px; }
.goal-bar-track { height: 3px; background: var(--surface4); border-radius: 2px; overflow: hidden; }
.goal-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .6s var(--ease); }
.goal-primary { font-size: 10px; color: var(--accent); margin-top: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── EMPTY / LOADER ────────────────────────────────────────── */
.empty { text-align: center; padding: 48px 20px; color: var(--muted); }
.empty-icon { font-size: 44px; margin-bottom: 10px; }
.empty p { font-size: 14px; }
.loader { display: flex; align-items: center; justify-content: center; padding: 60px; }
.loader-ring { width: 38px; height: 38px; border: 3px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }

/* ── STUDENT DETAIL ────────────────────────────────────────── */
.student-back { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); cursor: pointer; padding: 20px 0 0; transition: color .2s; background: none; border: none; }
.student-back:hover { color: var(--text); }
.student-hero { display: flex; align-items: flex-start; gap: 26px; padding: 28px 0 22px; flex-wrap: wrap; }
.student-avatar-lg { width: 96px; height: 96px; border-radius: 50%; border: 3px solid var(--accent-border); position: relative; overflow: hidden; flex-shrink: 0; box-shadow: 0 0 0 6px var(--accent-glow); }
.student-avatar-lg .av-fallback { font-size: 34px; }
.student-avatar-lg img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; opacity: 0; transition: opacity .35s; }
.student-avatar-lg img.loaded { opacity: 1; }
.student-info { flex: 1; min-width: 200px; }
.student-name { font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px,8vw,60px); letter-spacing: .04em; line-height: 1; }
.student-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
.chip { font-size: 11px; font-family: 'JetBrains Mono', monospace; background: var(--surface2); border: 1px solid var(--border2); border-radius: 30px; padding: 4px 10px; color: var(--text2); }
.student-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 4px; padding-bottom: 60px; }
@media (max-width: 680px) {
  .student-grid { grid-template-columns: 1fr; }
  .nav-pills { display: none; }
  .nav-hamburger { display: none !important; }
  .mobile-nav-overlay, .mobile-nav-drawer { display: none !important; }
  .roster-grid { grid-template-columns: 1fr 1fr !important; }
  .student-hero { gap: 16px; }
  .student-avatar-lg { width: 72px; height: 72px; }
  .user-table { font-size: 12px; }
  .user-table th, .user-table td { padding: 8px 6px; }
  .btn-row { gap: 4px; }
  .role-btn { font-size: 9px; padding: 3px 7px; }
  .modal { padding: 20px; margin: 10px; }
  .modal-title { font-size: 24px; }
  .admin-title { font-size: 32px; }
  .kpi-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  #screen-app .container { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)); }
  .toast { bottom: calc(72px + env(safe-area-inset-bottom, 12px)); }
}

/* ── BOTTOM NAV ────────────────────────────────────────────── */
.bottom-nav { display: none; }
@media (max-width: 680px) {
  .bottom-nav {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: rgba(10,10,15,0.92);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border-top: 1px solid var(--border2);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    padding-top: 6px;
  }
  .bnav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 3px; padding: 4px 0 8px; border: none; background: none;
    color: var(--muted); font-size: 10px; letter-spacing: .01em; cursor: pointer;
    transition: color .2s;
  }
  .bnav-btn svg { width: 22px; height: 22px; stroke: currentColor; fill: none; flex-shrink: 0; }
  .bnav-btn.active { color: var(--accent); }
  .bnav-btn span { font-family: 'Inter', sans-serif; }
}
.panel {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 22px;
}
.panel.full { grid-column: 1 / -1; }
.panel-title {
  font-size: 11px; font-family: 'JetBrains Mono', monospace;
  letter-spacing: .2em; text-transform: uppercase; color: var(--accent);
  margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between;
}
.panel-title span { color: var(--muted); font-size: 10px; }

/* ── GOALS ─────────────────────────────────────────────────── */
.goal-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--border); animation: fadeIn .3s; }
.goal-item:last-child { border-bottom: none; }
.goal-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border2); background: transparent; cursor: pointer; flex-shrink: 0; transition: all .2s; display: flex; align-items: center; justify-content: center; }
.goal-check.done { background: var(--accent); border-color: var(--accent); }
.goal-check.done::after { content: '✓'; font-size: 11px; color: #000; font-weight: 700; }
.goal-text { flex: 1; font-size: 13px; color: var(--text2); transition: color .2s; }
.goal-text.done { color: var(--muted); text-decoration: line-through; }
.primary-tag { font-size: 9px; font-family: 'JetBrains Mono', monospace; background: var(--accent-glow); color: var(--accent); border: 1px solid var(--accent-border); border-radius: 20px; padding: 2px 6px; flex-shrink: 0; }
.goal-del { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 5px; opacity: 0; transition: all .2s; }
.goal-item:hover .goal-del { opacity: 1; }
.goal-del:hover { color: var(--not-connected); }
.add-goal-row { display: flex; gap: 8px; margin-top: 12px; }
.add-goal-input { flex: 1; background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); padding: 9px 12px; color: var(--text); font-size: 13px; outline: none; font-family: 'Inter', sans-serif; transition: border-color .2s, box-shadow .2s; }
.add-goal-input:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }
.add-goal-input::placeholder { color: var(--muted); }
.add-goal-btn { background: var(--accent); border: none; color: #000; font-weight: 700; font-size: 20px; width: 38px; border-radius: var(--radius-sm); cursor: pointer; transition: opacity .2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.add-goal-btn:hover { opacity: .85; }

/* ── INTERACTION FEED ──────────────────────────────────────── */
.int-item { padding: 12px 0; border-bottom: 1px solid var(--border); animation: fadeUp .3s var(--ease); }
.int-item:last-child { border-bottom: none; }
.int-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.int-av { width: 30px; height: 30px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 12px; color: #000; flex-shrink: 0; }
.int-who { font-size: 13px; font-weight: 600; }
.int-when { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.int-body { font-size: 13px; color: var(--text2); line-height: 1.55; padding-left: 40px; }
.int-edited { font-size: 10px; font-family: 'JetBrains Mono', monospace; color: var(--muted); font-weight: 400; margin-left: 6px; }
.int-actions { display: flex; gap: 6px; padding-left: 40px; margin-top: 6px; opacity: 0; transition: opacity .2s; }
.int-item:hover .int-actions { opacity: 1; }
.int-action-btn { font-size: 11px; padding: 3px 9px; border-radius: 20px; border: 1px solid var(--border2); background: transparent; color: var(--muted); cursor: pointer; font-family: 'Inter', sans-serif; transition: all .2s; }
.int-action-btn:hover { color: var(--text); background: var(--surface2); }
.int-action-btn.danger:hover { color: var(--not-connected); border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.06); }

/* ── ACTIVITY PAGE ─────────────────────────────────────────── */
.activity-list { display: flex; flex-direction: column; gap: 14px; max-width: 680px; margin: 28px auto 0; }
.act-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 18px 20px;
  animation: fadeUp .4s var(--ease); cursor: pointer;
  transition: border-color .2s, transform .2s;
}
.act-card:hover { border-color: var(--accent-border); transform: translateY(-2px); }
.act-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.act-avatars { display: flex; }
.act-av { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--bg); margin-right: -8px; position: relative; overflow: hidden; flex-shrink: 0; }
.act-av .av-fallback { font-size: 13px; }
.act-av img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top center; opacity: 0; transition: opacity .3s; }
.act-av img.loaded { opacity: 1; }
.act-info { flex: 1; margin-left: 16px; }
.act-names { font-size: 14px; font-weight: 600; }
.act-names span { color: var(--accent); }
.act-time { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-top: 2px; }
.act-summary { font-size: 13px; color: var(--text2); line-height: 1.55; }

/* ── BRAIN DUMP ────────────────────────────────────────────── */
.dump-wrap { max-width: 660px; margin: 0 auto; padding: 36px 0 60px; }
.dump-title { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: .06em; }
.dump-sub { font-size: 13px; color: var(--muted); margin: 8px 0 24px; line-height: 1.6; }
.dump-area { width: 100%; background: var(--surface); border: 1px solid var(--border2); border-radius: var(--radius-lg); padding: 18px 20px; min-height: 180px; font-size: 15px; color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.7; outline: none; resize: vertical; transition: border-color .2s, box-shadow .2s; }
.dump-area:focus { border-color: var(--accent-border); box-shadow: 0 0 0 4px var(--accent-glow); }
.dump-area::placeholder { color: var(--muted); }
.dump-submit { width: 100%; margin-top: 12px; background: var(--accent); border: none; color: #000; font-weight: 700; font-size: 15px; padding: 14px; border-radius: var(--radius); cursor: pointer; transition: opacity .2s, box-shadow .2s; }
.dump-submit:hover { opacity: .9; box-shadow: 0 6px 24px rgba(245,200,66,.35); }
.dump-submit:disabled { opacity: .4; cursor: not-allowed; }
.dump-result { margin-top: 22px; background: var(--surface2); border: 1px solid var(--accent-border); border-radius: var(--radius-lg); padding: 20px; animation: fadeIn .4s; }
.dump-result-title { font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
.dump-match { padding: 12px 0; border-bottom: 1px solid var(--border); }
.dump-match:last-child { border-bottom: none; }
.dump-match-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.dump-match-sum { font-size: 13px; color: var(--text2); line-height: 1.5; }
.dump-match-actions { display: flex; gap: 8px; margin-top: 10px; }

/* ── ADMIN ─────────────────────────────────────────────────── */
.admin-tabs { display: flex; gap: 6px; padding: 22px 0 18px; flex-wrap: wrap; }
.admin-tab { font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 30px; cursor: pointer; background: var(--surface); border: 1px solid var(--border); color: var(--muted); transition: all .2s; }
.admin-tab.active { background: var(--accent); border-color: var(--accent); color: #000; font-weight: 700; }
.admin-sec { display: none; }
.admin-sec.active { display: block; }
.admin-title { font-family: 'Bebas Neue', sans-serif; font-size: 44px; letter-spacing: .06em; padding: 28px 0 4px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px,1fr)); gap: 14px; margin-bottom: 28px; }
.kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; transition: border-color .2s; }
.kpi:hover { border-color: var(--accent-border); }
.kpi-val { font-family: 'Bebas Neue', sans-serif; font-size: 46px; color: var(--accent); line-height: 1; }
.kpi-label { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: .12em; margin-top: 4px; text-transform: uppercase; }
.user-table { width: 100%; border-collapse: collapse; }
.user-table th { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
.user-table td { padding: 11px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
.user-table tr:hover td { background: var(--surface2); }
.role-btn { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .06em; padding: 4px 10px; border-radius: 20px; cursor: pointer; border: 1px solid; transition: all .2s; }
.role-btn.approve   { color: var(--connected); border-color: rgba(74,222,128,.3); background: rgba(74,222,128,.07); }
.role-btn.approve:hover { background: rgba(74,222,128,.18); }
.role-btn.revoke    { color: var(--not-connected); border-color: rgba(248,113,113,.3); background: rgba(248,113,113,.07); }
.role-btn.revoke:hover { background: rgba(248,113,113,.18); }
.role-btn.mk-admin  { color: var(--accent); border-color: var(--accent-border); background: var(--accent-glow); }
.role-btn.mk-admin:hover { background: rgba(245,200,66,.22); }
.role-btn.mk-leader { color: #818cf8; border-color: rgba(99,102,241,.3); background: rgba(99,102,241,.08); }
.role-btn.mk-leader:hover { background: rgba(99,102,241,.2); }
.btn-row { display: flex; gap: 6px; flex-wrap: wrap; }

/* ── TOAST ─────────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 28px; left: 50%;
  transform: translateX(-50%) translateY(80px);
  background: var(--surface2); border: 1px solid var(--border2);
  color: var(--text); font-family: 'JetBrains Mono', monospace;
  font-size: 12px; letter-spacing: .06em; padding: 12px 22px;
  border-radius: 30px; z-index: 9999;
  transition: transform .32s var(--ease), opacity .32s;
  opacity: 0; white-space: nowrap; box-shadow: var(--shadow);
  pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.toast.ok    { border-color: rgba(74,222,128,.3); }
.toast.error { border-color: rgba(248,113,113,.4); }

/* ── MODAL ─────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.8);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  z-index: 300; display: flex; align-items: center; justify-content: center;
  padding: 20px; opacity: 0; pointer-events: none; transition: opacity .24s;
}
.modal-overlay.open { opacity: 1; pointer-events: all; }
.modal {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--radius-lg); width: 100%; max-width: 440px;
  max-height: 90vh; overflow-y: auto; padding: 28px; position: relative;
  transform: translateY(22px) scale(.97); transition: transform .32s var(--ease);
  box-shadow: var(--shadow-lg);
}
.modal-overlay.open .modal { transform: none; }
.modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 30px; letter-spacing: .06em; color: var(--text); margin-bottom: 4px; }
.modal-sub { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: .16em; text-transform: uppercase; margin-bottom: 22px; }
.modal-close { position: absolute; top: 16px; right: 16px; background: var(--surface2); border: 1px solid var(--border); color: var(--muted); font-size: 17px; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all .2s; }
.modal-close:hover { color: var(--text); background: var(--surface3); }
.modal-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 22px; }
.modal-tab { flex: 1; padding: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; text-align: center; cursor: pointer; background: none; border: none; color: var(--muted); border-bottom: 2px solid transparent; margin-bottom: -1px; transition: color .2s, border-color .2s; }
.modal-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.field input, .field textarea, .field select {
  background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm);
  padding: 11px 13px; color: var(--text); font-size: 14px; outline: none;
  font-family: 'Inter', sans-serif; transition: border-color .2s, box-shadow .2s;
  width: 100%;
}
.field input:focus, .field textarea:focus, .field select:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }
.field input::placeholder, .field textarea::placeholder { color: var(--muted); }
.field select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a5a78' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
.field select option { background: var(--surface2); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.auth-submit { background: var(--accent); border: none; color: #000; font-weight: 700; font-size: 15px; padding: 13px; border-radius: var(--radius); cursor: pointer; transition: opacity .2s; width: 100%; }
.auth-submit:hover { opacity: .9; }
.auth-submit:disabled { opacity: .45; cursor: not-allowed; }
.auth-msg { font-size: 12px; font-family: 'JetBrains Mono', monospace; min-height: 18px; text-align: center; }
.auth-msg.error { color: var(--not-connected); }
.auth-msg.success { color: var(--connected); }
.connected-toggle { display: flex; align-items: center; gap: 10px; padding: 10px 13px; background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius-sm); cursor: pointer; user-select: none; transition: border-color .2s; }
.connected-toggle:hover { border-color: var(--accent-border); }
.toggle-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--muted); transition: all .2s; flex-shrink: 0; }
.connected-toggle.on .toggle-dot { background: var(--connected); border-color: var(--connected); }
.toggle-label { font-size: 13px; color: var(--muted); transition: color .2s; }
.connected-toggle.on .toggle-label { color: var(--connected); }
.photo-preview { width: 58px; height: 58px; border-radius: 50%; overflow: hidden; border: 2px solid var(--border2); position: relative; flex-shrink: 0; }
.photo-preview .av-fallback { font-size: 20px; }
.photo-preview img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .3s; }
.photo-preview img.loaded { opacity: 1; }
.modal-actions { display: flex; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
.btn-save { flex: 1; background: var(--accent); border: none; color: #000; font-weight: 700; font-size: 15px; padding: 12px 20px; border-radius: var(--radius); cursor: pointer; transition: opacity .2s; }
.btn-save:hover { opacity: .9; }
.btn-save:disabled { opacity: .45; cursor: not-allowed; }
.btn-secondary { background: var(--surface2); border: 1px solid var(--border2); color: var(--muted); font-size: 12px; font-family: 'JetBrains Mono', monospace; padding: 12px 16px; border-radius: var(--radius); cursor: pointer; transition: all .2s; }
.btn-secondary:hover { color: var(--text); }
.btn-danger { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.25); color: var(--not-connected); font-size: 12px; font-family: 'JetBrains Mono', monospace; padding: 12px 16px; border-radius: var(--radius); cursor: pointer; transition: background .2s; }
.btn-danger:hover { background: rgba(248,113,113,.22); }

/* ── PROFILE MODAL ─────────────────────────────────────────── */
.profile-av-wrap { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.profile-av { width: 66px; height: 66px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 24px; color: #000; border: 3px solid var(--accent-border); position: relative; overflow: hidden; flex-shrink: 0; }
.profile-av img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .3s; }
.profile-av img.loaded { opacity: 1; }
.upload-label { font-size: 12px; color: var(--accent); background: var(--accent-glow); border: 1px solid var(--accent-border); border-radius: 30px; padding: 6px 14px; cursor: pointer; display: inline-block; margin-top: 6px; transition: all .2s; }
.upload-label:hover { background: rgba(245,200,66,.25); }
input[type=file] { display: none; }

/* ── FILTER PANEL ─────────────────────────────────────────── */
.filter-group { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.filter-select {
  background: var(--surface); border: 1px solid var(--border2); border-radius: 30px;
  padding: 8px 30px 8px 14px; color: var(--text2); font-size: 12px;
  font-family: 'Inter', sans-serif; outline: none; cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%235a5a78' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 12px center;
  transition: border-color .2s, box-shadow .2s;
}
.filter-select:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }
.filter-select option { background: var(--surface2); }
.filter-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-action-btn {
  background: var(--surface); border: 1px solid var(--border2); color: var(--text2);
  font-size: 11px; font-weight: 500; padding: 7px 14px; border-radius: 30px;
  cursor: pointer; font-family: 'JetBrains Mono', monospace;
  transition: all .2s; white-space: nowrap;
}
.filter-action-btn:hover { background: var(--accent); border-color: var(--accent); color: #000; }
@media (max-width: 680px) {
  .filter-group { flex-direction: column; }
  .filter-select { width: 100%; }
  .filter-actions { justify-content: flex-end; }
  .search-row { gap: 8px; }
  .filter-toggle-btn { padding: 10px 13px; font-size: 12px; }
}

/* ── DASHBOARD ────────────────────────────────────────────── */
.dash-kpis {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 14px; margin-bottom: 28px;
}
.dash-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 40px;
}
@media (max-width: 680px) { .dash-grid { grid-template-columns: 1fr; } }
.dash-bar-row {
  display: flex; align-items: center; gap: 10px; padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.dash-bar-row:last-child { border-bottom: none; }
.dash-bar-label {
  font-size: 12px; color: var(--text2); min-width: 80px;
  font-family: 'JetBrains Mono', monospace; white-space: nowrap;
}
.dash-bar-track {
  flex: 1; height: 8px; background: var(--surface3);
  border-radius: 4px; overflow: hidden;
}
.dash-bar-fill {
  height: 100%; background: var(--accent); border-radius: 4px;
  transition: width .6s var(--ease);
}
.dash-bar-val {
  font-size: 13px; font-weight: 600; color: var(--accent);
  min-width: 28px; text-align: right;
  font-family: 'Bebas Neue', sans-serif; font-size: 20px;
}
.dash-donut-wrap {
  display: flex; align-items: center; gap: 24px; padding: 12px 0;
}
.dash-donut-chart {
  position: relative; width: 100px; height: 100px; flex-shrink: 0;
}
.dash-donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.dash-donut-center {
  position: absolute; inset: 0; display: flex; align-items: center;
  justify-content: center; font-family: 'Bebas Neue', sans-serif;
  font-size: 24px; color: var(--accent);
}
.dash-donut-legend { display: flex; flex-direction: column; gap: 8px; }
.dash-legend-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--text2);
  font-family: 'JetBrains Mono', monospace;
}
.dash-legend-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}

/* ── THEME TOGGLE ─────────────────────────────────────────── */
.theme-toggle-row { display: flex; gap: 6px; }
.theme-btn {
  flex: 1; padding: 9px 12px; border-radius: var(--radius-sm);
  border: 1px solid var(--border2); background: var(--surface2);
  color: var(--text2); font-size: 13px; cursor: pointer;
  font-family: 'Inter', sans-serif;
  transition: all .2s var(--ease);
}
.theme-btn:hover { border-color: var(--accent-border); color: var(--text); }
.theme-btn.active { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }

/* ── CROP MODAL ───────────────────────────────────────────── */
.crop-modal-inner { max-width: 380px; }
.crop-canvas-wrap {
  width: 300px; height: 300px; margin: 0 auto 16px;
  border-radius: 50%; overflow: hidden;
  border: 2px solid var(--accent-border);
  box-shadow: 0 0 0 8px var(--accent-glow);
  position: relative; cursor: grab;
}
.crop-canvas-wrap:active { cursor: grabbing; }
#crop-canvas { display: block; width: 300px; height: 300px; }
.crop-zoom-wrap {
  display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
}
.crop-zoom-label { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: .1em; white-space: nowrap; }
.crop-zoom-slider {
  flex: 1; height: 4px; appearance: none; background: var(--surface3);
  border-radius: 2px; outline: none; cursor: pointer;
}
.crop-zoom-slider::-webkit-slider-thumb {
  appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: var(--accent); cursor: pointer;
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.crop-zoom-slider::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; border: none;
  background: var(--accent); cursor: pointer;
}

/* ── STUDENT DETAIL PHOTO OVERLAY ─────────────────────────── */
.sd-avatar-wrap { position: relative; display: inline-block; cursor: pointer; }
.av-cam-overlay {
  position: absolute; inset: 0; border-radius: 50%;
  background: rgba(0,0,0,0.45); display: flex; align-items: center;
  justify-content: center; font-size: 22px; opacity: 0;
  transition: opacity .2s; pointer-events: none; z-index: 1;
}
.sd-avatar-wrap:hover .av-cam-overlay,
.sd-avatar-wrap:active .av-cam-overlay { opacity: 1; }

/* ── SIMPLE DASHBOARD KPIs ────────────────────────────────── */
.dash-kpis-simple {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 20px; max-width: 480px; margin: 40px auto 0;
}
.dash-kpis-simple .kpi {
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: var(--radius-lg); padding: 32px 24px; text-align: center;
}
.dash-kpis-simple .kpi-val { font-size: 56px; line-height: 1; }
.dash-kpis-simple .kpi-label { margin-top: 8px; }
@media (max-width: 480px) { .dash-kpis-simple { grid-template-columns: 1fr; max-width: 300px; } }

/* ── LEADER TOGGLE (admin) ────────────────────────────────── */
.leader-toggle { display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 12px; color: var(--text2); font-family: 'JetBrains Mono', monospace; }
.leader-toggle input[type=checkbox] { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
.leader-toggle input:disabled { opacity: .4; cursor: default; }

/* ── PRINT STYLES ─────────────────────────────────────────── */
@media print {
  body { background: #fff !important; color: #000 !important; }
  .bg-glow, .top-nav, .mobile-nav-overlay, .mobile-nav-drawer, .bottom-nav,
  .modal-overlay, .toast, .readonly-banner, .filter-actions,
  .card-edit-btn, .add-btn, .edit-gated, .nav-panel:not([style*="display: none"]):not(#nav-roster),
  footer, .seg-tabs, .search-row, .filter-panel { display: none !important; }
  #nav-roster { display: block !important; }
  .screen { display: block !important; }
  #screen-gate, #screen-student, #screen-admin { display: none !important; }
  #screen-app { display: block !important; }
  .tab-panel { display: block !important; page-break-inside: avoid; margin-bottom: 20px; }
  .tab-panel::before { content: attr(data-print-title); display: block; font-size: 18px; font-weight: 700; margin: 20px 0 10px; border-bottom: 2px solid #000; padding-bottom: 4px; }
  .card { background: #fff !important; border: 1px solid #ccc !important; color: #000 !important; opacity: 1 !important; transform: none !important; animation: none !important; break-inside: avoid; page-break-inside: avoid; }
  .card::before { display: none !important; }
  .card-name { color: #000 !important; }
  .meta-item, .card-meta { color: #333 !important; }
  .badge-grade { background: #eee !important; color: #333 !important; border-color: #ccc !important; }
  .badge-status { border-color: #999 !important; }
  .badge-status.connected { color: #16a34a !important; background: #f0fdf4 !important; }
  .badge-status.not-connected { color: #dc2626 !important; background: #fef2f2 !important; }
  .stat { background: #f9f9f9 !important; border: 1px solid #ddd !important; color: #000 !important; }
  .stat-val { color: #b45309 !important; }
  .stat-label { color: #555 !important; }
  .section-label { color: #b45309 !important; border-color: #b45309 !important; }
  .roster-grid { gap: 8px !important; }
  .container { max-width: 100% !important; padding: 0 10px !important; }
  .logo-line, header { display: none !important; }
}

/* ── FOOTER ────────────────────────────────────────────────── */
footer { text-align: center; padding: 48px 0 32px; color: var(--muted); font-size: 11px; font-family: 'JetBrains Mono', monospace; letter-spacing: .1em; }

/* ══════════════════════════════════════════════════════════════
   SETTINGS PAGE
   ══════════════════════════════════════════════════════════════ */
.settings-topbar-info { flex: 1; text-align: center; }
.settings-ministry-name { font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace; letter-spacing: .1em; }

/* ── Layout ───────────────────────────────────────────────── */
.settings-layout { display: flex; max-width: 960px; margin: 0 auto; padding: 24px 20px 100px; gap: 28px; min-height: calc(100vh - 56px); }
.settings-sidebar { display: flex; flex-direction: column; gap: 4px; width: 180px; flex-shrink: 0; position: sticky; top: 80px; align-self: flex-start; }
.settings-content { flex: 1; min-width: 0; }

/* ── Sidebar Tabs ─────────────────────────────────────────── */
.settings-tab {
  display: flex; align-items: center; gap: 10px; padding: 11px 16px;
  border-radius: var(--radius-sm); border: none; cursor: pointer;
  background: transparent; color: var(--muted); font-size: 13px;
  font-family: 'Inter', sans-serif; font-weight: 500;
  text-align: left; transition: all .2s var(--ease);
}
.settings-tab:hover { color: var(--text); background: var(--surface2); }
.settings-tab.active { color: var(--accent); background: var(--accent-glow); border: 1px solid var(--accent-border); font-weight: 600; }
.stab-icon { font-size: 16px; flex-shrink: 0; }
.stab-label { white-space: nowrap; }

/* ── Panes ────────────────────────────────────────────────── */
.settings-pane { display: none; animation: fadeDown .3s var(--ease); }
.settings-pane.active { display: block; }

/* ── Cards ────────────────────────────────────────────────── */
.settings-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 24px;
  margin-bottom: 20px;
}
.scard-title {
  font-family: 'Bebas Neue', sans-serif; font-size: 22px;
  letter-spacing: .04em; color: var(--text); margin-bottom: 18px;
}
.scard-row { margin-bottom: 16px; }
.scard-row:last-child { margin-bottom: 0; }

/* ── Helper text ──────────────────────────────────────────── */
.s-helper { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; line-height: 1.5; margin-bottom: 8px; }

/* ── Toggle Switch ────────────────────────────────────────── */
.s-toggle-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border);
}
.s-toggle-row:last-child { border-bottom: none; }
.s-toggle-info { flex: 1; }
.s-toggle-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.s-toggle-desc { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.s-toggle {
  width: 44px; height: 24px; border-radius: 12px; cursor: pointer;
  background: var(--surface3); border: 1px solid var(--border2);
  position: relative; transition: all .2s var(--ease); flex-shrink: 0;
}
.s-toggle-knob {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--muted); transition: all .2s var(--ease);
}
.s-toggle.on { background: var(--accent); border-color: var(--accent); }
.s-toggle.on .s-toggle-knob { left: 22px; background: #000; }

/* ── Chips (multi-select) ─────────────────────────────────── */
.s-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.s-chip {
  padding: 6px 14px; border-radius: 30px; font-size: 13px;
  font-family: 'Inter', sans-serif; font-weight: 500;
  cursor: pointer; border: 1px solid var(--border2);
  background: var(--surface2); color: var(--text2);
  transition: all .2s var(--ease); user-select: none;
}
.s-chip:hover { border-color: var(--accent-border); color: var(--text); }
.s-chip.selected { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 600; }

/* ── Grade Tab Config ─────────────────────────────────────── */
.s-grade-tabs-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px; }
.s-grade-tab-group {
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: var(--radius); padding: 14px;
}
.s-grade-tab-label {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .16em; text-transform: uppercase; color: var(--accent);
  margin-bottom: 8px;
}
.s-grade-tab-name {
  background: var(--surface); border: 1px solid var(--border2);
  border-radius: var(--radius-sm); padding: 7px 10px; color: var(--text);
  font-size: 13px; width: 100%; outline: none; margin-bottom: 10px;
  font-family: 'Inter', sans-serif; transition: border-color .2s, box-shadow .2s;
}
.s-grade-tab-name:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-glow); }

/* ── Logo Upload ──────────────────────────────────────────── */
.s-logo-upload { display: flex; align-items: center; gap: 16px; margin-top: 12px; padding: 14px; background: var(--surface2); border: 1px solid var(--border2); border-radius: var(--radius); }
.s-logo-preview { width: 80px; height: 80px; border-radius: var(--radius-sm); background: var(--surface3); border: 1px solid var(--border2); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.s-logo-preview img { width: 100%; height: 100%; object-fit: contain; }
.s-logo-placeholder { font-size: 10px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.s-logo-actions { display: flex; flex-direction: column; gap: 8px; }

/* ── Radio Buttons ────────────────────────────────────────── */
.s-radio-group { display: flex; flex-direction: column; gap: 10px; }
.s-radio {
  display: flex; align-items: flex-start; gap: 12px; padding: 14px;
  background: var(--surface2); border: 1px solid var(--border2);
  border-radius: var(--radius); cursor: pointer;
  transition: border-color .2s, background .2s;
}
.s-radio:hover { border-color: var(--accent-border); }
.s-radio input[type=radio] { display: none; }
.s-radio-mark {
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid var(--muted); flex-shrink: 0; margin-top: 2px;
  position: relative; transition: all .2s;
}
.s-radio input:checked ~ .s-radio-mark { border-color: var(--accent); }
.s-radio input:checked ~ .s-radio-mark::after {
  content: ''; position: absolute; inset: 3px;
  background: var(--accent); border-radius: 50%;
}
.s-radio-title { font-size: 14px; font-weight: 600; color: var(--text); }
.s-radio-desc { font-size: 11px; color: var(--muted); margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

/* ── Checkboxes ───────────────────────────────────────────── */
.s-checkbox-group { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
.s-checkbox {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  font-size: 13px; color: var(--text2); font-family: 'Inter', sans-serif;
}
.s-checkbox input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--accent); cursor: pointer; }

/* ── Passcode field ───────────────────────────────────────── */
.s-show-pass {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; color: var(--muted); font-size: 11px;
  cursor: pointer; font-family: 'JetBrains Mono', monospace;
  transition: color .2s;
}
.s-show-pass:hover { color: var(--text); }
#s-passcode-config .field { position: relative; }

/* ── Info box ─────────────────────────────────────────────── */
.s-info-box {
  padding: 14px 16px; background: var(--accent-glow);
  border: 1px solid var(--accent-border); border-radius: var(--radius);
  font-size: 13px; color: var(--text2); line-height: 1.5;
}

/* ── Roles Table ──────────────────────────────────────────── */
.s-roles-table { width: 100%; border-collapse: collapse; }
.s-roles-table th {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  letter-spacing: .12em; text-transform: uppercase; color: var(--muted);
  padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);
}
.s-roles-table td {
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  font-size: 13px; color: var(--text2);
}
.s-roles-table tr:last-child td { border-bottom: none; }

/* ── Theme Selector ───────────────────────────────────────── */
.s-theme-selector { display: flex; gap: 14px; }
.s-theme-opt {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 16px 12px; border-radius: var(--radius); cursor: pointer;
  border: 2px solid var(--border2); background: var(--surface2);
  color: var(--text2); font-size: 12px; font-weight: 500;
  font-family: 'Inter', sans-serif; transition: all .2s var(--ease);
}
.s-theme-opt:hover { border-color: var(--accent-border); color: var(--text); }
.s-theme-opt.active { border-color: var(--accent); color: var(--accent); background: var(--accent-glow); }
.s-theme-preview {
  width: 48px; height: 48px; border-radius: 10px; border: 1px solid var(--border2);
}
.s-theme-dark { background: linear-gradient(135deg, #0a0a0f 50%, #18181f 50%); }
.s-theme-light { background: linear-gradient(135deg, #f5f5f7 50%, #ffffff 50%); }
.s-theme-auto { background: linear-gradient(135deg, #0a0a0f 50%, #f5f5f7 50%); }

/* ── Footer ───────────────────────────────────────────────── */
.settings-footer {
  position: sticky; bottom: 0; z-index: 10;
  background: var(--surface); border-top: 1px solid var(--border);
  padding: 16px 20px;
}
.settings-footer-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; gap: 12px; }
.settings-footer-note { font-size: 11px; color: var(--muted); font-family: 'JetBrains Mono', monospace; margin-left: auto; }

/* ── Logo in nav/gate (dynamic branding) ──────────────────── */
.nav-logo-img { height: 28px; width: auto; display: block; }
.gate-logo-img { max-height: 120px; max-width: 280px; display: block; margin: 0 auto; }

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 680px) {
  .settings-layout { flex-direction: column; gap: 0; padding-top: 0; }
  .settings-sidebar {
    flex-direction: row; width: 100%; position: sticky; top: 56px; z-index: 5;
    background: var(--bg); padding: 12px 0; gap: 6px; overflow-x: auto;
    border-bottom: 1px solid var(--border);
  }
  .settings-tab { padding: 8px 14px; font-size: 12px; white-space: nowrap; }
  .stab-icon { display: none; }
  .settings-content { padding-top: 16px; }
  .settings-card { padding: 18px; }
  .s-grade-tabs-wrap { grid-template-columns: 1fr; }
  .s-theme-selector { flex-direction: row; }
  .s-theme-opt { padding: 12px 8px; }
  .settings-footer { padding: 12px 16px; }
  .settings-footer-note { display: none; }
}
`;

:root.logo-needs-invert .nav-logo-img,
:root.logo-needs-invert .gate-logo-img { filter: invert(1) brightness(1.3); }
:root.logo-needs-dark .nav-logo-img,
:root.logo-needs-dark .gate-logo-img { filter: brightness(0.15); }
