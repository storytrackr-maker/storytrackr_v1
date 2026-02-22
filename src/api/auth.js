import {
  jsonResp, cookieStr, getSessionUser,
  hashPassword, verifyPassword, generateToken, sendEmail, trackMetric,
  validatePasswordStrength, hashToken,
} from './utils.js';

const SESSION_TTL = 30 * 24 * 60 * 60;
const RESET_TTL = 30 * 60;

export async function handleAuth(request, env, pathname, method) {
  if (pathname === '/api/auth/passcode' && method === 'POST') return passcodeLogin(request, env);
  if (pathname === '/api/auth/check-password' && method === 'POST') return checkPassword(request, env);
  if (pathname === '/api/auth/signup' && method === 'POST') return signup(request, env);
  if (pathname === '/api/auth/login' && method === 'POST') return login(request, env);
  if (pathname === '/api/auth/logout' && method === 'POST') return logout(request, env);
  if (pathname === '/api/auth/change-password' && method === 'POST') return changePassword(request, env);
  if (pathname === '/api/auth/forgot-password' && method === 'POST') return forgotPassword(request, env);
  if (pathname === '/api/auth/reset-password' && method === 'POST') return resetPassword(request, env);
  if (pathname === '/api/me' && method === 'GET') return me(request, env);
  if (pathname === '/api/profile/update' && method === 'POST') return profileUpdate(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function passcodeLogin(request, env) {
  let passcode = '';
  try { ({ passcode = '' } = await request.json()); } catch (_) {}
  let correct = '';
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
  if (settings?.access?.mode === 'shared-passcode' && settings.access.passcode) correct = settings.access.passcode;
  else correct = env.SITE_PASSWORD || '';
  if (!correct || !passcode) return jsonResp({ error: 'Invalid passcode' }, 401);

  const a = new TextEncoder().encode(passcode.padEnd(128));
  const b = new TextEncoder().encode(correct.padEnd(128));
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  if (d !== 0 || passcode.length !== correct.length) return jsonResp({ error: 'Invalid passcode' }, 401);

  const TTL = 8 * 60 * 60;
  const token = generateToken();
  const expiresAt = Date.now() + TTL * 1000;
  await env.ASM_KV.put(`session:${token}`, JSON.stringify({ type: 'passcode', expiresAt }), { expirationTtl: TTL });
  return new Response(JSON.stringify({ ok: true, expiresAt, message: 'View-only mode enabled' }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('asm_session', token, TTL) },
  });
}

async function checkPassword(request, env) {
  const { password } = await request.json();
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
  const correct = (settings?.access?.mode === 'shared-passcode' && settings.access.passcode) ? settings.access.passcode : (env.SITE_PASSWORD || '');
  const a = new TextEncoder().encode((password || '').padEnd(128));
  const b = new TextEncoder().encode(correct.padEnd(128));
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return jsonResp({ ok: d === 0 && (password || '').length === correct.length });
}

async function signup(request, env) {
  const { email, password, name } = await request.json();
  if (!email || !password || !name) return jsonResp({ error: 'All fields required' }, 400);
  if (!validatePasswordStrength(password)) return jsonResp({ error: 'Use 10+ chars with upper/lowercase and number' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonResp({ error: 'Invalid email' }, 400);
  if (await env.ASM_KV.get(`user:${email.toLowerCase()}`)) return jsonResp({ error: 'Account already exists' }, 409);

  const user = {
    email: email.toLowerCase(), name, passwordHash: await hashPassword(password),
    role: 'pending', status: 'pending_approval', createdAt: new Date().toISOString(),
  };
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));

  const admins = await listAdmins(env);
  await Promise.all(admins.map(a => sendEmail(env, {
    to: a.email,
    subject: 'New Account Request Pending Approval',
    html: `<p>Someone is requesting access. Approve or deny inside Adminland.</p><p><b>Name:</b> ${name}<br><b>Email:</b> ${email}<br><b>Timestamp:</b> ${new Date().toISOString()}</p>`,
  })));

  return jsonResp({ success: true, message: 'Account request submitted for approval.' });
}

async function login(request, env) {
  const { email, password } = await request.json();
  if (!email || !password) return jsonResp({ error: 'Invalid email or password' }, 401);
  const user = await env.ASM_KV.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!user || !await verifyPassword(password, user.passwordHash)) return jsonResp({ error: 'Invalid email or password' }, 401);
  if (user.status === 'denied') return jsonResp({ error: 'Your request was denied.' }, 403);
  if (user.role === 'pending' || user.status === 'pending_approval') return jsonResp({ error: 'Your account is pending approval.' }, 403);

  const token = generateToken();
  await env.ASM_KV.put(`session:${token}`, JSON.stringify({ email: user.email, expiresAt: Date.now() + SESSION_TTL * 1000 }), { expirationTtl: SESSION_TTL });
  await trackMetric(env, 'login');
  return new Response(JSON.stringify({ success: true, user: safeUser(user) }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('asm_session', token, SESSION_TTL) },
  });
}

