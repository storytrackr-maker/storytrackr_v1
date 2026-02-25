// ── JSON response helper ─────────────────────────────────────
export const jsonResp = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── Cookie helper ─────────────────────────────────────────────
export const cookieStr = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const orgMemberKey = (orgId, email) => `orgmember:${orgId}:${email}`;
export const orgSettingsKey = orgId => `settings:org:${orgId || 'default'}`;

// ── Extract session token from Cookie header ──────────────────
export function getToken(request) {
  const m = (request.headers.get('Cookie') || '').match(/st_session=([a-f0-9]+)/);
  return m ? m[1] : null;
}

export async function getOrgMembership(env, orgId, email) {
  if (!orgId || !email) return null;
  return env.ST_KV.get(orgMemberKey(orgId, email), { type: 'json' });
}

// ── Look up the user from the session token ───────────────────
export async function getSessionUser(env, request) {
  const token = getToken(request);
  if (!token) return null;
  const sess = await env.ST_KV.get(`session:${token}`, { type: 'json' });
  if (!sess || Date.now() > sess.expiresAt) {
    if (sess) await env.ST_KV.delete(`session:${token}`);
    return null;
  }
  if (sess.type === 'passcode') {
    return { name: 'Viewer', email: null, role: 'viewer', orgRole: 'viewer', expiresAt: sess.expiresAt };
  }
  if (sess.type === 'demo') {
    return {
      name: 'Demo User', email: null, role: 'demo', orgRole: 'demo', isDemoMode: true,
      orgId: env.DEMO_TENANT_ID || 'demo', expiresAt: sess.expiresAt,
    };
  }
  const user = await env.ST_KV.get(`user:${sess.email}`, { type: 'json' });
  if (!user) return null;
  user.orgId = sess.orgId || 'default';
  const membership = await getOrgMembership(env, user.orgId, user.email);
  user.orgRole = membership?.role || 'pending';
  user.orgStatus = membership?.status || 'pending';
  return user;
}

export const PERMISSION_LEVELS = { none: 0, view: 1, edit: 2, admin: 3 };
export const ROLE_DEFAULTS = { pending: 'view', approved: 'edit', leader: 'edit', admin: 'admin', viewer: 'view', demo: 'view' };

const DEFAULT_MODULES = {
  roster:       { pending: 'view',  approved: 'edit', leader: 'edit', admin: 'admin', demo: 'view',  viewer: 'view' },
  activity:     { pending: 'view',  approved: 'view', leader: 'edit', admin: 'admin', demo: 'view',  viewer: 'view' },
  brainDump:    { pending: 'none',  approved: 'edit', leader: 'edit', admin: 'admin', demo: 'none',  viewer: 'none' },
  attendance:   { pending: 'view',  approved: 'edit', leader: 'edit', admin: 'admin', demo: 'view',  viewer: 'view' },
  hangoutNotes: { pending: 'none',  approved: 'edit', leader: 'edit', admin: 'admin', demo: 'view',  viewer: 'none' },
  adminland:    { pending: 'none',  approved: 'none', leader: 'none', admin: 'admin', demo: 'none',  viewer: 'none' },
  dashboard:    { pending: 'view',  approved: 'view', leader: 'view', admin: 'admin', demo: 'view',  viewer: 'view' },
};

export async function getPermissionMatrix(env, orgId = 'default') {
  const settings = await env.ST_KV.get(orgSettingsKey(orgId), { type: 'json' });
  const matrix = settings?.permissions?.modules || {};
  const merged = {};
  for (const [module, defaults] of Object.entries(DEFAULT_MODULES)) {
    merged[module] = { ...defaults, ...(matrix[module] || {}) };
  }
  return merged;
}

export async function hasPermission(env, user, module, level = 'view') {
  if (!user) return false;
  if (user.orgRole === 'admin') return true;
  if (user.role === 'demo' && (PERMISSION_LEVELS[level] || 0) > PERMISSION_LEVELS.view) return false;
  if (user.orgStatus && user.orgStatus !== 'approved' && user.orgRole !== 'pending') return false;
  const matrix = await getPermissionMatrix(env, user.orgId || 'default');
  const role = user.orgRole || user.role || 'pending';
  const userLevel = matrix[module]?.[role] || ROLE_DEFAULTS[role] || 'none';
  return (PERMISSION_LEVELS[userLevel] || 0) >= (PERMISSION_LEVELS[level] || 0);
}

export async function requirePermission(env, request, module, level = 'view') {
  const user = await getSessionUser(env, request);
  if (!user) return { ok: false, response: jsonResp({ error: 'Not authenticated' }, 401) };
  const ok = await hasPermission(env, user, module, level);
  if (!ok) return { ok: false, response: jsonResp({ error: 'Forbidden' }, 403) };
  return { ok: true, user };
}

export async function withPermission(env, request, module, level, handler) {
  const perm = await requirePermission(env, request, module, level);
  if (!perm.ok) return perm.response;
  return handler(perm.user);
}

export function getClientIp(request) {
  const direct = request.headers.get('CF-Connecting-IP');
  if (direct) return direct;
  const xff = request.headers.get('X-Forwarded-For') || '';
  return xff.split(',')[0].trim() || 'unknown';
}

export function getRequestId(request) {
  return request.headers.get('X-Request-Id') || request.headers.get('CF-Ray') || generateToken().slice(0, 16);
}

export function logEvent(request, level, event, data = {}) {
  const payload = {
    ts: new Date().toISOString(), level, event,
    requestId: getRequestId(request), path: new URL(request.url).pathname,
    ...data,
  };
  console.log(JSON.stringify(payload));
}

export async function checkRateLimit(env, key, limit, windowSec) {
  const now = Date.now();
  const state = (await env.ST_KV.get(key, { type: 'json' })) || { count: 0, windowStart: now };
  if (now - state.windowStart > windowSec * 1000) {
    state.count = 0;
    state.windowStart = now;
  }
  state.count += 1;
  await env.ST_KV.put(key, JSON.stringify(state), { expirationTtl: windowSec });
  return state.count <= limit;
}

export function validatePasswordStrength(password = '') {
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function hashToken(token) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then(buf =>
    [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  );
}

export async function hashPassword(password) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256
  );
  const h = b => b.toString(16).padStart(2, '0');
  return [...salt].map(h).join('') + ':' + [...new Uint8Array(bits)].map(h).join('');
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex || saltHex.length % 2 !== 0 || hashHex.length !== 64) return false;
  if (!/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) return false;
  const saltPairs = saltHex.match(/.{2}/g);
  if (!saltPairs) return false;
  const salt = new Uint8Array(saltPairs.map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256
  );
  const computed = [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
  return constantTimeEqual(computed, hashHex.toLowerCase());
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sendEmail(env, { to, subject, html }) {
  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: env.MAILCHANNELS_FROM || 'noreply@storytrackr.app', name: 'StoryTrackr' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return res.status < 300;
  } catch (e) {
    return false;
  }
}

export async function trackMetric(env, type) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `metric:${type}:${today}`;
    const val = (await env.ST_KV.get(key, { type: 'json' })) || { count: 0 };
    val.count++;
    await env.ST_KV.put(key, JSON.stringify(val), { expirationTtl: 90 * 24 * 60 * 60 });
  } catch (e) {}
}
