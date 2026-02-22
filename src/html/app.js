export const APP_JS = `
'use strict';

// ── STATE ───────────────────────────────────────────────────
let currentUser = null;
let canEdit = false;
let DATA = { hs:{core:[],loose:[],fringe:[]}, ms:{core:[],loose:[],fringe:[]} };
let currentStudentKey = null;
let editState = { mode:'add', sk:'hs', section:'core', index:-1 };
let connectedVal = false;
let interactionKey = null;
let editInteractionContext = null;
let pendingDeleteInteraction = null;
let currentInteractions = [];
let toastTimer = null;

// ── ORG SETTINGS ────────────────────────────────────────────
let orgSettings = null;       // loaded from /api/settings/public on boot
let settingsData = null;      // full settings for admin editing
let settingsOriginal = null;  // snapshot for cancel/dirty detection
let settingsDirty = false;

// ── THEME ────────────────────────────────────────────────────
function initTheme() {
  const pref = localStorage.getItem('asm-theme') || 'auto';
  applyTheme(pref);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('asm-theme') || 'auto') === 'auto') applyTheme('auto');
  });
}
function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'light') root.setAttribute('data-theme', 'light');
  else if (pref === 'dark') root.setAttribute('data-theme', 'dark');
  else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }
  localStorage.setItem('asm-theme', pref);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('theme-btn-' + pref);
  if (activeBtn) activeBtn.classList.add('active');
  if (typeof applyBranding === 'function') applyBranding();
}

// ── SWIPE BACK ────────────────────────────────────────────────
function initSwipeBack() {
  const screen = document.getElementById('screen-student');
  if (!screen) return;
  let startX = 0, startY = 0;
  screen.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  screen.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (startX < 50 && dx > 80 && Math.abs(dy) < 80) goBack();
  }, { passive: true });
}

// ── GRADIENTS (yellow palette) ──────────────────────────────
const GRADIENTS = [
  'linear-gradient(135deg,#f5c842,#f0a800)',
  'linear-gradient(135deg,#fbbf24,#f59e0b)',
  'linear-gradient(135deg,#fcd34d,#fbbf24)',
  'linear-gradient(135deg,#f0a800,#d97706)',
  'linear-gradient(135deg,#fde68a,#f5c842)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#f5c842,#fbbf24)',
  'linear-gradient(135deg,#fbbf24,#f0a800)',
];

// ── HELPERS ─────────────────────────────────────────────────
function initials(n) {
  return (n||'?').trim().split(/\\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
}
function driveThumb(url) {
  if (!url) return null;
  const raw = String(url).trim();

  // R2 URLs and direct Google-hosted image URLs are served directly
  if (raw.startsWith('/r2/')) return raw;
  if (/^https?:\\/\\//.test(raw) && raw.includes('googleusercontent.com')) return raw;

  const mPath = raw.match(/\\/d\\/([a-zA-Z0-9_-]+)/);
  if (mPath) return 'https://drive.google.com/thumbnail?id=' + mPath[1] + '&sz=w200-h200-c';

  try {
    const u = new URL(raw);
    const id = u.searchParams.get('id');
    if (id) return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w200-h200-c';
  } catch (_) {}

  return /^https?:\\/\\//.test(raw) ? raw : null;
}
function formatDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
}
function calcAge(bd) {
  if (!bd) return null;
  const d = new Date(bd);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() - d.getMonth() < 0 || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate())) age--;
  return age > 0 && age < 30 ? age : null;
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m<2) return 'just now';
  if (m<60) return m+'m ago';
  const h = Math.floor(m/60);
  if (h<24) return h+'h ago';
  const days = Math.floor(h/24);
  if (days<7) return days+'d ago';
  const wk = Math.floor(days/7);
  if (wk<5) return wk+'w ago';
  return Math.floor(days/30)+'mo ago';
}

// ── SCREEN MANAGEMENT ────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-'+name);
  if (el) { el.classList.add('active'); window.scrollTo(0,0); }
  const bnav = document.getElementById('bottom-nav');
  if (bnav) bnav.style.display = name === 'app' ? '' : 'none';
}

// ── MAIN NAV PANELS ──────────────────────────────────────────
function switchMainNav(name, btn) {
  document.querySelectorAll('.nav-panel').forEach(p => p.style.display='none');
  const p = document.getElementById('nav-'+name);
  if (p) p.style.display='';
  document.querySelectorAll('.nav-pill').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Sync mobile drawer active state
  ['roster','dashboard','activity','dump'].forEach(n => {
    const mb = document.getElementById('mob-pill-'+n);
    if (mb) mb.classList.toggle('active', n === name);
  });
  // Sync bottom nav active state
  ['roster','dashboard','activity','dump'].forEach(n => {
    const bb = document.getElementById('bnav-'+n);
    if (bb) bb.classList.toggle('active', n === name);
  });
  if (name==='activity') loadActivityFeed();
  if (name==='dashboard') renderDashboard();
}

function toggleMobileNav() {
  document.getElementById('mobile-nav-drawer').classList.toggle('open');
  document.getElementById('mobile-nav-overlay').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav-drawer').classList.remove('open');
  document.getElementById('mobile-nav-overlay').classList.remove('open');
}

// ── GATE ─────────────────────────────────────────────────────
async function initGate() {
  // Check for an existing server-side session (passcode or leader)
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.user) { currentUser = data.user; canEdit = ['approved','admin','leader'].includes(currentUser.role); initApp(); return; }
  } catch(_) {}
  showScreen('gate');
  showLanes();
}

function showLanes() {
  const lf = document.getElementById('gate-leader-form');
  const pf = document.getElementById('gate-passcode-form');
  const la = document.getElementById('gate-lanes');
  if (lf) lf.style.display = 'none';
  if (pf) pf.style.display = 'none';
  if (la) la.style.display = 'flex';
  // Hide passcode lane if access mode is leaders-only
  const passcodeLane = document.getElementById('gate-lane-passcode');
  if (passcodeLane) {
    const mode = orgSettings?.accessMode || 'leaders-only';
    passcodeLane.style.display = mode === 'shared-passcode' ? '' : 'none';
  }
}

function showPasscodeForm() {
  document.getElementById('gate-lanes').style.display = 'none';
  const pf = document.getElementById('gate-passcode-form');
  pf.style.display = 'flex';
  document.getElementById('gate-input').focus();
  document.getElementById('gate-input').onkeydown = e => { if (e.key==='Enter') checkPasscode(); };
}

function showLeaderForm() {
  document.getElementById('gate-lanes').style.display = 'none';
  const lf = document.getElementById('gate-leader-form');
  lf.style.display = 'flex';
  document.getElementById('gate-leader-email').focus();
  document.getElementById('gate-leader-password').onkeydown = e => { if (e.key==='Enter') doGateLeaderLogin(); };
}

async function checkPasscode() {
  const val = document.getElementById('gate-input').value;
  const btn = document.getElementById('gate-btn');
  const err = document.getElementById('gate-error');
  btn.disabled=true; err.textContent='';
  try {
    const res = await fetch('/api/auth/passcode', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({passcode:val}),
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = null; canEdit = false; // will be set by refreshCurrentUser in initApp
      initApp();
      showToast(data.message || 'View-only access enabled', 'ok');
    } else {
      err.textContent = 'Wrong passcode. Try again.';
      document.getElementById('gate-input').value = '';
      document.getElementById('gate-input').focus();
    }
  } catch(_) { err.textContent = 'Network error. Please try again.'; }
  btn.disabled=false;
}

async function doGateLeaderLogin() {
  const email = (document.getElementById('gate-leader-email')||{}).value?.trim()||'';
  const password = (document.getElementById('gate-leader-password')||{}).value||'';
  const btn = document.getElementById('gate-leader-btn');
  const err = document.getElementById('gate-leader-error');
  if (!email||!password) { err.textContent='Please fill in all fields.'; return; }
  btn.disabled=true; btn.textContent='Signing in…'; err.textContent='';
  try {
    const res = await fetch('/api/auth/login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({email,password}),
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user; canEdit = ['approved','admin','leader'].includes(currentUser.role);
      initApp();
      showToast('Welcome back, '+currentUser.name+'!', 'ok');
    } else {
      err.textContent = data.error || 'Login failed.';
    }
  } catch(_) { err.textContent = 'Network error. Please try again.'; }
  btn.disabled=false; btn.textContent='Sign In →';
}

function showNeedAccess() {
  showToast('Contact your team admin or leader to request access.');
}

// ── INIT ─────────────────────────────────────────────────────
async function initApp() {
  showScreen('app');
  await refreshCurrentUser();
  await loadOrgSettings();
  await loadRoster();
}

async function refreshCurrentUser() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    currentUser = data.user;
    canEdit = currentUser && ['approved','admin','leader'].includes(currentUser.role);
  } catch(e) { currentUser=null; canEdit=false; }
  updateNav();
}

function updateNav() {
  const buildRight = () => {
    if (!currentUser) {
      return '<button class="nav-btn" onclick="openAuthModal(\\'signup\\')">Sign Up</button>' +
             '<button class="nav-btn primary" onclick="openAuthModal(\\'login\\')">Log In</button>';
    }
    const adminlandBtn = currentUser.role==='admin'
      ? '<button class=\"nav-btn\" onclick=\"openAdminland()\">Adminland</button>' : '';
    const thumb = driveThumb(currentUser.photoUrl);
    const avatarInner = thumb
      ? '<img class=\"nav-avatar-img\" src=\"'+thumb+'\" alt=\"'+(currentUser.name||'User')+'\" onerror=\"this.style.display=\'none\';this.parentElement.classList.remove(\'has-photo\')\">'
      : initials(currentUser.name);
    const photoClass = thumb ? ' has-photo' : '';
    return adminlandBtn + '<button class=\"nav-avatar'+photoClass+'\" onclick=\"openProfileModal()\" title=\"'+currentUser.name+'\">'+avatarInner+'</button>';
  };
  ['nav-right','student-nav-right'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = buildRight();
  });
  const rb = document.getElementById('readonly-banner');
  if (rb) {
    if (!currentUser) {
      rb.style.display='flex';
      rb.querySelector('p').innerHTML='You\\'re viewing in <strong>read-only mode</strong>. Log in to edit.';
      rb.querySelector('button').style.display=''; rb.querySelector('button').textContent='Log In';
      rb.querySelector('button').onclick=()=>openAuthModal('login');
    } else if (currentUser.role==='viewer') {
      rb.style.display='flex';
      let msg = 'View-only mode.';
      if (currentUser.expiresAt) {
        const t = new Date(currentUser.expiresAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true});
        msg = 'View-only mode.';
      }
      rb.querySelector('p').innerHTML=msg;
      rb.querySelector('button').style.display=''; rb.querySelector('button').textContent='Leader Login';
      rb.querySelector('button').onclick=()=>openAuthModal('login');
    } else if (currentUser.role==='pending') {
      rb.style.display='flex';
      rb.querySelector('p').innerHTML='<strong>Account pending.</strong> You\\'ll get an email when approved.';
      rb.querySelector('button').style.display='none';
    } else {
      rb.style.display='none';
    }
  }
  document.querySelectorAll('.edit-gated').forEach(el => {
    el.style.display = canEdit ? '' : 'none';
  });
}

// ── ROSTER ───────────────────────────────────────────────────
async function loadRoster() {
  try {
    const res = await fetch('/api/sheet/read');
    const data = await res.json();
    if (data?.hs) DATA = data;
  } catch(e) {}
  renderAll();
}

function renderAll() {
  // Apply grade tab labels from settings
  if (orgSettings?.gradeTabs) {
    const hsBtn = document.querySelector('.seg-btn[onclick*="hs"]');
    const msBtn = document.querySelector('.seg-btn[onclick*="ms"]');
    if (hsBtn && orgSettings.gradeTabs.hs?.label) hsBtn.textContent = orgSettings.gradeTabs.hs.label;
    if (msBtn && orgSettings.gradeTabs.ms?.label) msBtn.textContent = orgSettings.gradeTabs.ms.label;
  }
  ['hs','ms'].forEach(sk => {
    renderStats(sk);
    renderGrid(DATA[sk].core,  sk+'-core-grid',  sk,'core');
    renderGrid(DATA[sk].loose, sk+'-loose-grid', sk,'loose');
    renderGrid(DATA[sk].fringe,sk+'-fringe-grid',sk,'fringe');
  });
  document.querySelectorAll('.edit-gated').forEach(el => {
    el.style.display=canEdit?'':'none';
  });
  populateFilterDropdowns();
}

function renderStats(sk) {
  const el = document.getElementById(sk+'-stats');
  if (!el) return;
  const d = DATA[sk];
  const c=(d.core||[]).length, l=(d.loose||[]).length, f=(d.fringe||[]).length;
  const conn = [...(d.core||[]),...(d.loose||[])].filter(p=>p.connected).length;
  el.innerHTML =
    stat(c,'Core') + stat(l,'Loosely Connected') + stat(f,'Fringe') + stat(c+l+f,'Total') +
    (sk==='hs' ? stat(conn,'Connected') : '');
}
function stat(n,label) {
  return '<div class="stat"><div class="stat-val">'+n+'</div><div class="stat-label">'+label+'</div></div>';
}

function renderGrid(data, id, sk, section) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML='';
  if (!(data||[]).length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">👥</div><p>No students here yet</p></div>';
    return;
  }
  (data||[]).forEach((p,i) => el.appendChild(makeCard(p,i,sk,section)));
}

function makeCard(person, idx, sk, section) {
  const card = document.createElement('div');
  card.className='card';
  const g = GRADIENTS[idx % GRADIENTS.length];
  const thumb = driveThumb(person.photoUrl);
  const age = calcAge(person.birthday);

  const tr = orgSettings?.tracking || {school:true,birthdays:true,age:true,showGrade:true};
  const meta = [
    (tr.school!==false) && person.school   ? '🏫 '+person.school : '',
    (tr.birthdays!==false) && person.birthday ? '🎂 '+formatDate(person.birthday)+((tr.age!==false)&&age?' · '+age+'yo':'') : '',
    person.interest ? '⚡ '+person.interest : '',
  ].filter(Boolean).map(t => '<div class="meta-item"><span>'+t+'</span></div>').join('');

  const connBadge = sk==='hs'
    ? '<span class="badge-status '+(person.connected?'connected':'not-connected')+'">'+(person.connected?'● Connected':'○ Not Connected')+'</span>' : '';

  const goals = person.goals||[];
  const done = goals.filter(g=>g.done).length;
  const goalHtml = goals.length
    ? '<div class="goal-bar-wrap"><div class="goal-bar-label"><span>Goals</span><span>'+done+'/'+goals.length+'</span></div><div class="goal-bar-track"><div class="goal-bar-fill" style="width:'+(goals.length?Math.round(done/goals.length*100):0)+'%"></div></div></div>'
    : (person.primaryGoal ? '<div class="goal-primary">🎯 '+person.primaryGoal.slice(0,40)+'</div>' : '');

  const editBtn = canEdit
    ? '<button class="card-edit-btn" onclick="event.stopPropagation();openEditModal(\\''+sk+'\\',\\''+section+'\\','+idx+')" title="Edit">✏️</button>'
    : '';

  const avatarClick = canEdit
    ? 'event.stopPropagation();openEditModal(\\''+sk+'\\',\\''+section+'\\','+idx+')'
    : '';
  card.innerHTML = editBtn +
    '<div class="card-avatar"'+(canEdit?' onclick="'+avatarClick+'"':'')+'>'+
    '<div class="av-fallback" style="background:'+g+'">'+initials(person.name)+'</div>'+
    (thumb ? '<img src="'+thumb+'" alt="" loading="lazy" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">' : '')+
    (canEdit?'<div class="av-edit-overlay">📷</div>':'')+
    '</div><div class="card-name-row"><div class="card-name">'+person.name+'</div>'+
    ((tr.showGrade!==false) && person.grade ? '<span class="badge-grade">Gr.'+person.grade+'</span>' : '')+'</div>'+
    (meta ? '<div class="card-meta">'+meta+'</div>' : '')+
    connBadge + goalHtml;

  card.addEventListener('click', () => openStudentDetail(sk, section, idx));
  return card;
}

// ── SEARCH (replaced by applyFilters below) ─────────────────

// ── HS/MS TAB ────────────────────────────────────────────────
function switchTab(sk, btn) {
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('tab-'+sk).classList.add('active');
  document.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── AUTH MODAL ───────────────────────────────────────────────
function openAuthModal(tab='login') { switchAuthTab(tab); openModal('auth-modal'); }
function closeAuthModal() { closeModal('auth-modal'); }
function switchAuthTab(tab) {
  document.getElementById('auth-login-form').style.display  = tab==='login'  ? 'flex' : 'none';
  document.getElementById('auth-signup-form').style.display = tab==='signup' ? 'flex' : 'none';
  document.getElementById('tab-login-btn').classList.toggle('active', tab==='login');
  document.getElementById('tab-signup-btn').classList.toggle('active', tab==='signup');
  document.getElementById('auth-modal-title').textContent = tab==='login' ? 'Welcome Back' : 'Join the Team';
  ['login-msg','signup-msg'].forEach(id => { document.getElementById(id).textContent=''; });
}

async function doLogin() {
  const email = v('login-email'), password = v('login-password');
  const msg = document.getElementById('login-msg');
  const btn = document.getElementById('login-submit');
  if (!email||!password) { setMsg(msg,'Please fill in all fields.','error'); return; }
  btn.disabled=true; btn.textContent='Logging in…'; msg.textContent='';
  const res = await fetch('/api/auth/login', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email,password}),
  });
  const data = await res.json();
  btn.disabled=false; btn.textContent='Log In';
  if (data.success) {
    currentUser=data.user; canEdit=['approved','admin','leader'].includes(currentUser.role);
    closeAuthModal(); updateNav(); renderAll();
    showToast('✓ Welcome back, '+currentUser.name+'!','ok');
  } else setMsg(msg, data.error||'Login failed.','error');
}

async function doSignup() {
  const name=v('signup-name'), email=v('signup-email'), password=v('signup-password');
  const msg=document.getElementById('signup-msg'), btn=document.getElementById('signup-submit');
  if (!name||!email||!password) { setMsg(msg,'Please fill in all fields.','error'); return; }
  btn.disabled=true; btn.textContent='Creating…'; msg.textContent='';
  const res = await fetch('/api/auth/signup', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name,email,password}),
  });
  const data = await res.json();
  btn.disabled=false; btn.textContent='Create Account';
  if (data.success) {
    setMsg(msg,'✓ '+data.message,'success');
    ['signup-name','signup-email','signup-password'].forEach(id=>{ document.getElementById(id).value=''; });
  } else setMsg(msg,data.error||'Signup failed.','error');
}

async function logout() {
  await fetch('/api/auth/logout',{method:'POST'});
  currentUser=null; canEdit=false;
  showScreen('gate'); showLanes();
  showToast('Logged out');
}

// ── PROFILE MODAL ─────────────────────────────────────────────
function openProfileModal() {
  if (!currentUser) { openAuthModal('login'); return; }
  document.getElementById('profile-av-initials').textContent = initials(currentUser.name);
  document.getElementById('profile-display-name').textContent = currentUser.name;
  document.getElementById('profile-display-email').textContent = currentUser.email;
  sv('profile-name-input', currentUser.name||'');
  sv('profile-since-input', currentUser.leaderSince||'');
  sv('profile-funfact-input', currentUser.funFact||'');
  const img=document.getElementById('profile-av-img');
  const thumb=driveThumb(currentUser.photoUrl);
  if(thumb){img.src=thumb;img.style.display='';img.classList.remove('loaded');}
  else img.style.display='none';
  openModal('profile-modal');
}
function closeProfileModal() { closeModal('profile-modal'); }

async function saveProfile() {
  if (!currentUser) return;
  const name=v('profile-name-input'), leaderSince=v('profile-since-input'), funFact=v('profile-funfact-input');
  const res=await fetch('/api/profile/update',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,leaderSince,funFact}),
  });
  const data=await res.json();
  if (data.success) {
    Object.assign(currentUser,{name,leaderSince,funFact});
    updateNav(); closeProfileModal(); showToast('✓ Profile updated','ok');
  } else showToast(data.error||'Update failed','error');
}

function uploadProfilePhoto(input) {
  if (!input.files.length) return;
  const file=input.files[0]; input.value='';
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      cropImg=img; cropZoom=1; cropOffX=0; cropOffY=0;
      cropCallback=async blob=>{
        const data=await uploadCroppedBlob(blob,'leader');
        if(data.url){
          await fetch('/api/profile/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({photoUrl:data.url})});
          currentUser.photoUrl=data.url;
          const thumb=driveThumb(data.url)||data.url;
          if(thumb){const i=document.getElementById('profile-av-img');i.src=thumb;i.style.display='';i.onload=()=>i.classList.add('loaded');}
          updateNav(); showToast('✓ Photo updated','ok');
        } else showToast(data.error||'Upload failed','error');
      };
      openModal('crop-modal');
      drawCrop(); initCropDrag();
      document.getElementById('crop-zoom').value=1;
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

// ── EDIT STUDENT MODAL ────────────────────────────────────────
function openEditModal(sk, section, index) {
  if (!canEdit) return;
  const p = DATA[sk][section][index];
  editState={mode:'edit',sk,section,index};
  document.getElementById('edit-modal-title').textContent='Edit Student';
  document.getElementById('edit-modal-sub').textContent=(sk==='hs'?'High School':'Middle School')+' · '+{core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[section];
  sv('ef-name',p.name||''); sv('ef-grade',p.grade||''); sv('ef-school',p.school||'');
  sv('ef-birthday',p.birthday||''); sv('ef-interest',p.interest||''); sv('ef-notes',p.notes||'');
  sv('ef-photoUrl',p.photoUrl||''); sv('ef-primary-goal',p.primaryGoal||'');
  sv('ef-section',section);
  setConnected(p.connected||false);
  updateEditPhotoPreview();
  document.getElementById('ef-connected-field').style.display=sk==='hs'?'block':'none';
  document.getElementById('ef-section-field').style.display='block';
  document.getElementById('ef-delete-btn').style.display='inline-block';
  document.getElementById('ef-save-btn').textContent='Save Changes';
  openModal('edit-modal');
}

function openAddModal(sk, section) {
  if (!canEdit) return;
  editState={mode:'add',sk,section,index:-1};
  document.getElementById('edit-modal-title').textContent='Add Student';
  document.getElementById('edit-modal-sub').textContent=(sk==='hs'?'High School':'Middle School')+' · '+{core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[section];
  ['ef-name','ef-grade','ef-school','ef-birthday','ef-interest','ef-notes','ef-photoUrl','ef-primary-goal'].forEach(id=>sv(id,''));
  sv('ef-section',section);
  setConnected(false); updateEditPhotoPreview();
  document.getElementById('ef-connected-field').style.display=sk==='hs'?'block':'none';
  document.getElementById('ef-section-field').style.display='none';
  document.getElementById('ef-delete-btn').style.display='none';
  document.getElementById('ef-save-btn').textContent='Add Student';
  openModal('edit-modal');
  document.getElementById('ef-name').focus();
}

function closeEditModal() { closeModal('edit-modal'); }
function setConnected(val) {
  connectedVal=val;
  const el=document.getElementById('ef-connected-toggle');
  el.classList.toggle('on',val);
  el.querySelector('.toggle-label').textContent=val?'Connected':'Not Connected';
}
function toggleConnected() { setConnected(!connectedVal); }
function updateEditPhotoPreview() {
  const url=v('ef-photoUrl'), name=v('ef-name')||'?';
  document.getElementById('edit-pv-fallback').textContent=initials(name);
  const img=document.getElementById('edit-pv-img');
  const thumb=driveThumb(url);
  if(thumb){img.style.display='';img.classList.remove('loaded');img.src=thumb;}
  else img.style.display='none';
}

function uploadStudentPhoto(input) {
  if (!input.files.length) return;
  const file=input.files[0]; input.value='';
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      cropImg=img; cropZoom=1; cropOffX=0; cropOffY=0;
      cropCallback=async blob=>{
        const data=await uploadCroppedBlob(blob,'student');
        if(data.url){sv('ef-photoUrl',data.url);updateEditPhotoPreview();showToast('✓ Uploaded','ok');}
        else showToast(data.error||'Upload failed','error');
      };
      openModal('crop-modal');
      drawCrop(); initCropDrag();
      document.getElementById('crop-zoom').value=1;
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function triggerStudentDetailPhotoUpload(sk, section, index) {
  if (!canEdit) return;
  cropCallback=async blob=>{
    const data=await uploadCroppedBlob(blob,'student');
    if(!data.url){showToast(data.error||'Upload failed','error');return;}
    const person=DATA[sk][section][index];
    person.photoUrl=data.url;
    const params=new URLSearchParams({action:'update',payload:JSON.stringify({sheet:sk,rowIndex:person.rowIndex,fields:{photoUrl:data.url}})});
    await fetch('/api/sheet/write?'+params);
    renderStudentDetail(sk,section,index);
    showToast('✓ Photo updated','ok');
  };
  const input=document.getElementById('shared-photo-input');
  if(input){input.value='';input.click();}
}

async function saveEdit() {
  const name=v('ef-name');
  if (!name) { showToast('Name is required','error'); return; }
  const btn=document.getElementById('ef-save-btn');
  const origText=btn.textContent;
  btn.disabled=true; btn.textContent='Saving…';
  const newSection=v('ef-section')||editState.section;
  const fields={
    name, grade:v('ef-grade'), school:v('ef-school'), birthday:v('ef-birthday'),
    interest:v('ef-interest'), notes:v('ef-notes'), photoUrl:v('ef-photoUrl'),
    primaryGoal:v('ef-primary-goal'), connected:connectedVal,
  };
  const {mode,sk,section,index}=editState;
  try {
    if (mode==='edit') {
      // Handle section change: update the section field on the backend
      const updatedFields={...fields,section:newSection};
      Object.assign(DATA[sk][section][index], fields);
      if(newSection!==section){
        // Move student to new section locally
        const person=DATA[sk][section].splice(index,1)[0];
        Object.assign(person,fields);
        DATA[sk][newSection].push(person);
      }
      const params=new URLSearchParams({action:'update',payload:JSON.stringify({sheet:sk,rowIndex:(DATA[sk][newSection!==section?newSection:section].find(p=>p.name===name)||{}).rowIndex||DATA[sk][section][index]?.rowIndex,fields:updatedFields})});
      const res=await fetch('/api/sheet/write?'+params);
      const data=await res.json();
      showToast(data.error ? 'Saved locally' : (newSection!==section?'✓ Moved to '+{core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[newSection]:'✓ Saved'), data.error?'error':'ok');
    } else {
      DATA[sk][section].push({...fields});
      const params=new URLSearchParams({action:'add',payload:JSON.stringify({sheet:sk,section,person:fields})});
      const res=await fetch('/api/sheet/write?'+params);
      const data=await res.json();
      if (data.newRowIndex!==undefined) DATA[sk][section][DATA[sk][section].length-1].rowIndex=data.newRowIndex;
      showToast(data.error?'Added locally':'✓ Student added',data.error?'error':'ok');
    }
  } catch(e) {
    showToast('Network error — changes saved locally','error');
  }
  renderAll(); closeEditModal(); btn.disabled=false; btn.textContent=origText;
}

function confirmDelete() {
  const {sk,section,index}=editState;
  const name=DATA[sk][section][index].name;
  document.getElementById('confirm-student-delete-name').textContent=name;
  openModal('confirm-student-delete-modal');
}
async function doConfirmDeleteStudent() {
  const {sk,section,index}=editState;
  const name=DATA[sk][section][index].name;
  const person=DATA[sk][section].splice(index,1)[0];
  const params=new URLSearchParams({action:'delete',payload:JSON.stringify({sheet:sk,rowIndex:person.rowIndex})});
  await fetch('/api/sheet/write?'+params);
  closeModal('confirm-student-delete-modal');
  renderAll(); closeEditModal(); showToast('Removed '+name,'ok');
}

// ── STUDENT DETAIL ────────────────────────────────────────────
async function openStudentDetail(sk, section, index) {
  currentStudentKey={sk,section,index};
  showScreen('student');
  await renderStudentDetail(sk,section,index);
}

function goBack() { showScreen('app'); }

async function renderStudentDetail(sk, section, index) {
  const person=DATA[sk][section][index];
  const el=document.getElementById('student-content');
  const g=GRADIENTS[index%GRADIENTS.length];
  const thumb=driveThumb(person.photoUrl);
  const age=calcAge(person.birthday);

  const tr2 = orgSettings?.tracking || {school:true,birthdays:true,age:true,showGrade:true};
  const chips=[
    (tr2.showGrade!==false) && person.grade   ? '📚 Grade '+person.grade : '',
    (tr2.school!==false) && person.school  ? '🏫 '+person.school : '',
    (tr2.birthdays!==false) && person.birthday? '🎂 '+formatDate(person.birthday)+((tr2.age!==false)&&age?' · '+age+'yo':'') : '',
    person.interest? '⚡ '+person.interest : '',
    sk==='hs' ? (person.connected?'✅ Connected':'○ Not Connected') : '',
  ].filter(Boolean).map(c=>'<div class="chip">'+c+'</div>').join('');

  const editBtn = canEdit
    ? '<button class="nav-btn primary edit-gated" onclick="openEditModal(\\''+sk+'\\',\\''+section+'\\','+index+')">Edit</button>'
    : '';
  const logBtn = canEdit && tr2.hangoutNotes !== false
    ? '<button class="nav-btn" onclick="openInteractionModal(\\''+sk+'\\',\\''+section+'\\','+index+',\\''+person.name+'\\')">+ Log Hangout</button>'
    : '';

  const sdAvatarClick = canEdit ? ' onclick="triggerStudentDetailPhotoUpload(\\''+sk+'\\',\\''+section+'\\','+index+')"' : '';
  el.innerHTML =
    '<div class="student-hero">'+
      '<div class="sd-avatar-wrap"'+sdAvatarClick+'>'+
      '<div class="student-avatar-lg"><div class="av-fallback" style="background:'+g+'">'+initials(person.name)+'</div>'+
      (thumb?'<img src="'+thumb+'" alt="" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">':'')+
      '</div>'+
      (canEdit?'<div class="av-cam-overlay">📷</div>':'')+
      '</div>'+
      '<div class="student-info">'+
        '<div class="student-name">'+person.name+'</div>'+
        '<div class="student-chips">'+chips+'</div>'+
        '<div class="student-actions">'+editBtn+logBtn+'</div>'+
      '</div>'+
    '</div>'+
    '<div class="student-grid">'+
      '<div class="panel" id="goals-panel">'+
        '<div class="panel-title">🎯 Goals <span id="goal-count"></span></div>'+
        '<div id="goals-list"><div class="loader"><div class="loader-ring"></div></div></div>'+
        (canEdit?'<div class="add-goal-row"><input class="add-goal-input" id="new-goal-input" placeholder="Add a new goal…"><button class="add-goal-btn" onclick="addGoal()">+</button></div>':'')+
        (person.primaryGoal?'<div style="margin-top:12px;padding:9px 11px;background:var(--accent-glow);border:1px solid var(--accent-border);border-radius:8px;font-size:12px;color:var(--accent)">⭐ Primary: '+person.primaryGoal+'</div>':'')+
      '</div>'+
      '<div class="panel">'+
        '<div class="panel-title">📝 Notes</div>'+
        '<div style="font-size:13px;color:var(--text2);line-height:1.6">'+(person.notes||'<span style="color:var(--muted)">No notes yet.</span>')+'</div>'+
      '</div>'+
      (tr2.hangoutNotes !== false ?
        '<div class="panel full">'+
          '<div class="panel-title">🤝 Hangout Log <span id="int-count"></span></div>'+
          '<div id="interactions-list"><div class="loader"><div class="loader-ring"></div></div></div>'+
        '</div>' : '')+
    '</div>';

  // Load goals
  const goals=person.goals||[];
  renderGoalsList(goals,sk,section,index);

  // Load interactions (only if hangout notes tracking is enabled)
  if (tr2.hangoutNotes !== false) {
    try {
      const res=await fetch('/api/student/interactions?sk='+sk+'&section='+section+'&index='+index);
      const d=await res.json();
      renderInteractionsList(d.interactions||[], sk, section, index);
    } catch(e) { document.getElementById('interactions-list').innerHTML='<div class="empty"><p>Could not load.</p></div>'; }
  }
}

function renderGoalsList(goals,sk,section,index) {
  const el=document.getElementById('goals-list');
  if (!el) return;
  const gc=document.getElementById('goal-count');
  if (gc) gc.textContent=goals.length ? goals.filter(g=>g.done).length+'/'+goals.length+' done' : '';
  if (!goals.length) { el.innerHTML='<div class="empty"><p>No goals yet.</p></div>'; return; }
  el.innerHTML=goals.map((g,gi)=>
    '<div class="goal-item">'+
      '<div class="goal-check '+(g.done?'done':'')+'" onclick="toggleGoal('+gi+')" title="Toggle"></div>'+
      '<div class="goal-text '+(g.done?'done':'')+'">'+g.text+'</div>'+
      (g.primary?'<span class="primary-tag">Primary</span>':'')+
      (canEdit?'<button class="goal-del" onclick="deleteGoal('+gi+')" title="Remove">✕</button>':'')+
    '</div>'
  ).join('');
}

function renderInteractionsList(interactions, sk, section, index) {
  currentInteractions = interactions;
  const el=document.getElementById('interactions-list');
  if (!el) return;
  const ic=document.getElementById('int-count');
  if (ic) ic.textContent=interactions.length ? interactions.length+' logged' : '';
  if (!interactions.length) { el.innerHTML='<div class="empty"><p>No hangouts logged yet.</p></div>'; return; }
  el.innerHTML=[...interactions].reverse().map(int=>{
    const canManage=int.id && currentUser && (int.leaderEmail===currentUser.email || currentUser.role==='admin');
    const editedTag=int.updatedAt ? ' <span class="int-edited">edited</span>' : '';
    const actBtns=canManage
      ? '<div class="int-actions">'+
          '<button class="int-action-btn" data-id="'+int.id+'" data-sk="'+sk+'" data-sec="'+section+'" data-idx="'+index+'" onclick="openEditInteractionModal(this.dataset.id,this.dataset.sk,this.dataset.sec,+this.dataset.idx)">Edit</button>'+
          '<button class="int-action-btn danger" data-id="'+int.id+'" data-sk="'+sk+'" data-sec="'+section+'" data-idx="'+index+'" onclick="deleteInteractionNote(this.dataset.id,this.dataset.sk,this.dataset.sec,+this.dataset.idx)">Delete</button>'+
        '</div>'
      : '';
    return '<div class="int-item">'+
      '<div class="int-header">'+
        '<div class="int-av">'+initials(int.leader)+'</div>'+
        '<div><div class="int-who">'+int.leader+editedTag+'</div><div class="int-when">'+formatDate(int.date)+' · '+timeAgo(int.createdAt)+'</div></div>'+
      '</div>'+
      '<div class="int-body">'+int.summary+'</div>'+
      actBtns+
    '</div>';
  }).join('');
}

// ── GOALS CRUD ────────────────────────────────────────────────
async function addGoal() {
  const input=document.getElementById('new-goal-input');
  const text=input.value.trim();
  if (!text||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  const person=DATA[sk][section][index];
  if (!person.goals) person.goals=[];
  person.goals.push({text,done:false,primary:person.goals.length===0,createdAt:new Date().toISOString()});
  input.value='';
  await syncGoals(sk,section,index);
  renderGoalsList(person.goals,sk,section,index);
  renderAll();
  showToast('✓ Goal added','ok');
}
async function toggleGoal(gi) {
  if (!canEdit||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  DATA[sk][section][index].goals[gi].done=!DATA[sk][section][index].goals[gi].done;
  await syncGoals(sk,section,index);
  renderGoalsList(DATA[sk][section][index].goals,sk,section,index);
  renderAll();
}
async function deleteGoal(gi) {
  if (!canEdit||!currentStudentKey) return;
  const {sk,section,index}=currentStudentKey;
  DATA[sk][section][index].goals.splice(gi,1);
  await syncGoals(sk,section,index);
  renderGoalsList(DATA[sk][section][index].goals,sk,section,index);
  showToast('Goal removed');
}
async function syncGoals(sk,section,index) {
  const person=DATA[sk][section][index];
  const params=new URLSearchParams({action:'update',payload:JSON.stringify({sheet:sk,rowIndex:person.rowIndex,fields:{goals:JSON.stringify(person.goals)}})});
  await fetch('/api/sheet/write?'+params);
}

// ── INTERACTION MODAL ─────────────────────────────────────────
function openInteractionModal(sk,section,index,studentName) {
  interactionKey={sk,section,index,studentName};
  document.getElementById('int-modal-sub').textContent='with '+studentName;
  sv('int-leader',currentUser?currentUser.name:'');
  sv('int-date',new Date().toISOString().slice(0,10));
  sv('int-summary','');
  openModal('interaction-modal');
}
function closeInteractionModal() { closeModal('interaction-modal'); }

async function saveInteraction() {
  const leader=v('int-leader'), date=v('int-date'), summary=v('int-summary');
  if (!leader||!summary) { showToast('Leader name and summary required','error'); return; }
  const btn=document.querySelector('#interaction-modal .btn-save');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}
  const {sk,section,index,studentName}=interactionKey;
  const person=DATA[sk][section][index];
  const interaction={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),leader,date,summary,createdAt:new Date().toISOString(),leaderEmail:currentUser?currentUser.email:''};
  try {
    const res=await fetch('/api/student/interactions',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sk,section,index,rowIndex:person.rowIndex,studentName,interaction}),
    });
    const data=await res.json();
    if (data.success) {
      closeInteractionModal();
      showToast('✓ Hangout logged!','ok');
      if (currentStudentKey) renderStudentDetail(currentStudentKey.sk,currentStudentKey.section,currentStudentKey.index);
    } else showToast(data.error||'Failed','error');
  } catch(e) {
    showToast('Network error — try again','error');
  }
  if(btn){btn.disabled=false;btn.textContent='Log It ✓';}
}

// ── INTERACTION EDIT / DELETE ─────────────────────────────────
function openEditInteractionModal(intId, sk, section, index) {
  const int = currentInteractions.find(n => n.id === intId);
  if (!int) return;
  const rowIndex = (DATA[sk]?.[section]?.[index] || {}).rowIndex;
  editInteractionContext = { int, sk, section, index, rowIndex };
  sv('edit-int-date', int.date || '');
  sv('edit-int-summary', int.summary || '');
  openModal('edit-interaction-modal');
}

async function saveEditedInteraction() {
  if (!editInteractionContext) return;
  const { int, sk, section, index, rowIndex } = editInteractionContext;
  const date = v('edit-int-date');
  const summary = v('edit-int-summary');
  if (!summary) { showToast('Summary cannot be empty', 'error'); return; }
  const res = await fetch('/api/student/interactions', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sk, section, index, rowIndex, interactionId: int.id, changes: { date, summary } }),
  });
  const data = await res.json();
  if (data.success) {
    closeModal('edit-interaction-modal');
    showToast('✓ Note updated', 'ok');
    if (currentStudentKey) renderStudentDetail(currentStudentKey.sk, currentStudentKey.section, currentStudentKey.index);
  } else showToast(data.error || 'Failed', 'error');
}

function deleteInteractionNote(id, sk, section, index) {
  const rowIndex = (DATA[sk]?.[section]?.[index] || {}).rowIndex;
  pendingDeleteInteraction = { id, sk, section, index, rowIndex };
  openModal('confirm-delete-modal');
}

async function confirmDeleteInteraction() {
  if (!pendingDeleteInteraction) return;
  const { id, sk, section, index, rowIndex } = pendingDeleteInteraction;
  const res = await fetch('/api/student/interactions', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sk, section, index, rowIndex, interactionId: id }),
  });
  const data = await res.json();
  if (data.success) {
    closeModal('confirm-delete-modal');
    pendingDeleteInteraction = null;
    showToast('Note deleted', 'ok');
    if (currentStudentKey) renderStudentDetail(currentStudentKey.sk, currentStudentKey.section, currentStudentKey.index);
  } else showToast(data.error || 'Failed', 'error');
}

// ── ACTIVITY FEED ─────────────────────────────────────────────
async function loadActivityFeed() {
  const el=document.getElementById('activity-feed');
  el.innerHTML='<div class="loader"><div class="loader-ring"></div></div>';
  try {
    const res=await fetch('/api/activity/recent');
    const data=await res.json();
    const items=data.items||[];
    if (!items.length) { el.innerHTML='<div class="empty"><div class="empty-icon">🌱</div><p>No activity yet. Log some hangouts!</p></div>'; return; }
    el.innerHTML=items.map(item=>{
      const student=findStudent(item.studentName);
      const sThumb=student?driveThumb(student.photoUrl):null;
      const sg=GRADIENTS[0], lg=GRADIENTS[2];
      return '<div class="act-card" onclick="navigateToStudent(\\''+item.studentName+'\\')">'+
        '<div class="act-header">'+
          '<div class="act-avatars">'+
            '<div class="act-av"><div class="av-fallback" style="background:'+sg+'">'+initials(item.studentName)+'</div>'+
            (sThumb?'<img src="'+sThumb+'" onload="this.classList.add(\\'loaded\\')" onerror="this.style.display=\\'none\\'">':'')+
            '</div>'+
            '<div class="act-av"><div class="av-fallback" style="background:'+lg+'">'+initials(item.leader)+'</div></div>'+
          '</div>'+
          '<div class="act-info">'+
            '<div class="act-names"><span>'+item.studentName+'</span> × '+item.leader+'</div>'+
            '<div class="act-time">'+formatDate(item.date)+' · '+timeAgo(item.createdAt)+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="act-summary">'+item.summary.slice(0,200)+(item.summary.length>200?'…':'')+'</div>'+
      '</div>';
    }).join('');
  } catch(e) { el.innerHTML='<div class="empty"><p>Could not load activity.</p></div>'; }
}

function findStudent(name) {
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    const s=(DATA[sk][sec]||[]).find(p=>p.name===name);
    if (s) return s;
  }
  return null;
}
function findStudentKey(name) {
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    const idx=(DATA[sk][sec]||[]).findIndex(p=>p.name===name);
    if (idx>=0) return {sk,section:sec,index:idx};
  }
  return null;
}
function navigateToStudent(name) {
  const k=findStudentKey(name);
  if (k) openStudentDetail(k.sk,k.section,k.index);
}

// ── BRAIN DUMP ────────────────────────────────────────────────
async function processBrainDump() {
  const text=document.getElementById('dump-text').value.trim();
  if (!text) { showToast('Write something first!','error'); return; }
  const btn=document.getElementById('dump-btn');
  btn.disabled=true; btn.textContent='✨ Processing…';
  const roster=getAllStudentNames();
  const res=await fetch('/api/brain-dump',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,roster})});
  const data=await res.json();
  btn.disabled=false; btn.textContent='✨ Process & Assign';
  const el=document.getElementById('dump-result');
  if (!data.parsed||!data.parsed.length) {
    el.innerHTML='<div class="dump-result"><p style="color:var(--muted)">Couldn\\'t match any students. Try being more specific!</p></div>';
    return;
  }
  window._dumpParsed=data.parsed;
  el.innerHTML='<div class="dump-result"><div class="dump-result-title">✓ Found '+data.parsed.length+' mention'+
    (data.parsed.length!==1?'s':'')+
    '</div>'+
    data.parsed.map((p,i)=>
      '<div class="dump-match">'+
        '<div class="dump-match-name">'+p.name+' <span style="font-size:11px;color:'+(p.matched?'var(--connected)':'var(--warning)')+'">'+(p.matched?'✓ in roster':'⚠ not found')+'</span></div>'+
        '<div class="dump-match-sum">'+p.summary.slice(0,300)+'</div>'+
        (p.matched&&canEdit?'<div class="dump-match-actions"><button class="add-btn" onclick="applyDump('+i+')">Log as Hangout</button></div>':'')+
      '</div>'
    ).join('')+
  '</div>';
}
function getAllStudentNames() {
  const names=[];
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) (DATA[sk][sec]||[]).forEach(p=>names.push(p.name));
  return names;
}
async function applyDump(i) {
  const p=window._dumpParsed[i];
  const k=findStudentKey(p.name);
  if (!k) { showToast('Student not found','error'); return; }
  const person=DATA[k.sk][k.section][k.index];
  const interaction={leader:currentUser?currentUser.name:'Unknown',date:new Date().toISOString().slice(0,10),summary:p.summary,createdAt:new Date().toISOString(),leaderEmail:currentUser?currentUser.email:''};
  const res=await fetch('/api/student/interactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sk:k.sk,section:k.section,index:k.index,rowIndex:person.rowIndex,studentName:p.name,interaction})});
  const data=await res.json();
  if (data.success) showToast('✓ Logged for '+p.name,'ok');
  else showToast('Failed: '+(data.error||''),'error');
}

// ── ADMIN ─────────────────────────────────────────────────────

function openAdminland() {
  loadAdminPanel();
}


function openAdminUsers() {
  showScreen('admin');
  switchAdminTab('users', document.querySelector('.admin-tab[onclick*="users"]'));
  loadAdminUsers();
}

async function loadAdminPanel() {
  showScreen('admin');
  await Promise.all([loadAdminOverview(),loadAdminUsers(),loadAdminMetrics()]);
}
function switchAdminTab(name,btn) {
  document.querySelectorAll('.admin-sec').forEach(s=>s.classList.remove('active'));
  document.getElementById('admin-'+name).classList.add('active');
  document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
}
async function loadAdminOverview() {
  const total=['hs','ms'].reduce((a,sk)=>a+(DATA[sk].core||[]).length+(DATA[sk].loose||[]).length+(DATA[sk].fringe||[]).length,0);
  const conn=['hs','ms'].reduce((a,sk)=>a+[...(DATA[sk].core||[]),...(DATA[sk].loose||[])].filter(p=>p.connected).length,0);
  let ints=0;
  try{const r=await fetch('/api/activity/stats');const d=await r.json();ints=d.totalInteractions||0;}catch(e){}
  document.getElementById('admin-stats-grid').innerHTML=
    kpi(total,'Total Students')+kpi(conn,'Connected HS')+kpi(ints,'Hangouts Logged')+
    kpi((DATA.hs.core||[]).length,'HS Core')+kpi((DATA.ms.core||[]).length,'MS Core');
}
function kpi(n,label) { return '<div class="kpi"><div class="kpi-val">'+n+'</div><div class="kpi-label">'+label+'</div></div>'; }
async function loadAdminUsers() {
  const res=await fetch('/api/admin/users');
  const data=await res.json();
  const users=data.users||[];
  const el=document.getElementById('admin-users-table');
  if (!users.length) { el.innerHTML='<div class="empty"><p>No users.</p></div>'; return; }
  const selfEmail=(currentUser?.email||'').toLowerCase();
  el.innerHTML='<table class="user-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead><tbody>'+
    users.map(u=>{
      const isSelf=u.email.toLowerCase()===selfEmail;
      const isAdmin=u.role==='admin';
      const isLeader=u.role==='leader';
      const isPending=u.role==='pending';
      const leaderChecked=(isLeader||isAdmin)?'checked':'';
      const leaderDisabled=(isSelf||isAdmin)?'disabled':'';
      return '<tr'+(isSelf?' style="background:var(--accent-glow)"':'')+'><td>'+u.name+(isSelf?' <span style="font-size:10px;color:var(--muted)">(you)</span>':'')+'</td>'+
        '<td style="color:var(--muted)">'+u.email+'</td>'+
        '<td><span class="role-badge '+u.role+'">'+u.role+'</span></td>'+
        '<td style="color:var(--muted);font-family:\\'JetBrains Mono\\',monospace;font-size:11px">'+(u.createdAt?new Date(u.createdAt).toLocaleDateString():'—')+'</td>'+
        '<td><div class="btn-row">'+
          (isPending?'<button class="role-btn approve" onclick="updateUser(\\''+u.email+'\\',\\'approved\\')">Approve</button>':'')+
          (!isAdmin?'<label class="leader-toggle" title="Toggle leader access"><input type="checkbox" '+leaderChecked+' '+leaderDisabled+' onchange="toggleLeader(\\''+u.email+'\\',this.checked)"><span>Leader</span></label>':'')+
          (!isSelf&&!isAdmin?'<button class="role-btn mk-admin" onclick="updateUser(\\''+u.email+'\\',\\'admin\\')">→ Admin</button>':'')+
          (!isSelf&&!isPending?'<button class="role-btn revoke" onclick="updateUser(\\''+u.email+'\\',\\'pending\\')">Revoke</button>':'')+
        '</div></td></tr>';
    }).join('')+'</tbody></table>';
}
async function toggleLeader(email, isLeader) {
  await updateUser(email, isLeader ? 'leader' : 'approved');
}
async function loadAdminMetrics() {
  const el=document.getElementById('admin-metrics-content');
  try {
    const r=await fetch('/api/activity/stats'); const d=await r.json();
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:4px">'+
      '<div class="panel"><div class="panel-title">🏆 Most Active Leaders</div>'+
      (d.topLeaders||[]).map(l=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+l.name+'</span><span style="color:var(--accent)">'+l.count+' hangouts</span></div>').join('')+
      (!(d.topLeaders||[]).length?'<p style="color:var(--muted);font-size:13px">No data yet</p>':'')+
      '</div>'+
      '<div class="panel"><div class="panel-title">❤️ Most Visited</div>'+
      (d.topStudents||[]).map(s=>'<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span>'+s.name+'</span><span style="color:var(--accent)">'+s.count+' visits</span></div>').join('')+
      (!(d.topStudents||[]).length?'<p style="color:var(--muted);font-size:13px">No data yet</p>':'')+
      '</div></div>'+
      '<div class="panel" style="margin-top:16px"><div class="panel-title">📊 Overview</div>'+
      '<div class="stats" style="margin-top:12px">'+
        stat(d.totalInteractions||0,'Total Interactions')+stat(d.uniqueLeaders||0,'Active Leaders')+
        stat(d.uniqueStudents||0,'Students Visited')+stat(d.thisMonth||0,'This Month')+
      '</div></div>';
  } catch(e) { el.innerHTML='<div class="empty"><p>Could not load.</p></div>'; }
}
async function updateUser(email,role) {
  if (currentUser && email.toLowerCase()===currentUser.email.toLowerCase() && currentUser.role==='admin' && role!=='admin') {
    showToast('You cannot change your own admin status','error'); return;
  }
  const res=await fetch('/api/admin/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,role})});
  const data=await res.json();
  if (data.success) { showToast('✓ Updated','ok'); loadAdminUsers(); }
  else showToast(data.error||'Failed','error');
}

// ── FILTER / SORT ────────────────────────────────────────────
function getAllStudents() {
  const all=[];
  for (const sk of ['hs','ms']) for (const sec of ['core','loose','fringe']) {
    (DATA[sk][sec]||[]).forEach((p,i)=>all.push({...p,_sk:sk,_sec:sec,_idx:i}));
  }
  return all;
}
function populateFilterDropdowns() {
  const all=getAllStudents();
  const grades=[...new Set(all.map(p=>p.grade).filter(Boolean))].sort((a,b)=>+a-+b);
  const schools=[...new Set(all.map(p=>p.school).filter(Boolean))].sort();
  const gradeEl=document.getElementById('filter-grade');
  const schoolEl=document.getElementById('filter-school');
  if(gradeEl){
    const cur=gradeEl.value;
    gradeEl.innerHTML='<option value="">All Grades</option>'+grades.map(g=>'<option value="'+g+'">Grade '+g+'</option>').join('');
    gradeEl.value=cur;
  }
  if(schoolEl){
    const cur=schoolEl.value;
    schoolEl.innerHTML='<option value="">All Schools</option>'+schools.map(s=>'<option value="'+s+'">'+s+'</option>').join('');
    schoolEl.value=cur;
  }
}
function applyFilters() {
  const q=(document.getElementById('roster-search').value||'').toLowerCase().trim();
  const gradeF=document.getElementById('filter-grade').value;
  const schoolF=document.getElementById('filter-school').value;
  const connF=document.getElementById('filter-connected').value;
  const sortF=document.getElementById('filter-sort').value;
  ['hs','ms'].forEach(sk => {
    ['core','loose','fringe'].forEach(sec => {
      const gridEl=document.getElementById(sk+'-'+sec+'-grid');
      if(!gridEl) return;
      let items=DATA[sk][sec]||[];
      let filtered=items.map((p,i)=>({p,i})).filter(({p})=>{
        if(q && !(p.name||'').toLowerCase().includes(q) && !(p.school||'').toLowerCase().includes(q) && !(p.interest||'').toLowerCase().includes(q) && !(p.grade||'').toLowerCase().includes(q)) return false;
        if(gradeF && p.grade!==gradeF) return false;
        if(schoolF && p.school!==schoolF) return false;
        if(connF==='connected' && !p.connected) return false;
        if(connF==='not-connected' && p.connected) return false;
        return true;
      });
      if(sortF) {
        filtered.sort((a,b)=>{
          switch(sortF){
            case 'name-asc': return (a.p.name||'').localeCompare(b.p.name||'');
            case 'name-desc': return (b.p.name||'').localeCompare(a.p.name||'');
            case 'grade-asc': return (+a.p.grade||99)-(+b.p.grade||99);
            case 'grade-desc': return (+b.p.grade||0)-(+a.p.grade||0);
            case 'interactions-desc': return (+b.p.interactionCount||0)-(+a.p.interactionCount||0);
            case 'interactions-asc': return (+a.p.interactionCount||0)-(+b.p.interactionCount||0);
            default: return 0;
          }
        });
      }
      gridEl.innerHTML='';
      if(!filtered.length){
        gridEl.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><p>No students match your filters</p></div>';
        return;
      }
      filtered.forEach(({p,i})=>gridEl.appendChild(makeCard(p,i,sk,sec)));
    });
  });
  document.querySelectorAll('.edit-gated').forEach(el=>{el.style.display=canEdit?'':'none';});
  updateFilterCount();
}
function clearSearch() {
  const el = document.getElementById('roster-search');
  if (el) { el.value=''; applyFilters(); }
}
function clearFilters() {
  document.getElementById('roster-search').value='';
  document.getElementById('filter-grade').value='';
  document.getElementById('filter-school').value='';
  document.getElementById('filter-connected').value='';
  document.getElementById('filter-sort').value='';
  const panel = document.getElementById('filter-panel');
  if (panel) panel.classList.remove('open');
  const btn = document.getElementById('filter-toggle-btn');
  if (btn) { btn.classList.remove('active','has-filters'); }
  updateFilterCount();
  renderAll();
}
function toggleFilterPanel() {
  const panel = document.getElementById('filter-panel');
  const btn = document.getElementById('filter-toggle-btn');
  if (!panel) return;
  const isOpen = panel.classList.contains('open');
  panel.classList.toggle('open', !isOpen);
  if (btn) btn.classList.toggle('active', !isOpen);
}
function updateFilterCount() {
  const count = [
    (document.getElementById('filter-grade')||{}).value,
    (document.getElementById('filter-school')||{}).value,
    (document.getElementById('filter-connected')||{}).value,
    (document.getElementById('filter-sort')||{}).value,
  ].filter(Boolean).length;
  const badge = document.getElementById('filter-count');
  const btn = document.getElementById('filter-toggle-btn');
  if (badge) { badge.textContent = count||''; badge.classList.toggle('visible', count>0); }
  if (btn) btn.classList.toggle('has-filters', count>0);
  const sc = document.getElementById('search-clear');
  if (sc) {
    const q = (document.getElementById('roster-search')||{}).value||'';
    sc.classList.toggle('visible', q.length>0);
  }
}

// ── CSV EXPORT ───────────────────────────────────────────────
function exportCSV() {
  const rows=[['Name','Grade','School','Birthday','Interest','Section','Level','Connected','Interaction Count','Primary Goal','Notes']];
  for(const sk of ['hs','ms']){
    for(const sec of ['core','loose','fringe']){
      (DATA[sk][sec]||[]).forEach(p=>{
        rows.push([
          p.name||'', p.grade||'', p.school||'', p.birthday||'', p.interest||'',
          {core:'Core',loose:'Loosely Connected',fringe:'Fringe'}[sec],
          sk==='hs'?'High School':'Middle School',
          sk==='hs'?(p.connected?'Yes':'No'):'N/A',
          p.interactionCount||'0', p.primaryGoal||'', (p.notes||'').replace(/[\\n\\r]+/g,' ')
        ]);
      });
    }
  }
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download='asm-roster-'+new Date().toISOString().slice(0,10)+'.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('CSV downloaded','ok');
}

// ── PRINT ────────────────────────────────────────────────────
function printRoster() {
  window.print();
}

// ── DASHBOARD ────────────────────────────────────────────────
async function renderDashboard() {
  const el=document.getElementById('dashboard-content');
  if(!el) return;
  el.innerHTML='<div class="loader"><div class="loader-ring"></div></div>';
  const all=getAllStudents();
  const total=all.length;
  let totalHangouts=0;
  try{const r=await fetch('/api/activity/stats');const d=await r.json();totalHangouts=d.totalInteractions||0;}catch(e){}
  el.innerHTML='<div class="dash-kpis-simple">'+kpi(total,'Total Students')+kpi(totalHangouts,'Hangouts Logged')+'</div>';
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, type='') {
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.className='toast'+(type?' '+type:'');
  void el.offsetHeight;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),3000);
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function v(id) { return (document.getElementById(id)||{}).value?.trim()||''; }
function sv(id,val) { const el=document.getElementById(id); if(el) el.value=val; }
function setMsg(el,msg,type) { el.textContent=msg; el.className='auth-msg '+(type||''); }

// ── PHOTO CROP / COMPRESS ─────────────────────────────────────
let cropImg=null, cropZoom=1, cropOffX=0, cropOffY=0, cropIsDragging=false, cropDragStartX=0, cropDragStartY=0;
let cropCallback=null, cropPhotoContext=null;

function triggerPhotoUpload(ctx, callback) {
  cropPhotoContext=ctx;
  cropCallback=callback;
  const input=document.getElementById('shared-photo-input');
  if(input){input.value='';input.click();}
}

function onSharedPhotoSelected(input) {
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      cropImg=img; cropZoom=1; cropOffX=0; cropOffY=0;
      openModal('crop-modal');
      drawCrop();
      initCropDrag();
      document.getElementById('crop-zoom').value=1;
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function drawCrop() {
  const canvas=document.getElementById('crop-canvas');
  if(!canvas||!cropImg) return;
  const SIZE=300;
  canvas.width=SIZE; canvas.height=SIZE;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,SIZE,SIZE);
  const base=Math.min(cropImg.width,cropImg.height);
  const scale=(SIZE/base)*cropZoom;
  const w=cropImg.width*scale, h=cropImg.height*scale;
  ctx.drawImage(cropImg, (SIZE-w)/2+cropOffX, (SIZE-h)/2+cropOffY, w, h);
}

function initCropDrag() {
  const wrap=document.querySelector('.crop-canvas-wrap');
  if(!wrap||wrap._cropDragInit) return;
  wrap._cropDragInit=true;
  wrap.addEventListener('mousedown',e=>{cropIsDragging=true;cropDragStartX=e.clientX-cropOffX;cropDragStartY=e.clientY-cropOffY;});
  window.addEventListener('mousemove',e=>{if(!cropIsDragging)return;cropOffX=e.clientX-cropDragStartX;cropOffY=e.clientY-cropDragStartY;drawCrop();});
  window.addEventListener('mouseup',()=>{cropIsDragging=false;});
  wrap.addEventListener('touchstart',e=>{const t=e.touches[0];cropIsDragging=true;cropDragStartX=t.clientX-cropOffX;cropDragStartY=t.clientY-cropOffY;},{passive:true});
  wrap.addEventListener('touchmove',e=>{if(!cropIsDragging)return;const t=e.touches[0];cropOffX=t.clientX-cropDragStartX;cropOffY=t.clientY-cropDragStartY;drawCrop();},{passive:true});
  wrap.addEventListener('touchend',()=>{cropIsDragging=false;},{passive:true});
}

function onCropZoom(val) {
  cropZoom=+val; drawCrop();
}

function closeCropModal() {
  closeModal('crop-modal');
  cropCallback=null; cropPhotoContext=null; cropImg=null;
}

function saveCrop() {
  if(!cropImg) return;
  const src=document.getElementById('crop-canvas');
  const out=document.createElement('canvas');
  const SIZE=800; out.width=SIZE; out.height=SIZE;
  out.getContext('2d').drawImage(src,0,0,SIZE,SIZE);
  out.toBlob(blob=>{
    closeModal('crop-modal');
    if(cropCallback) cropCallback(blob);
  },'image/jpeg',0.85);
}

async function uploadCroppedBlob(blob, type) {
  showToast('Uploading…');
  const fd=new FormData(); fd.append('file',blob,'photo.jpg'); fd.append('type',type);
  const res=await fetch('/api/upload-photo',{method:'POST',body:fd});
  return res.json();
}

// ── ORG SETTINGS (public branding) ────────────────────────────
async function loadOrgSettings() {
  try {
    const cached = localStorage.getItem('asm-org-settings');
    if (cached) { orgSettings = JSON.parse(cached); applyBranding(); }
    const res = await fetch('/api/settings/public');
    const data = await res.json();
    orgSettings = data;
    localStorage.setItem('asm-org-settings', JSON.stringify(data));
    applyBranding();
  } catch(e) {}
}

function applyBranding() {
  if (!orgSettings) return;
  const name = orgSettings.ministryName || 'Anthem Students';
  const logo = orgSettings.logoUrl || '';
  document.documentElement.classList.remove('logo-needs-invert','logo-needs-dark');
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  if (currentTheme === 'dark' && orgSettings.logoTone === 'dark') document.documentElement.classList.add('logo-needs-invert');
  if (currentTheme === 'light' && orgSettings.logoTone === 'light') document.documentElement.classList.add('logo-needs-dark');

  // Update gate screen
  const gateLogo = document.getElementById('gate-logo-area');
  const gateLogoEl = document.querySelector('.gate-logo');
  if (logo && gateLogoEl) {
    gateLogoEl.innerHTML = '<img class="gate-logo-img" src="'+logo+'" alt="'+name+'">';
  }
  const gateSub = document.querySelector('.gate-sub');
  if (gateSub && orgSettings.campus) {
    gateSub.textContent = name + ' · ' + orgSettings.campus;
  } else if (gateSub) {
    gateSub.textContent = 'Worship Grow Go · ' + name;
  }

  // Update nav logo
  document.querySelectorAll('.nav-logo').forEach(el => {
    // Skip settings nav
    if (el.closest('#screen-settings')) return;
    if (logo) {
      el.innerHTML = '<img class="nav-logo-img" src="'+logo+'" alt="'+name+'">';
    }
  });

  // Update subtitle in roster header
  const subtitle = document.querySelector('#nav-roster .subtitle');
  if (subtitle) {
    const yr = new Date().getFullYear();
    subtitle.textContent = name + ' · ASM ' + yr;
  }

  // Update gate access mode visibility
  const passcodeLane = document.getElementById('gate-lane-passcode');
  if (passcodeLane) {
    const mode = orgSettings.accessMode || 'leaders-only';
    passcodeLane.style.display = mode === 'shared-passcode' ? '' : 'none';
  }

  // Apply appearance settings
  if (orgSettings.appearance) {
    if (orgSettings.appearance.compactMode) document.body.classList.add('compact-mode');
    else document.body.classList.remove('compact-mode');
    const bnav = document.getElementById('bottom-nav');
    if (bnav && orgSettings.appearance.stickyBottomTabs === false) bnav.style.display = 'none';
  }
}

// ── SETTINGS PAGE (admin) ─────────────────────────────────────
async function openSettings() {
  if (!currentUser || currentUser.role !== 'admin') { showToast('Admin access required','error'); return; }
  showScreen('settings');
  showToast('Loading settings…');
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    settingsData = data.settings;
    settingsOriginal = JSON.parse(JSON.stringify(settingsData));
    populateSettingsUI();
    settingsDirty = false;
    updateSettingsSaveBtn();
    document.getElementById('settings-topbar-name').textContent = settingsData.ministryName || '';
  } catch(e) { showToast('Failed to load settings','error'); }
}

function closeSettings() {
  if (settingsDirty) {
    if (!confirm('You have unsaved changes. Discard them?')) return;
  }
  showScreen('app');
}

function switchSettingsTab(tab, btn) {
  document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
  const pane = document.getElementById('settings-'+tab);
  if (pane) pane.classList.add('active');
  document.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function markSettingsDirty() {
  settingsDirty = true;
  updateSettingsSaveBtn();
}

function updateSettingsSaveBtn() {
  const btns = [document.getElementById('settings-save-btn'), document.getElementById('settings-save-topbar')];
  btns.forEach(b => { if (b) b.disabled = !settingsDirty; });
}

function toggleSettingsSwitch(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('on');
  markSettingsDirty();
  // Special: show/hide conditional sections
  if (id === 's-logo-toggle') {
    const area = document.getElementById('s-logo-upload-area');
    if (area) area.style.display = el.classList.contains('on') ? 'flex' : 'none';
  }
  if (id === 's-auto-archive') {
    const row = document.getElementById('s-archive-weeks-row');
    if (row) row.style.display = el.classList.contains('on') ? 'block' : 'none';
  }
}

function setSettingsSwitch(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('on', on);
}

// ── Populate Settings UI from data ────────────────────────────
function populateSettingsUI() {
  const s = settingsData;
  if (!s) return;

  // General
  sv('s-ministry-name', s.ministryName || '');
  sv('s-campus', s.campus || '');
  setSettingsSwitch('s-logo-toggle', s.logoEnabled || false);
  const logoArea = document.getElementById('s-logo-upload-area');
  if (logoArea) logoArea.style.display = s.logoEnabled ? 'flex' : 'none';
  const logoImg = document.getElementById('s-logo-img');
  if (logoImg && s.logoUrl) { logoImg.src = s.logoUrl; logoImg.style.display = ''; }
  else if (logoImg) { logoImg.style.display = 'none'; }

  // Grades
  renderGradeChips(s);
  sv('s-hs-label', s.gradeTabs?.hs?.label || 'High School');
  sv('s-ms-label', s.gradeTabs?.ms?.label || 'Middle School');
  renderGradeTabChips(s);

  // Default week
  sv('s-meeting-day', s.meetingDay || 'sunday');
  sv('s-week-start', s.weekStartsOn || 'sunday');

  // Tracking
  const tr = s.tracking || {};
  setSettingsSwitch('s-track-hangoutNotes', tr.hangoutNotes !== false);
  setSettingsSwitch('s-track-tags', tr.tags || false);
  setSettingsSwitch('s-track-birthdays', tr.birthdays !== false);
  setSettingsSwitch('s-track-showGrade', tr.showGrade !== false);
  setSettingsSwitch('s-track-school', tr.school !== false);
  setSettingsSwitch('s-track-age', tr.age !== false);

  // Defaults
  sv('s-default-status', s.defaults?.newStudentStatus || 'new');
  setSettingsSwitch('s-auto-archive', s.defaults?.autoArchive || false);
  sv('s-archive-weeks', s.defaults?.autoArchiveWeeks || 8);
  const archRow = document.getElementById('s-archive-weeks-row');
  if (archRow) archRow.style.display = s.defaults?.autoArchive ? 'block' : 'none';

  // Access
  const acc = s.access || {};
  const radios = document.querySelectorAll('input[name="access-mode"]');
  radios.forEach(r => { r.checked = r.value === (acc.mode || 'leaders-only'); });
  onAccessModeChange();
  sv('s-passcode', acc.passcode || '');
  const perms = acc.passcodePermissions || {};
  ['viewRoster','viewAttendance','viewNotes','viewPrayer'].forEach(k => {
    const cb = document.getElementById('s-perm-'+k);
    if (cb) cb.checked = perms[k] || false;
  });

  // Appearance
  const currentTheme = localStorage.getItem('asm-theme') || 'auto';
  selectSettingsTheme(currentTheme, true);
  setSettingsSwitch('s-compact-mode', s.appearance?.compactMode || false);
  setSettingsSwitch('s-sticky-tabs', s.appearance?.stickyBottomTabs !== false);
}

// ── Grade Chips ───────────────────────────────────────────────
function renderGradeChips(s) {
  const container = document.getElementById('s-grades-chips');
  if (!container) return;
  const allGrades = [6,7,8,9,10,11,12];
  const hsGrades = s.gradeTabs?.hs?.grades || [9,10,11,12];
  const msGrades = s.gradeTabs?.ms?.grades || [6,7,8];
  const selected = [...new Set([...hsGrades, ...msGrades])];
  container.innerHTML = allGrades.map(g =>
    '<div class="s-chip'+(selected.includes(g)?' selected':'')+'" data-grade="'+g+'" onclick="toggleGradeChip(this)">Grade '+g+'</div>'
  ).join('');
}

function toggleGradeChip(el) {
  el.classList.toggle('selected');
  markSettingsDirty();
  syncGradeTabChips();
}

function renderGradeTabChips(s) {
  const hsGrades = s.gradeTabs?.hs?.grades || [9,10,11,12];
  const msGrades = s.gradeTabs?.ms?.grades || [6,7,8];
  renderGradeTabGroup('s-hs-grades', hsGrades);
  renderGradeTabGroup('s-ms-grades', msGrades);
}

function renderGradeTabGroup(containerId, grades) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = grades.map(g =>
    '<div class="s-chip selected" data-grade="'+g+'" onclick="moveGradeChip(this)">'+g+'</div>'
  ).join('');
}

function moveGradeChip(el) {
  const grade = +el.dataset.grade;
  const parent = el.parentElement;
  const isHs = parent.id === 's-hs-grades';
  const target = document.getElementById(isHs ? 's-ms-grades' : 's-hs-grades');
  if (target) {
    el.remove();
    target.appendChild(el);
    markSettingsDirty();
  }
}

function syncGradeTabChips() {
  const selected = [...document.querySelectorAll('#s-grades-chips .s-chip.selected')].map(c => +c.dataset.grade);
  const hsEl = document.getElementById('s-hs-grades');
  const msEl = document.getElementById('s-ms-grades');
  if (!hsEl || !msEl) return;
  // Keep existing assignment where possible
  const currentHs = [...hsEl.querySelectorAll('.s-chip')].map(c => +c.dataset.grade).filter(g => selected.includes(g));
  const currentMs = [...msEl.querySelectorAll('.s-chip')].map(c => +c.dataset.grade).filter(g => selected.includes(g));
  const assigned = new Set([...currentHs, ...currentMs]);
  selected.forEach(g => {
    if (!assigned.has(g)) {
      if (g >= 9) currentHs.push(g); else currentMs.push(g);
    }
  });
  renderGradeTabGroup('s-hs-grades', currentHs.sort((a,b)=>a-b));
  renderGradeTabGroup('s-ms-grades', currentMs.sort((a,b)=>a-b));
}

// ── Access Mode ───────────────────────────────────────────────
function onAccessModeChange() {
  const mode = document.querySelector('input[name="access-mode"]:checked')?.value || 'leaders-only';
  const passConfig = document.getElementById('s-passcode-config');
  const leadersInfo = document.getElementById('s-leaders-only-info');
  if (passConfig) passConfig.style.display = mode === 'shared-passcode' ? 'block' : 'none';
  if (leadersInfo) leadersInfo.style.display = mode === 'leaders-only' ? 'block' : 'none';
}

function togglePasscodeVisibility() {
  const inp = document.getElementById('s-passcode');
  const btn = inp?.parentElement?.querySelector('.s-show-pass');
  if (!inp || !btn) return;
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = 'Hide'; }
  else { inp.type = 'password'; btn.textContent = 'Show'; }
}

// ── Theme Selector (settings) ─────────────────────────────────
function selectSettingsTheme(theme, skipDirty) {
  document.querySelectorAll('.s-theme-opt').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  applyTheme(theme);
  if (!skipDirty) markSettingsDirty();
}

// ── Logo Upload ───────────────────────────────────────────────
async function uploadSettingsLogo(input) {
  if (!input.files.length) return;
  const file = input.files[0]; input.value = '';
  showToast('Uploading logo…');
  const fd = new FormData(); fd.append('file', file, 'logo.jpg'); fd.append('type', 'logo');
  try {
    const res = await fetch('/api/upload-photo', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) {
      const img = document.getElementById('s-logo-img');
      if (settingsData) settingsData.logoTone = data.logoTone || settingsData.logoTone || 'light';
      if (img) { img.src = data.url; img.style.display = 'block'; img.previousElementSibling.style.display = 'none'; }
      if (settingsData) settingsData.logoUrl = data.url;
      markSettingsDirty();
      showToast('✓ Logo uploaded', 'ok');
    } else showToast(data.error || 'Upload failed', 'error');
  } catch(e) { showToast('Upload error', 'error'); }
}

function removeSettingsLogo() {
  const img = document.getElementById('s-logo-img');
  if (img) { img.src = ''; img.style.display = 'none'; img.previousElementSibling.style.display = ''; }
  if (settingsData) settingsData.logoUrl = '';
  markSettingsDirty();
}

// ── Save / Cancel ─────────────────────────────────────────────
async function saveSettings() {
  if (!settingsData) return;
  const btn = document.getElementById('settings-save-btn');
  const topBtn = document.getElementById('settings-save-topbar');
  [btn, topBtn].forEach(b => { if (b) { b.disabled = true; b.textContent = 'Saving…'; } });

  // Gather values from UI
  const s = {
    ministryName: v('s-ministry-name') || 'Anthem Students',
    campus: v('s-campus'),
    logoEnabled: document.getElementById('s-logo-toggle')?.classList.contains('on') || false,
    logoUrl: settingsData.logoUrl || '',
    logoTone: settingsData.logoTone || 'light',
    gradeTabs: {
      hs: {
        label: v('s-hs-label') || 'High School',
        grades: [...document.querySelectorAll('#s-hs-grades .s-chip')].map(c => +c.dataset.grade),
      },
      ms: {
        label: v('s-ms-label') || 'Middle School',
        grades: [...document.querySelectorAll('#s-ms-grades .s-chip')].map(c => +c.dataset.grade),
      },
    },
    meetingDay: v('s-meeting-day'),
    weekStartsOn: v('s-week-start'),
    tracking: {
      hangoutNotes: document.getElementById('s-track-hangoutNotes')?.classList.contains('on') || false,
      tags: document.getElementById('s-track-tags')?.classList.contains('on') || false,
      birthdays: document.getElementById('s-track-birthdays')?.classList.contains('on') || false,
      showGrade: document.getElementById('s-track-showGrade')?.classList.contains('on') || false,
      school: document.getElementById('s-track-school')?.classList.contains('on') || false,
      age: document.getElementById('s-track-age')?.classList.contains('on') || false,
    },
    defaults: {
      newStudentStatus: v('s-default-status') || 'new',
      autoArchive: document.getElementById('s-auto-archive')?.classList.contains('on') || false,
      autoArchiveWeeks: parseInt(v('s-archive-weeks')) || 8,
    },
    access: {
      mode: document.querySelector('input[name="access-mode"]:checked')?.value || 'leaders-only',
      passcode: v('s-passcode'),
      passcodePermissions: {
        viewRoster: document.getElementById('s-perm-viewRoster')?.checked || false,
        viewAttendance: document.getElementById('s-perm-viewAttendance')?.checked || false,
        viewNotes: document.getElementById('s-perm-viewNotes')?.checked || false,
        viewPrayer: document.getElementById('s-perm-viewPrayer')?.checked || false,
      },
    },
    appearance: {
      theme: localStorage.getItem('asm-theme') || 'auto',
      compactMode: document.getElementById('s-compact-mode')?.classList.contains('on') || false,
      stickyBottomTabs: document.getElementById('s-sticky-tabs')?.classList.contains('on') || false,
    },
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    const data = await res.json();
    if (data.success) {
      settingsData = data.settings || s;
      settingsOriginal = JSON.parse(JSON.stringify(settingsData));
      settingsDirty = false;
      updateSettingsSaveBtn();
      // Refresh public settings cache
      orgSettings = {
        ministryName: s.ministryName, campus: s.campus,
        logoUrl: s.logoEnabled ? s.logoUrl : '',
        logoEnabled: s.logoEnabled, gradeTabs: s.gradeTabs,
        tracking: s.tracking, appearance: s.appearance,
      };
      localStorage.setItem('asm-org-settings', JSON.stringify(orgSettings));
      applyBranding();
      document.getElementById('settings-topbar-name').textContent = s.ministryName;
      showToast('✓ Settings saved', 'ok');
    } else showToast(data.error || 'Save failed', 'error');
  } catch(e) { showToast('Network error', 'error'); }
  [btn, topBtn].forEach(b => { if (b) { b.disabled = false; b.textContent = b.id === 'settings-save-topbar' ? 'Save' : 'Save Changes'; } });
}

function cancelSettings() {
  if (!settingsOriginal) { closeSettings(); return; }
  settingsData = JSON.parse(JSON.stringify(settingsOriginal));
  populateSettingsUI();
  settingsDirty = false;
  updateSettingsSaveBtn();
  showToast('Changes reverted');
}

// ── BOOT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  initTheme();

  // Auto-year
  const yr = new Date().getFullYear();
  ['year-gate','year-sub','year-footer','year-auth'].forEach(id => {
    const el=document.getElementById(id); if(el) el.textContent=yr;
  });
  ['year-nav','year-student-nav'].forEach(id => {
    const el=document.getElementById(id); if(el) el.textContent='\u00a0'+yr;
  });

  // Load org settings for branding (before gate)
  loadOrgSettings();

  // Swipe back
  initSwipeBack();

  // Wire up modal close-on-backdrop for ALL modals
  document.querySelectorAll('.modal-overlay').forEach(el => {
    el.addEventListener('click', e => { if(e.target===el) closeModal(el.id); });
  });
  // Wire up ef-name input preview
  const efName=document.getElementById('ef-name');
  if(efName) efName.addEventListener('input',updateEditPhotoPreview);
  // Enter key to add goals
  const goalInput=document.getElementById('new-goal-input');
  if(goalInput) goalInput.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();addGoal();} });
  // Escape key to close topmost modal
  document.addEventListener('keydown', e => {
    if(e.key==='Escape'){
      const open=document.querySelector('.modal-overlay.open');
      if(open) closeModal(open.id);
    }
  });

  initGate();
});
`;