async function logout(request, env) {
  const m = (request.headers.get('Cookie') || '').match(/asm_session=([a-f0-9]+)/);
  if (m) await env.ASM_KV.delete(`session:${m[1]}`);
  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookieStr('asm_session', '', 0) } });
}

async function me(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ user: null });
  await trackMetric(env, 'pageview');
  return jsonResp({ user: safeUser(user) });
}

async function profileUpdate(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !user.email) return jsonResp({ error: 'Not authenticated' }, 401);
  const updates = await request.json();
  ['name', 'leaderSince', 'funFact', 'photoUrl'].forEach(k => { if (updates[k] !== undefined) user[k] = updates[k]; });
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}

async function changePassword(request, env) {
  const user = await getSessionUser(env, request);
  if (!user || !user.email) return jsonResp({ error: 'Not authenticated' }, 401);
  const { oldPassword, newPassword, confirmPassword } = await request.json();
  if (!oldPassword || !newPassword || !confirmPassword) return jsonResp({ error: 'All fields required' }, 400);
  if (newPassword !== confirmPassword) return jsonResp({ error: 'New passwords do not match' }, 400);
  if (!validatePasswordStrength(newPassword)) return jsonResp({ error: 'Weak password' }, 400);
  if (!await verifyPassword(oldPassword, user.passwordHash)) return jsonResp({ error: 'Old password incorrect' }, 401);
  user.passwordHash = await hashPassword(newPassword);
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}

async function forgotPassword(request, env) {
  const { email } = await request.json();
  const generic = { success: true, message: 'If that account exists, a reset link has been sent.' };
  if (!email) return jsonResp(generic);
  const user = await env.ASM_KV.get(`user:${String(email).toLowerCase()}`, { type: 'json' });
  if (!user) return jsonResp(generic);
  const raw = generateToken();
  const tokenHash = await hashToken(raw);
  await env.ASM_KV.put(`pwdreset:${tokenHash}`, JSON.stringify({ email: user.email, createdAt: Date.now() }), { expirationTtl: RESET_TTL });
  const origin = new URL(request.url).origin;
  await sendEmail(env, {
    to: user.email,
    subject: 'Reset your ASM Roster password',
    html: `<p>Use this secure link to reset your password (expires in 30 minutes):</p><p><a href="${origin}/?resetToken=${raw}">Reset Password</a></p>`,
  });
  return jsonResp(generic);
}

async function resetPassword(request, env) {
  const { token, newPassword, confirmPassword } = await request.json();
  if (!token || !newPassword || newPassword !== confirmPassword) return jsonResp({ error: 'Invalid request' }, 400);
  if (!validatePasswordStrength(newPassword)) return jsonResp({ error: 'Weak password' }, 400);
  const tokenHash = await hashToken(token);
  const rec = await env.ASM_KV.get(`pwdreset:${tokenHash}`, { type: 'json' });
  if (!rec?.email) return jsonResp({ error: 'Invalid or expired token' }, 400);
  const user = await env.ASM_KV.get(`user:${rec.email}`, { type: 'json' });
  if (!user) return jsonResp({ error: 'Invalid token' }, 400);
  user.passwordHash = await hashPassword(newPassword);
  user.mustChangePassword = false;
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));
  await env.ASM_KV.delete(`pwdreset:${tokenHash}`);
  return jsonResp({ success: true });
}

async function listAdmins(env) {
  const list = await env.ASM_KV.list({ prefix: 'user:' });
  const admins = [];
  for (const key of list.keys) {
    const u = await env.ASM_KV.get(key.name, { type: 'json' });
    if (u?.role === 'admin') admins.push(u);
  }
  if (!admins.length && env.ADMIN_EMAIL) admins.push({ email: env.ADMIN_EMAIL });
  return admins;
}

function safeUser(user) {
  return {
    name: user.name, email: user.email, role: user.role,
    photoUrl: user.photoUrl || null, leaderSince: user.leaderSince || null,
    funFact: user.funFact || null, expiresAt: user.expiresAt || null,
    status: user.status || null, mustChangePassword: !!user.mustChangePassword,
  };
}
