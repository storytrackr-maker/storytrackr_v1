import { jsonResp, requirePermission, orgSettingsKey } from './utils.js';

const DEFAULT_SETTINGS = {
  ministryName: 'Anthem Students',
  campus: '',
  logoUrl: '',
  logoEnabled: false,
  logoTone: 'light',
  gradeTabs: {
    hs: { label: 'High School', grades: [9, 10, 11, 12] },
    ms: { label: 'Middle School', grades: [6, 7, 8] },
  },
  meetingDay: 'sunday',
  weekStartsOn: 'sunday',
  tracking: {
    hangoutNotes: true,
    tags: false,
    birthdays: true,
    showGrade: true,
    school: true,
    age: true,
  },
  defaults: {
    newStudentStatus: 'new',
    autoArchive: false,
    autoArchiveWeeks: 8,
  },
  access: {
    mode: 'leaders-only',
    passcode: '',
    passcodePermissions: {
      viewRoster: true,
      viewAttendance: false,
      viewNotes: false,
      viewPrayer: false,
    },
  },
  appearance: {
    theme: 'auto',
    compactMode: false,
    stickyBottomTabs: true,
  },
  permissions: {
    roles: ['pending', 'approved', 'leader', 'admin'],
    levels: ['none', 'view', 'edit', 'admin'],
    modules: {
      roster: { pending: 'view', approved: 'edit', leader: 'edit', admin: 'admin' },
      activity: { pending: 'view', approved: 'view', leader: 'edit', admin: 'admin' },
      brainDump: { pending: 'none', approved: 'edit', leader: 'edit', admin: 'admin' },
      attendance: { pending: 'view', approved: 'edit', leader: 'edit', admin: 'admin' },
      hangoutNotes: { pending: 'none', approved: 'edit', leader: 'edit', admin: 'admin' },
      adminland: { pending: 'none', approved: 'none', leader: 'none', admin: 'admin' },
      dashboard: { pending: 'view', approved: 'view', leader: 'view', admin: 'admin' },
    },
  },
  inactivityDays: 90,
  statCards: {
    totalStudents: true,
    totalInteractions: true,
    interactionsThisMonth: true,
    activeLeaders: true,
  },
  features: {
    goals: true,
    notes: true,
    activity: true,
    familyContact: true,
  },
};

export async function handleSettings(request, env, pathname, method) {
  // Public settings — no auth needed (for branding on gate screen)
  if (pathname === '/api/settings/public' && method === 'GET') {
    const orgId = new URL(request.url).searchParams.get('orgId') || 'default';
    return getPublicSettings(env, orgId);
  }

  // All other settings routes require admin
  const perm = await requirePermission(env, request, 'adminland', 'admin');
  if (!perm.ok) return perm.response;

  const orgId = perm.user.orgId || 'default';
  if (pathname === '/api/settings' && method === 'GET') return getSettings(env, orgId);
  if (pathname === '/api/settings' && method === 'POST') return saveSettings(request, env, orgId);

  return jsonResp({ error: 'Not found' }, 404);
}

async function getSettings(env, orgId = 'default') {
  const stored = await env.ST_KV.get(orgSettingsKey(orgId), { type: 'json' });
  const settings = { ...DEFAULT_SETTINGS, ...stored };
  return jsonResp({ settings });
}

async function saveSettings(request, env, orgId = 'default') {
  const updates = await request.json();
  const current = await env.ST_KV.get(orgSettingsKey(orgId), { type: 'json' }) || {};
  const merged = deepMerge(DEFAULT_SETTINGS, current, updates);
  await env.ST_KV.put(orgSettingsKey(orgId), JSON.stringify(merged));
  return jsonResp({ success: true, settings: merged });
}

async function getPublicSettings(env, orgId = 'default') {
  const stored = await env.ST_KV.get(orgSettingsKey(orgId), { type: 'json' });
  const s = { ...DEFAULT_SETTINGS, ...stored };
  return jsonResp({
    ministryName: s.ministryName,
    campus: s.campus,
    logoUrl: s.logoEnabled && s.logoUrl ? s.logoUrl : '',
    logoTone: s.logoTone || 'light',
    logoEnabled: s.logoEnabled,
    gradeTabs: s.gradeTabs,
    tracking: s.tracking,
    appearance: s.appearance,
    permissions: s.permissions,
    accessMode: s.access?.mode || 'leaders-only',
    inactivityDays: s.inactivityDays ?? 90,
    statCards: s.statCards || DEFAULT_SETTINGS.statCards,
    features: s.features || DEFAULT_SETTINGS.features,
  });
}

function deepMerge(...sources) {
  const result = {};
  for (const src of sources) {
    if (!src) continue;
    for (const key of Object.keys(src)) {
      if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
        result[key] = deepMerge(result[key] || {}, src[key]);
      } else {
        result[key] = src[key];
      }
    }
  }
  return result;
}
