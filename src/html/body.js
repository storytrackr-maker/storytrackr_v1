export const HTML_BODY = `
<!-- ════ GATE ════════════════════════════════════════════════ -->
<div id="screen-gate" class="screen">
  <div class="gate-box">
    <div class="gate-logo">ASM<span id="year-gate">2026</span></div>
    <div class="gate-sub">Worship Grow Go · Anthem Students</div>

    <!-- Two-lane landing (default) -->
    <div class="gate-lanes" id="gate-lanes">
      <div class="gate-lane" id="gate-lane-passcode">
        <div class="lane-icon">👁</div>
        <div class="lane-title">Quick View</div>
        <div class="lane-desc">View-only access with passcode</div>
        <button class="lane-btn lane-btn-view" onclick="showPasscodeForm()">Enter Passcode</button>
      </div>
      <div class="gate-lane gate-lane-leader">
        <div class="lane-icon">⚡</div>
        <div class="lane-title">Leader Login</div>
        <div class="lane-desc">Full access for team leaders</div>
        <button class="lane-btn lane-btn-leader" onclick="showLeaderForm()">Sign In</button>
      </div>
    </div>

    <!-- Passcode sub-form -->
    <div class="gate-form" id="gate-passcode-form" style="display:none">
      <div class="gate-form-back">
        <button class="back-btn" onclick="showLanes()">← Back</button>
        <span class="form-title">Quick View</span>
      </div>
      <input id="gate-input" class="gate-input" type="password" placeholder="Enter passcode" autocomplete="off">
      <button class="gate-btn" id="gate-btn" onclick="checkPasscode()">Enter →</button>
      <div class="gate-error" id="gate-error"></div>
    </div>

    <!-- Leader login sub-form -->
    <div class="gate-form" id="gate-leader-form" style="display:none">
      <div class="gate-form-back">
        <button class="back-btn" onclick="showLanes()">← Back</button>
        <span class="form-title">Leader Login</span>
      </div>
      <input id="gate-leader-email" class="gate-input" type="email" placeholder="Email" autocomplete="email">
      <input id="gate-leader-password" class="gate-input" type="password" placeholder="Password" autocomplete="current-password">
      <button class="gate-btn" id="gate-leader-btn" onclick="doGateLeaderLogin()">Sign In →</button>
      <div class="gate-error" id="gate-leader-error"></div>
      <a class="gate-link" href="#" onclick="event.preventDefault();openAuthModal('signup')">New leader? Sign up</a>
    </div>

    <a class="gate-need-access" href="#" onclick="event.preventDefault();showNeedAccess()">Need access? →</a>
  </div>
</div>

<!-- ════ APP ══════════════════════════════════════════════════ -->
<div id="screen-app" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM<span id="year-nav">&nbsp;2026</span></div>
      <div class="nav-pills">
        <button class="nav-pill active" onclick="switchMainNav('roster',this)">Roster</button>
        <button class="nav-pill" onclick="switchMainNav('dashboard',this)">Dashboard</button>
        <button class="nav-pill" onclick="switchMainNav('activity',this)">Activity</button>
        <button class="nav-pill" onclick="switchMainNav('dump',this)">Brain Dump</button>
      </div>
      <div class="nav-right" id="nav-right"></div>
      <button class="nav-hamburger" id="nav-hamburger" onclick="toggleMobileNav()" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
  <div class="mobile-nav-overlay" id="mobile-nav-overlay" onclick="closeMobileNav()"></div>
  <div class="mobile-nav-drawer" id="mobile-nav-drawer">
    <button class="mob-nav-pill" id="mob-pill-roster"   onclick="switchMainNav('roster',this);closeMobileNav()">Roster</button>
    <button class="mob-nav-pill" id="mob-pill-dashboard" onclick="switchMainNav('dashboard',this);closeMobileNav()">Dashboard</button>
    <button class="mob-nav-pill" id="mob-pill-activity" onclick="switchMainNav('activity',this);closeMobileNav()">Activity</button>
    <button class="mob-nav-pill" id="mob-pill-dump"     onclick="switchMainNav('dump',this);closeMobileNav()">Brain Dump</button>
  </div>

  <!-- BOTTOM NAV (mobile) -->
  <nav class="bottom-nav" id="bottom-nav">
    <button class="bnav-btn active" id="bnav-roster" onclick="switchMainNav('roster',this)">
      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Roster</span>
    </button>
    <button class="bnav-btn" id="bnav-dashboard" onclick="switchMainNav('dashboard',this)">
      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
      <span>Dashboard</span>
    </button>
    <button class="bnav-btn" id="bnav-activity" onclick="switchMainNav('activity',this)">
      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      <span>Activity</span>
    </button>
    <button class="bnav-btn" id="bnav-dump" onclick="switchMainNav('dump',this)">
      <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      <span>Dump</span>
    </button>
  </nav>

  <!-- ROSTER PANEL -->
  <div id="nav-roster" class="nav-panel">
    <div class="container">
      <header>
        <div class="logo-line">Worship <span>Grow Go</span></div>
        <div class="subtitle">Anthem Students · ASM <span id="year-sub">2026</span></div>
      </header>

      <div class="readonly-banner" id="readonly-banner" style="display:none">
        <p>You're viewing in <strong>read-only mode</strong>. Log in to edit.</p>
        <button class="nav-btn primary" onclick="openAuthModal('login')">Log In</button>
      </div>

      <div class="seg-tabs">
        <button class="seg-btn active" onclick="switchTab('hs',this)">High School</button>
        <button class="seg-btn" onclick="switchTab('ms',this)">Middle School</button>
      </div>

      <div class="search-row">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input class="search-input" id="roster-search" placeholder="Search students…" oninput="applyFilters()">
          <button class="search-clear" id="search-clear" onclick="clearSearch()" title="Clear search">✕</button>
        </div>
        <button class="filter-toggle-btn" id="filter-toggle-btn" onclick="toggleFilterPanel()">
          Filters<span class="filter-count" id="filter-count"></span>
        </button>
      </div>
      <div class="filter-panel" id="filter-panel">
        <div class="filter-group">
          <select class="filter-select" id="filter-grade" onchange="applyFilters()">
            <option value="">All Grades</option>
          </select>
          <select class="filter-select" id="filter-school" onchange="applyFilters()">
            <option value="">All Schools</option>
          </select>
          <select class="filter-select" id="filter-connected" onchange="applyFilters()">
            <option value="">All Status</option>
            <option value="connected">Connected</option>
            <option value="not-connected">Not Connected</option>
          </select>
          <select class="filter-select" id="filter-sort" onchange="applyFilters()">
            <option value="">Default Order</option>
            <option value="name-asc">Name A → Z</option>
            <option value="name-desc">Name Z → A</option>
            <option value="grade-asc">Grade Low → High</option>
            <option value="grade-desc">Grade High → Low</option>
            <option value="interactions-desc">Most Interactions</option>
            <option value="interactions-asc">Fewest Interactions</option>
          </select>
        </div>
        <div class="filter-actions">
          <button class="filter-action-btn" onclick="clearFilters()" title="Clear filters">Clear All</button>
          <button class="filter-action-btn" onclick="exportCSV()" title="Download CSV">Export CSV</button>
          <button class="filter-action-btn" onclick="printRoster()" title="Print roster">Print</button>
        </div>
      </div>

      <!-- HS -->
      <div id="tab-hs" class="tab-panel active" data-print-title="High School">
        <div class="stats" id="hs-stats"></div>
        <div class="section-header">
          <div class="section-label">⚡ Core</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','core')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-core-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🔗 Loosely Connected</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','loose')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-loose-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🌙 Fringe</div>
          <button class="add-btn edit-gated" onclick="openAddModal('hs','fringe')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="hs-fringe-grid"></div>
      </div>

      <!-- MS -->
      <div id="tab-ms" class="tab-panel" data-print-title="Middle School">
        <div class="stats" id="ms-stats"></div>
        <div class="section-header">
          <div class="section-label">⚡ Core</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','core')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-core-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🔗 Loosely Connected</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','loose')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-loose-grid"></div>
        <div class="sect-divider"></div>
        <div class="section-header">
          <div class="section-label">🌙 Fringe</div>
          <button class="add-btn edit-gated" onclick="openAddModal('ms','fringe')" style="display:none">+ Add</button>
        </div>
        <div class="roster-grid" id="ms-fringe-grid"></div>
      </div>

      <footer>Worship Grow Go · Anthem Students <span id="year-footer">2026</span></footer>
    </div>
  </div>

  <!-- DASHBOARD PANEL -->
  <div id="nav-dashboard" class="nav-panel" style="display:none">
    <div class="container">
      <header>
        <div class="logo-line" style="font-size:clamp(40px,8vw,72px)">Stats <span>Dashboard</span></div>
        <div class="subtitle">Roster at a glance</div>
      </header>
      <div id="dashboard-content">
        <div class="loader"><div class="loader-ring"></div></div>
      </div>
    </div>
  </div>

  <!-- ACTIVITY PANEL -->
  <div id="nav-activity" class="nav-panel" style="display:none">
    <div class="container">
      <header>
        <div class="logo-line" style="font-size:clamp(40px,8vw,72px)">Recent <span>Activity</span></div>
        <div class="subtitle">What's been happening</div>
      </header>
      <div class="activity-list" id="activity-feed">
        <div class="loader"><div class="loader-ring"></div></div>
      </div>
    </div>
  </div>

  <!-- BRAIN DUMP PANEL -->
  <div id="nav-dump" class="nav-panel" style="display:none">
    <div class="container">
      <div class="dump-wrap">
        <div class="dump-title">Brain <span style="color:var(--accent)">Dump</span></div>
        <p class="dump-sub">Just type anything. Names, conversations, prayer requests. AI will match students and let you log each one as a hangout.</p>
        <textarea id="dump-text" class="dump-area" placeholder="e.g. Had coffee with Lily Larson today. She's been stressed about college apps but is excited about soccer. Also bumped into Josh Mullin at church — he wants to get more plugged in…"></textarea>
        <button class="dump-submit" id="dump-btn" onclick="processBrainDump()">✨ Process & Assign</button>
        <div id="dump-result"></div>
      </div>
    </div>
  </div>
</div>

<!-- ════ STUDENT DETAIL ═══════════════════════════════════════ -->
<div id="screen-student" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM<span id="year-student-nav">&nbsp;2026</span></div>
      <div class="nav-right" id="student-nav-right"></div>
    </div>
  </nav>
  <div class="container">
    <button class="student-back" onclick="goBack()">← Back to Roster</button>
    <div id="student-content"></div>
  </div>
</div>

<!-- ════ ADMIN ════════════════════════════════════════════════ -->
<div id="screen-admin" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">ASM <span>Adminland</span></div>
      <div class="nav-right">
        <button class="nav-btn" onclick="showScreen('app')">← Back</button>
        <button class="nav-btn danger" onclick="logout()">Log Out</button>
      </div>
    </div>
  </nav>
  <div class="container">
    <div class="admin-title">Adminland</div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('overview',this)">Overview</button>
      <button class="admin-tab" onclick="switchAdminTab('users',this)">Users</button>
      <button class="admin-tab" onclick="switchAdminTab('metrics',this)">Metrics</button>
    </div>
    <div id="admin-overview" class="admin-sec active">
      <div class="kpi-grid" id="admin-stats-grid"><div class="loader"><div class="loader-ring"></div></div></div>
    </div>
    <div id="admin-users" class="admin-sec">
      <div id="admin-users-table" style="overflow-x:auto"></div>
    </div>
    <div id="admin-metrics" class="admin-sec">
      <div id="admin-metrics-content"><div class="loader"><div class="loader-ring"></div></div></div>
    </div>
    <footer>Worship Grow Go · Admin</footer>
  </div>
</div>

<!-- ════ SETTINGS ═════════════════════════════════════════════ -->
<div id="screen-settings" class="screen">
  <nav class="top-nav">
    <div class="nav-inner">
      <div class="nav-logo">Settings</div>
      <div class="settings-topbar-info">
        <span class="settings-ministry-name" id="settings-topbar-name"></span>
      </div>
      <div class="nav-right">
        <button class="nav-btn" onclick="closeSettings()">← Back</button>
        <button class="nav-btn" onclick="openAdminUsers()">Users</button>
        <button class="nav-btn primary" id="settings-save-topbar" onclick="saveSettings()" disabled>Save</button>
      </div>
    </div>
  </nav>
  <div class="settings-layout">
    <aside class="settings-sidebar">
      <button class="settings-tab active" data-tab="general" onclick="switchSettingsTab('general',this)">
        <span class="stab-icon">⚙️</span><span class="stab-label">General</span>
      </button>
      <button class="settings-tab" data-tab="tracking" onclick="switchSettingsTab('tracking',this)">
        <span class="stab-icon">📊</span><span class="stab-label">Tracking</span>
      </button>
      <button class="settings-tab" data-tab="access" onclick="switchSettingsTab('access',this)">
        <span class="stab-icon">🔐</span><span class="stab-label">Access</span>
      </button>
      <button class="settings-tab" data-tab="appearance" onclick="switchSettingsTab('appearance',this)">
        <span class="stab-icon">🎨</span><span class="stab-label">Appearance</span>
      </button>
    </aside>
    <main class="settings-content">

      <!-- ── GENERAL TAB ─────────────────────────────────────── -->
      <div class="settings-pane active" id="settings-general">
        <div class="settings-card">
          <div class="scard-title">Ministry Info</div>
          <div class="scard-row">
            <div class="field"><label>Ministry Name</label><input type="text" id="s-ministry-name" placeholder="e.g. Anthem Students" oninput="markSettingsDirty()"></div>
          </div>
          <div class="scard-row">
            <div class="field"><label>Campus / Location</label><input type="text" id="s-campus" placeholder="e.g. Thousand Oaks" oninput="markSettingsDirty()"></div>
          </div>
          <div class="scard-row">
            <div class="s-toggle-row">
              <div class="s-toggle-info">
                <div class="s-toggle-title">Logo</div>
                <div class="s-toggle-desc">Display a custom logo on sign-in, nav bar, and PWA icon.</div>
              </div>
              <div class="s-toggle" id="s-logo-toggle" onclick="toggleSettingsSwitch('s-logo-toggle')"><div class="s-toggle-knob"></div></div>
            </div>
            <div class="s-logo-upload" id="s-logo-upload-area" style="display:none">
              <div class="s-logo-preview" id="s-logo-preview">
                <span class="s-logo-placeholder">No logo</span>
                <img id="s-logo-img" src="" alt="" style="display:none" onload="this.style.display='block';this.previousElementSibling.style.display='none'">
              </div>
              <div class="s-logo-actions">
                <label class="upload-label" for="s-logo-file-input">Upload Logo</label>
                <input type="file" id="s-logo-file-input" accept="image/*" onchange="uploadSettingsLogo(this)">
                <button class="btn-secondary" onclick="removeSettingsLogo()" style="padding:6px 12px;font-size:11px">Remove</button>
              </div>
            </div>
          </div>
          <div class="scard-row">
            <div class="field">
              <label>Grades Served</label>
              <div class="s-helper">Select which grades your ministry serves. These control filters, labels, and grade-based views.</div>
              <div class="s-chips" id="s-grades-chips"></div>
            </div>
          </div>
          <div class="scard-row" id="s-grade-tabs-config">
            <div class="field">
              <label>Grade Tab Assignment</label>
              <div class="s-helper">Assign grades to tabs. Drag chips between the two groups.</div>
              <div class="s-grade-tabs-wrap">
                <div class="s-grade-tab-group">
                  <div class="s-grade-tab-label" id="s-hs-tab-label">High School</div>
                  <input type="text" class="s-grade-tab-name" id="s-hs-label" placeholder="Tab label" oninput="markSettingsDirty()">
                  <div class="s-chips" id="s-hs-grades"></div>
                </div>
                <div class="s-grade-tab-group">
                  <div class="s-grade-tab-label" id="s-ms-tab-label">Middle School</div>
                  <input type="text" class="s-grade-tab-name" id="s-ms-label" placeholder="Tab label" oninput="markSettingsDirty()">
                  <div class="s-chips" id="s-ms-grades"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="scard-title">Default Week</div>
          <div class="scard-row">
            <div class="field-row">
              <div class="field">
                <label>Primary Meeting Day</label>
                <select id="s-meeting-day" onchange="markSettingsDirty()">
                  <option value="sunday">Sunday</option><option value="monday">Monday</option>
                  <option value="tuesday">Tuesday</option><option value="wednesday">Wednesday</option>
                  <option value="thursday">Thursday</option><option value="friday">Friday</option>
                  <option value="saturday">Saturday</option>
                </select>
              </div>
              <div class="field">
                <label>Week Starts On</label>
                <select id="s-week-start" onchange="markSettingsDirty()">
                  <option value="sunday">Sunday</option><option value="monday">Monday</option>
                </select>
              </div>
            </div>
          </div>
          <div class="s-helper" style="margin-top:8px">Helps with attendance views and weekly summaries.</div>
        </div>
      </div>

      <!-- ── TRACKING TAB ────────────────────────────────────── -->
      <div class="settings-pane" id="settings-tracking">
        <div class="settings-card">
          <div class="scard-title">What This Ministry Tracks</div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Hangout Notes</div>
              <div class="s-toggle-desc">Leaders can write notes after services or hangouts.</div>
            </div>
            <div class="s-toggle" id="s-track-hangoutNotes" onclick="toggleSettingsSwitch('s-track-hangoutNotes')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Tags / Labels</div>
              <div class="s-toggle-desc">Add labels like 'new', 'needs follow-up', 'leader'.</div>
            </div>
            <div class="s-toggle" id="s-track-tags" onclick="toggleSettingsSwitch('s-track-tags')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Birthdays</div>
              <div class="s-toggle-desc">Show birthday on student cards and detail pages.</div>
            </div>
            <div class="s-toggle" id="s-track-birthdays" onclick="toggleSettingsSwitch('s-track-birthdays')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Show Grade</div>
              <div class="s-toggle-desc">Display grade badge on student cards.</div>
            </div>
            <div class="s-toggle" id="s-track-showGrade" onclick="toggleSettingsSwitch('s-track-showGrade')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">School</div>
              <div class="s-toggle-desc">Show school name on student cards.</div>
            </div>
            <div class="s-toggle" id="s-track-school" onclick="toggleSettingsSwitch('s-track-school')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Age</div>
              <div class="s-toggle-desc">Calculate and show age from birthday.</div>
            </div>
            <div class="s-toggle" id="s-track-age" onclick="toggleSettingsSwitch('s-track-age')"><div class="s-toggle-knob"></div></div>
          </div>
        </div>

        <div class="settings-card">
          <div class="scard-title">Defaults</div>
          <div class="scard-row">
            <div class="field">
              <label>Default Status for New Students</label>
              <select id="s-default-status" onchange="markSettingsDirty()">
                <option value="new">New</option>
                <option value="regular">Regular</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Auto-Archive After Inactivity</div>
              <div class="s-toggle-desc">Automatically archive students who haven't been seen.</div>
            </div>
            <div class="s-toggle" id="s-auto-archive" onclick="toggleSettingsSwitch('s-auto-archive')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="scard-row" id="s-archive-weeks-row" style="display:none">
            <div class="field" style="max-width:200px">
              <label>Archive After (weeks)</label>
              <input type="number" id="s-archive-weeks" min="1" max="52" value="8" oninput="markSettingsDirty()">
            </div>
          </div>
        </div>
      </div>

      <!-- ── ACCESS TAB ──────────────────────────────────────── -->
      <div class="settings-pane" id="settings-access">
        <div class="settings-card">
          <div class="scard-title">Who Can Use This</div>
          <div class="scard-row">
            <div class="s-radio-group" id="s-access-mode">
              <label class="s-radio">
                <input type="radio" name="access-mode" value="leaders-only" onchange="onAccessModeChange();markSettingsDirty()" checked>
                <span class="s-radio-mark"></span>
                <div>
                  <div class="s-radio-title">Leaders Only (login required)</div>
                  <div class="s-radio-desc">Users must sign in. Admins can manage access.</div>
                </div>
              </label>
              <label class="s-radio">
                <input type="radio" name="access-mode" value="shared-passcode" onchange="onAccessModeChange();markSettingsDirty()">
                <span class="s-radio-mark"></span>
                <div>
                  <div class="s-radio-title">Shared Passcode (view-only)</div>
                  <div class="s-radio-desc">Anyone with the passcode gets view-only access.</div>
                </div>
              </label>
            </div>
          </div>
          <div id="s-passcode-config" style="display:none">
            <div class="scard-row">
              <div class="field">
                <label>Passcode</label>
                <input type="password" id="s-passcode" placeholder="Enter passcode" oninput="markSettingsDirty()" autocomplete="off">
                <button class="s-show-pass" onclick="togglePasscodeVisibility()" type="button">Show</button>
              </div>
            </div>
            <div class="scard-row">
              <div class="field">
                <label>What Passcode Users Can See</label>
                <div class="s-checkbox-group">
                  <label class="s-checkbox"><input type="checkbox" id="s-perm-viewRoster" onchange="markSettingsDirty()" checked><span>View roster</span></label>
                  <label class="s-checkbox"><input type="checkbox" id="s-perm-viewAttendance" onchange="markSettingsDirty()"><span>View attendance summaries</span></label>
                  <label class="s-checkbox"><input type="checkbox" id="s-perm-viewNotes" onchange="markSettingsDirty()"><span>View notes</span></label>
                  <label class="s-checkbox"><input type="checkbox" id="s-perm-viewPrayer" onchange="markSettingsDirty()"><span>View prayer requests</span></label>
                </div>
              </div>
            </div>
          </div>
          <div id="s-leaders-only-info" style="display:none">
            <div class="s-info-box">Users must sign in with their email and password. Admins can manage access from the Admin panel.</div>
          </div>
        </div>

        <div class="settings-card">
          <div class="scard-title">Simple Roles (MVP)</div>
          <div class="s-helper" style="margin-bottom:12px">What each role can do. Not customizable yet.</div>
          <table class="s-roles-table">
            <thead><tr><th>Role</th><th>Roster</th><th>Attendance</th><th>Notes</th><th>Settings</th></tr></thead>
            <tbody>
              <tr><td><span class="role-badge admin">Admin</span></td><td>Edit</td><td>Edit</td><td>Edit</td><td>Edit</td></tr>
              <tr><td><span class="role-badge leader">Leader</span></td><td>Edit</td><td>Edit</td><td>Edit</td><td>—</td></tr>
              <tr><td><span class="role-badge pending">Viewer</span></td><td>View</td><td>View</td><td>—</td><td>—</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── APPEARANCE TAB ──────────────────────────────────── -->
      <div class="settings-pane" id="settings-appearance">
        <div class="settings-card">
          <div class="scard-title">Theme</div>
          <div class="scard-row">
            <div class="s-theme-selector">
              <button class="s-theme-opt" data-theme="dark" onclick="selectSettingsTheme('dark')">
                <div class="s-theme-preview s-theme-dark"></div>
                <span>Dark</span>
              </button>
              <button class="s-theme-opt" data-theme="light" onclick="selectSettingsTheme('light')">
                <div class="s-theme-preview s-theme-light"></div>
                <span>Light</span>
              </button>
              <button class="s-theme-opt" data-theme="auto" onclick="selectSettingsTheme('auto')">
                <div class="s-theme-preview s-theme-auto"></div>
                <span>Auto (system)</span>
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="scard-title">Mobile Layout</div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Compact Mode</div>
              <div class="s-toggle-desc">Tighter spacing for smaller screens.</div>
            </div>
            <div class="s-toggle" id="s-compact-mode" onclick="toggleSettingsSwitch('s-compact-mode')"><div class="s-toggle-knob"></div></div>
          </div>
          <div class="s-toggle-row">
            <div class="s-toggle-info">
              <div class="s-toggle-title">Sticky Bottom Tabs on Mobile</div>
              <div class="s-toggle-desc">Keeps navigation visible at the bottom of the screen.</div>
            </div>
            <div class="s-toggle" id="s-sticky-tabs" onclick="toggleSettingsSwitch('s-sticky-tabs')"><div class="s-toggle-knob"></div></div>
          </div>
        </div>
      </div>

    </main>
  </div>
  <div class="settings-footer">
    <div class="settings-footer-inner">
      <button class="btn-save" id="settings-save-btn" onclick="saveSettings()" disabled>Save Changes</button>
      <button class="btn-secondary" id="settings-cancel-btn" onclick="cancelSettings()">Cancel</button>
      <span class="settings-footer-note">Changes apply immediately after saving.</span>
    </div>
  </div>
</div>

<!-- ════ MODALS ═══════════════════════════════════════════════ -->

<!-- AUTH -->
<div class="modal-overlay" id="auth-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('auth-modal')">✕</button>
    <div class="modal-title" id="auth-modal-title">Welcome Back</div>
    <div class="modal-sub">ASM <span id="year-auth">2026</span> · Anthem Students</div>
    <div class="modal-tabs">
      <button class="modal-tab active" id="tab-login-btn" onclick="switchAuthTab('login')">Log In</button>
      <button class="modal-tab" id="tab-signup-btn" onclick="switchAuthTab('signup')">Sign Up</button>
    </div>
    <div id="auth-login-form" class="auth-form">
      <div class="field"><label>Email</label><input type="email" id="login-email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="auth-msg" id="login-msg"></div>
      <button class="auth-submit" id="login-submit" onclick="doLogin()">Log In</button>
    </div>
    <div id="auth-signup-form" class="auth-form" style="display:none">
      <div class="field"><label>Full Name</label><input type="text" id="signup-name" placeholder="First Last" autocomplete="name"></div>
      <div class="field"><label>Email</label><input type="email" id="signup-email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>Password</label><input type="password" id="signup-password" placeholder="Min 8 characters" autocomplete="new-password"></div>
      <div class="auth-msg" id="signup-msg"></div>
      <button class="auth-submit" id="signup-submit" onclick="doSignup()">Create Account</button>
    </div>
  </div>
</div>

<!-- EDIT STUDENT -->
<div class="modal-overlay" id="edit-modal">
  <div class="modal" style="max-width:500px">
    <button class="modal-close" onclick="closeEditModal()">✕</button>
    <div class="modal-title" id="edit-modal-title">Edit Student</div>
    <div class="modal-sub" id="edit-modal-sub">High School · Core</div>
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div class="photo-preview" id="edit-photo-preview">
        <div class="av-fallback" id="edit-pv-fallback" style="background:var(--accent)">?</div>
        <img id="edit-pv-img" src="" alt="" onload="this.classList.add('loaded')" onerror="this.style.display='none'">
      </div>
      <div style="flex:1">
        <div class="field" style="margin-bottom:8px">
          <label>Photo URL (Google Drive)</label>
          <input type="text" id="ef-photoUrl" placeholder="https://drive.google.com/file/d/…" oninput="updateEditPhotoPreview()">
        </div>
        <label class="upload-label" for="photo-upload-input">📸 Upload Photo</label>
        <input type="file" id="photo-upload-input" accept="image/*" onchange="uploadStudentPhoto(this)">
      </div>
    </div>
    <div class="field"><label>Full Name *</label><input type="text" id="ef-name" placeholder="First Last"></div>
    <div class="field-row">
      <div class="field"><label>Grade</label><input type="text" id="ef-grade" placeholder="9"></div>
      <div class="field"><label>Birthday</label><input type="date" id="ef-birthday"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>School</label><input type="text" id="ef-school" placeholder="School name"></div>
      <div class="field" id="ef-section-field">
        <label>Section</label>
        <select id="ef-section">
          <option value="core">Core</option>
          <option value="loose">Loosely Connected</option>
          <option value="fringe">Fringe</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Interest / Sport</label><input type="text" id="ef-interest" placeholder="Soccer, Guitar…"></div>
    <div class="field"><label>Primary Goal</label><input type="text" id="ef-primary-goal" placeholder="e.g. Get plugged into a community group"></div>
    <div class="field"><label>Notes</label><input type="text" id="ef-notes" placeholder="Optional notes"></div>
    <div class="field" id="ef-connected-field">
      <label>Connection Status</label>
      <div class="connected-toggle" id="ef-connected-toggle" onclick="toggleConnected()">
        <div class="toggle-dot"></div>
        <span class="toggle-label">Not Connected</span>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-save" id="ef-save-btn" onclick="saveEdit()">Save Changes</button>
      <button class="btn-secondary" onclick="closeEditModal()">Cancel</button>
      <button class="btn-danger" id="ef-delete-btn" onclick="confirmDelete()">Delete</button>
    </div>
  </div>
</div>

<!-- PROFILE -->
<div class="modal-overlay" id="profile-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeProfileModal()">✕</button>
    <div class="modal-title">My Profile</div>
    <div class="modal-sub">Leader Account</div>
    <div class="profile-av-wrap">
      <div class="profile-av" id="profile-av-lg">
        <span id="profile-av-initials">?</span>
        <img id="profile-av-img" src="" alt="" onload="this.classList.add('loaded')" onerror="this.style.display='none'">
      </div>
      <div>
        <div style="font-size:16px;font-weight:600" id="profile-display-name">Loading…</div>
        <div style="font-size:12px;color:var(--muted)" id="profile-display-email"></div>
        <label class="upload-label" for="profile-photo-input" style="margin-top:8px">📸 Change Photo</label>
        <input type="file" id="profile-photo-input" accept="image/*" onchange="uploadProfilePhoto(this)">
      </div>
    </div>
    <div class="field"><label>Display Name</label><input type="text" id="profile-name-input" placeholder="Your full name"></div>
    <div class="field"><label>Leader Since</label><input type="text" id="profile-since-input" placeholder="e.g. September 2022"></div>
    <div class="field"><label>Fun Fact</label><input type="text" id="profile-funfact-input" placeholder="e.g. I can eat 12 tacos in one sitting"></div>
    <div class="field">
      <label>Appearance</label>
      <div class="theme-toggle-row">
        <button id="theme-btn-dark"  class="theme-btn" onclick="applyTheme('dark')">Dark</button>
        <button id="theme-btn-auto"  class="theme-btn" onclick="applyTheme('auto')">Auto</button>
        <button id="theme-btn-light" class="theme-btn" onclick="applyTheme('light')">Light</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveProfile()">Save Profile</button>
      <button class="btn-secondary" onclick="closeProfileModal()">Cancel</button>
      <button class="btn-danger" onclick="logout()">Log Out</button>
    </div>
  </div>
</div>

<!-- LOG HANGOUT -->
<div class="modal-overlay" id="interaction-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeInteractionModal()">✕</button>
    <div class="modal-title">Log Hangout</div>
    <div class="modal-sub" id="int-modal-sub">with Student</div>
    <div class="field"><label>Leader Name</label><input type="text" id="int-leader" placeholder="Your name"></div>
    <div class="field"><label>Date</label><input type="date" id="int-date"></div>
    <div class="field"><label>What happened? Any key moments or prayer requests?</label><textarea id="int-summary" rows="5" placeholder="e.g. We grabbed coffee and she opened up about some struggles at home. She's been thinking about what it means to grow in her faith. Prayed together at the end."></textarea></div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveInteraction()">Log It ✓</button>
      <button class="btn-secondary" onclick="closeInteractionModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- EDIT HANGOUT NOTE -->
<div class="modal-overlay" id="edit-interaction-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('edit-interaction-modal')">✕</button>
    <div class="modal-title">Edit Hangout Note</div>
    <div class="field"><label>Date</label><input type="date" id="edit-int-date"></div>
    <div class="field"><label>What happened? Any key moments or prayer requests?</label><textarea id="edit-int-summary" rows="5"></textarea></div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveEditedInteraction()">Save Changes</button>
      <button class="btn-secondary" onclick="closeModal('edit-interaction-modal')">Cancel</button>
    </div>
  </div>
</div>

<!-- CONFIRM DELETE NOTE -->
<div class="modal-overlay" id="confirm-delete-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('confirm-delete-modal')">✕</button>
    <div class="modal-title">Delete Note?</div>
    <div class="modal-sub">Are you sure you want to delete this note? This cannot be undone.</div>
    <div class="modal-actions">
      <button class="btn-danger" onclick="confirmDeleteInteraction()">Delete</button>
      <button class="btn-secondary" onclick="closeModal('confirm-delete-modal')">Cancel</button>
    </div>
  </div>
</div>

<!-- CONFIRM DELETE STUDENT -->
<div class="modal-overlay" id="confirm-student-delete-modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal('confirm-student-delete-modal')">✕</button>
    <div class="modal-title">Remove Student?</div>
    <div class="modal-sub">Are you sure you want to remove <strong id="confirm-student-delete-name"></strong> from the roster? This cannot be undone.</div>
    <div class="modal-actions">
      <button class="btn-danger" onclick="doConfirmDeleteStudent()">Remove Student</button>
      <button class="btn-secondary" onclick="closeModal('confirm-student-delete-modal')">Cancel</button>
    </div>
  </div>
</div>

<!-- PHOTO CROP MODAL -->
<div class="modal-overlay" id="crop-modal">
  <div class="modal crop-modal-inner">
    <button class="modal-close" onclick="closeModal('crop-modal')">✕</button>
    <div class="modal-title">Adjust Photo</div>
    <div class="modal-sub">Drag to reposition · Scroll to zoom</div>
    <div class="crop-canvas-wrap">
      <canvas id="crop-canvas" width="300" height="300"></canvas>
    </div>
    <div class="crop-zoom-wrap">
      <span class="crop-zoom-label">Zoom</span>
      <input type="range" id="crop-zoom" class="crop-zoom-slider" min="1" max="3" step="0.01" value="1" oninput="onCropZoom(this.value)">
    </div>
    <div class="modal-actions">
      <button class="btn-save" onclick="saveCrop()">Use Photo</button>
      <button class="btn-secondary" onclick="closeCropModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- Hidden file input for photo picking -->
<input type="file" id="shared-photo-input" accept="image/*" style="display:none" onchange="onSharedPhotoSelected(this)">

<!-- TOAST -->
<div id="toast" class="toast"></div>
`;
