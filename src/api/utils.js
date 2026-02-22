// ── JSON response helper ─────────────────────────────────────
export const jsonResp = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── Cookie helper (30-day session) ──────────────────────────
export const cookieStr = (name, value, maxAge) =>
  `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

// ── Extract session token from Cookie header ─────────────────
export function getToken(request) {
  const m = (request.headers.get('Cookie') || '').match(/asm_session=([a-f0-9]+)/);
  return m ? m[1] : null;
}

// ── Look up the user from the session token ──────────────────
export async function getSessionUser(env, request) {
  const token = getToken(request);
  if (!token) return null;
  const sess = await env.ASM_KV.get(`session:${token}`, { type: 'json' });
  if (!sess || Date.now() > sess.expiresAt) {
    if (sess) await env.ASM_KV.delete(`session:${token}`);
    return null;
  }
  // Passcode session — return synthetic read-only user (no email, no editing)
  if (sess.type === 'passcode') {
    return { name: 'Viewer', email: null, role: 'viewer', expiresAt: sess.expiresAt };
  }
  return env.ASM_KV.get(`user:${sess.email}`, { type: 'json' });
}

export const PERMISSION_LEVELS = {
  none: 0,
  view: 1,
  edit: 2,
  admin: 3,
};

export const ROLE_DEFAULTS = {
  pending: 'view',
  approved: 'edit',
  leader: 'edit',
  admin: 'admin',
  viewer: 'view',
};

const DEFAULT_MODULES = {
  roster: { pending: 'view', approved: 'edit', leader: 'edit', admin: 'admin' },
  activity: { pending: 'view', approved: 'view', leader: 'edit', admin: 'admin' },
  brainDump: { pending: 'none', approved: 'edit', leader: 'edit', admin: 'admin' },
  attendance: { pending: 'view', approved: 'edit', leader: 'edit', admin: 'admin' },
  hangoutNotes: { pending: 'none', approved: 'edit', leader: 'edit', admin: 'admin' },
  adminland: { pending: 'none', approved: 'none', leader: 'none', admin: 'admin' },
  dashboard: { pending: 'view', approved: 'view', leader: 'view', admin: 'admin' },
};

export async function getPermissionMatrix(env) {
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
  const matrix = settings?.permissions?.modules || {};
  const merged = {};
  for (const [module, defaults] of Object.entries(DEFAULT_MODULES)) {
    merged[module] = { ...defaults, ...(matrix[module] || {}) };
  }
  return merged;
}

export async function hasPermission(env, user, module, level = 'view') {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const matrix = await getPermissionMatrix(env);
  const role = user.role || 'pending';
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

export function validatePasswordStrength(password = '') {
  return password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

export function hashToken(token) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)).then(buf =>
    [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  );
}

// ── Password hashing (PBKDF2) ────────────────────────────────
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
  const [saltHex, hashHex] = stored.split(':');
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, km, 256
  );
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('') === hashHex;
}

// ── Random session token ─────────────────────────────────────
export function generateToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Email via MailChannels ───────────────────────────────────
export async function sendEmail(env, { to, subject, html }) {
  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: env.MAILCHANNELS_FROM || 'noreply@anthemstudents.org', name: 'ASM Roster' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return res.status < 300;
  } catch (e) {
    return false;
  }
}

// ── Track a simple metric ────────────────────────────────────
export async function trackMetric(env, type) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `metric:${type}:${today}`;
    const val = (await env.ASM_KV.get(key, { type: 'json' })) || { count: 0 };
    val.count++;
    await env.ASM_KV.put(key, JSON.stringify(val), { expirationTtl: 90 * 24 * 60 * 60 });
  } catch (e) {}
}
