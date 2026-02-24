import {
  jsonResp, cookieStr, getSessionUser,
  hashPassword, verifyPassword, generateToken, sendEmail, trackMetric,
  validatePasswordStrength, hashToken, checkRateLimit, getClientIp,
  orgMemberKey, getOrgMembership,
} from './utils.js';
import { isValidEmail, normalizeEmail, parseJsonBody } from './validation.js';

const SESSION_TTL = 30 * 24 * 60 * 60;
const RESET_TTL   = 30 * 60;
const APP_URL     = 'https://app.storytrackr.app';

export async function handleAuth(request, env, pathname, method) {
  if (pathname === '/api/auth/signup'          && method === 'POST') return signup(request, env);
  if (pathname === '/api/auth/login'           && method === 'POST') return login(request, env);
  if (pathname === '/api/auth/logout'          && method === 'POST') return logout(request, env);
  if (pathname === '/api/auth/change-password' && method === 'POST') return changePassword(request, env);
  if (pathname === '/api/auth/forgot-password' && method === 'POST') return forgotPassword(request, env);
  if (pathname === '/api/auth/reset-password'  && method === 'POST') return resetPassword(request, env);
  if (pathname === '/api/me'                   && method === 'GET')  return me(request, env);
  if (pathname === '/api/profile/update'       && method === 'POST') return profileUpdate(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function signup(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { email, password, name, orgName } = body;
  const normalizedOrgName = String(orgName || '').trim();
  if (!email || !password || !name || !normalizedOrgName) return jsonResp({ error: 'Name, email, password, and ministry name are required' }, 400);
  if (normalizedOrgName.length > 120) return jsonResp({ error: 'Ministry name is too long' }, 400);
  if (!validatePasswordStrength(password)) return jsonResp({ error: 'Use 10+ chars with upper/lowercase and number' }, 400);
  if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email' }, 400);
  const normalizedEmail = normalizeEmail(email);
  if (await env.ST_KV.get(`user:${normalizedEmail}`)) return jsonResp({ error: 'Account already exists' }, 409);

  // Create org if orgName provided (new SaaS org creation)
  let newOrgId = 'default';
  if (normalizedOrgName) {
    newOrgId = `org_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const org = { id: newOrgId, name: normalizedOrgName, createdAt: new Date().toISOString(), ownerId: normalizedEmail };
    await env.ST_KV.put(`org:${newOrgId}`, JSON.stringify(org));
    // Make first user admin of their org
    await env.ST_KV.put(`orgmember:${newOrgId}:${normalizedEmail}`, JSON.stringify({ role: 'admin', status: 'approved', joinedAt: new Date().toISOString() }));
  }

  const user = {
    email: normalizedEmail, name,
    passwordHash: await hashPassword(password),
    role: 'user',
    status: 'active',
    orgIds: [newOrgId],
    createdAt: new Date().toISOString(),
  };
  await env.ST_KV.put(`user:${user.email}`, JSON.stringify(user));

  if (!normalizedOrgName) {
    await env.ST_KV.put(orgMemberKey('default', user.email), JSON.stringify({ role: 'pending', status: 'pending_approval', joinedAt: new Date().toISOString() }));
    // Notify admins for approval
    const admins = await listAdmins(env);
    await Promise.all(admins.map(a => sendEmail(env, {
      to: a.email,
      subject: 'New Account Request — StoryTrackr',
      html: `<p>A new user has requested access.</p><p><b>Name:</b> ${name}<br><b>Email:</b> ${email}<br><b>Time:</b> ${new Date().toISOString()}</p><p>Approve or deny inside the app settings.</p>`,
    })));
    return jsonResp({ success: true, message: 'Account request submitted for approval.' });
  }

  // Auto-login for new org creators
  const token = generateToken();
  await env.ST_KV.put(`session:${token}`, JSON.stringify({ email: user.email, orgId: newOrgId, expiresAt: Date.now() + SESSION_TTL * 1000 }), { expirationTtl: SESSION_TTL });
  return new Response(JSON.stringify({ success: true, user: await safeUser(user, env), onboarding: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('st_session', token, SESSION_TTL) },
  });
}

async function login(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { email, password } = body;
  if (!email || !password) return jsonResp({ error: 'Invalid email or password' }, 401);
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:auth:login:${ip}`, 20, 60 * 15);
  if (!allowed) return jsonResp({ error: 'Too many login attempts. Please try again later.' }, 429);

  const user = await env.ST_KV.get(`user:${normalizeEmail(email)}`, { type: 'json' });
  if (!user || !await verifyPassword(password, user.passwordHash)) return jsonResp({ error: 'Invalid email or password' }, 401);
  const orgIds = user.orgIds || ['default'];
  const memberships = [];
  for (const orgId of orgIds) {
    const m = await getOrgMembership(env, orgId, user.email);
    if (m) memberships.push({ orgId, ...m });
  }
  const approvedMemberships = memberships.filter(m => m.status === 'approved');
  if (!approvedMemberships.length) return jsonResp({ error: 'Your account is pending approval.' }, 403);

  const selectedOrgId = approvedMemberships[0].orgId;

  const token = generateToken();
  await env.ST_KV.put(
    `session:${token}`,
    JSON.stringify({ email: user.email, orgId: selectedOrgId, expiresAt: Date.now() + SESSION_TTL * 1000 }),
    { expirationTtl: SESSION_TTL }
  );
  await trackMetric(env, 'login');
  return new Response(JSON.stringify({
    success: true,
    user: await safeUser(user, env),
    orgIds: approvedMemberships.map(m => m.orgId),
    requireOrgPicker: approvedMemberships.length > 1,
  }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('st_session', token, SESSION_TTL) },
  });
}

async function logout(request, env) {
  const m = (request.headers.get('Cookie') || '').match(/st_session=([a-f0-9]+)/);
  if (m) await env.ST_KV.delete(`session:${m[1]}`);
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('st_session', '', 0) },
  });
}

async function me(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ user: null });
  await trackMetric(env, 'pageview');
  return jsonResp({ user: await safeUser(user, env), isDemoMode: !!user.isDemoMode });
}

async function profileUpdate(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !user.email) return jsonResp({ error: 'Not authenticated' }, 401);
  if (user.isDemoMode) return jsonResp({ error: 'Demo is read-only' }, 403);
  const updates = await request.json();
  ['name', 'leaderSince', 'funFact', 'photoUrl'].forEach(k => { if (updates[k] !== undefined) user[k] = updates[k]; });
  await env.ST_KV.put(`user:${user.email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}

async function changePassword(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !user.email) return jsonResp({ error: 'Not authenticated' }, 401);
  if (user.isDemoMode) return jsonResp({ error: 'Demo is read-only' }, 403);
  const { oldPassword, newPassword, confirmPassword } = await request.json();
  if (!oldPassword || !newPassword || !confirmPassword) return jsonResp({ error: 'All fields required' }, 400);
  if (newPassword !== confirmPassword) return jsonResp({ error: 'New passwords do not match' }, 400);
  if (!validatePasswordStrength(newPassword)) return jsonResp({ error: 'Weak password' }, 400);
  if (!await verifyPassword(oldPassword, user.passwordHash)) return jsonResp({ error: 'Old password incorrect' }, 401);
  user.passwordHash = await hashPassword(newPassword);
  await env.ST_KV.put(`user:${user.email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}

async function forgotPassword(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { email } = body;
  const generic = { success: true, message: 'If that account exists, a reset link has been sent.' };
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:auth:forgot:${ip}`, 10, 60 * 15);
  if (!allowed) return jsonResp({ error: 'Too many reset requests. Please try again later.' }, 429);
  if (!email) return jsonResp(generic);
  const user = await env.ST_KV.get(`user:${String(email).toLowerCase()}`, { type: 'json' });
  if (!user) return jsonResp(generic);
  const raw = generateToken();
  const tokenHash = await hashToken(raw);
  await env.ST_KV.put(`pwdreset:${tokenHash}`, JSON.stringify({ email: user.email, createdAt: Date.now() }), { expirationTtl: RESET_TTL });
  await sendEmail(env, {
    to: user.email,
    subject: 'Reset your StoryTrackr password',
    html: `<p>Click the link below to reset your password (expires in 30 minutes):</p><p><a href="${APP_URL}/reset-password?token=${raw}">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`,
  });
  return jsonResp(generic);
}

async function resetPassword(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { token, newPassword, confirmPassword } = body;
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:auth:reset:${ip}`, 12, 60 * 15);
  if (!allowed) return jsonResp({ error: 'Too many reset attempts. Please try again later.' }, 429);
  if (!token || !newPassword || newPassword !== confirmPassword) return jsonResp({ error: 'Invalid request' }, 400);
  if (!validatePasswordStrength(newPassword)) return jsonResp({ error: 'Weak password' }, 400);
  const tokenHash = await hashToken(token);
  const rec = await env.ST_KV.get(`pwdreset:${tokenHash}`, { type: 'json' });
  if (!rec?.email) return jsonResp({ error: 'Invalid or expired token' }, 400);
  const user = await env.ST_KV.get(`user:${rec.email}`, { type: 'json' });
  if (!user) return jsonResp({ error: 'Invalid token' }, 400);
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await env.ST_KV.put(`user:${user.email}`, JSON.stringify(user));
  await env.ST_KV.delete(`pwdreset:${tokenHash}`);
  return jsonResp({ success: true });
}

async function listAdmins(env) {
  const list = await env.ST_KV.list({ prefix: 'user:' });
  const admins = [];
  for (const key of list.keys) {
    const u = await env.ST_KV.get(key.name, { type: 'json' });
    const m = u?.email ? await getOrgMembership(env, 'default', u.email) : null;
    if (m?.role === 'admin' && m?.status === 'approved') admins.push(u);
  }
  if (!admins.length && env.ADMIN_EMAIL) admins.push({ email: env.ADMIN_EMAIL });
  return admins;
}

async function safeUser(user, env) {
  const currentOrgId = user.orgId || 'default';
  const org = await env.ST_KV.get(`org:${currentOrgId}`, { type: 'json' });
  return {
    name: user.name, email: user.email, role: user.orgRole || user.role,
    photoUrl: user.photoUrl || null, leaderSince: user.leaderSince || null,
    funFact: user.funFact || null, expiresAt: user.expiresAt || null,
    status: user.orgStatus || user.status || null, mustChangePassword: !!user.mustChangePassword,
    isDemoMode: !!user.isDemoMode, orgId: currentOrgId,
    orgIds: user.orgIds || [currentOrgId],
    orgName: org?.name || null,
  };
}
