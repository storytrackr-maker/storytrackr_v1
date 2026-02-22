import { jsonResp, getSessionUser, sendEmail, generateToken, hashPassword, hashToken, hasPermission } from './utils.js';

export async function handleAdmin(request, env, pathname, method) {
  if (pathname === '/api/admin/invite/redeem' && method === 'POST') return redeemInvite(request, env);

  const adminCheck = await requireAdmin(request, env);
  if (!adminCheck.ok) return adminCheck.response;

  if (pathname === '/api/admin/users' && method === 'GET') return listUsers(env);
  if (pathname === '/api/admin/update' && method === 'POST') return updateUser(request, env, adminCheck.user);
  if (pathname === '/api/admin/permissions' && method === 'GET') return getPermissions(env);
  if (pathname === '/api/admin/permissions' && method === 'POST') return savePermissions(request, env);
  if (pathname === '/api/admin/invite/manual' && method === 'POST') return inviteManual(request, env, adminCheck.user);
  if (pathname === '/api/admin/invite/qr' && method === 'POST') return createQrInvite(request, env, adminCheck.user);
  if (pathname === '/api/admin/invite/redeem' && method === 'POST') return redeemInvite(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function requireAdmin(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return { ok: false, response: jsonResp({ error: 'Unauthorized' }, 403) };
  const ok = await hasPermission(env, user, 'adminland', 'admin');
  if (!ok) return { ok: false, response: jsonResp({ error: 'Unauthorized' }, 403) };
  return { ok: true, user };
}

async function listUsers(env) {
  const list = await env.ASM_KV.list({ prefix: 'user:' });
  const users = [];
  for (const key of list.keys) {
    const u = await env.ASM_KV.get(key.name, { type: 'json' });
    if (u) users.push({ name: u.name, email: u.email, role: u.role, status: u.status || null, createdAt: u.createdAt, leaderSince: u.leaderSince });
  }
  return jsonResp({ users });
}

async function updateUser(request, env, actingUser) {
  const { email, role, status, notifyUser } = await request.json();
  if (!email || !['approved', 'pending', 'admin', 'leader'].includes(role)) return jsonResp({ error: 'Invalid request' }, 400);
  if (email.toLowerCase() === actingUser.email.toLowerCase() && role !== 'admin') return jsonResp({ error: 'You cannot change your own admin status.' }, 403);

  const target = await env.ASM_KV.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!target) return jsonResp({ error: 'User not found' }, 404);
  target.role = role;
  if (status) target.status = status;
  if (role !== 'pending' && target.status !== 'denied') target.status = 'approved';
  await env.ASM_KV.put(`user:${email.toLowerCase()}`, JSON.stringify(target));

  if (notifyUser) {
    const approved = target.status === 'approved' || role !== 'pending';
    await sendEmail(env, {
      to: target.email,
      subject: approved ? 'Account approved' : 'Account denied',
      html: approved
        ? '<p>Your account has been approved. You can now log in.</p>'
        : '<p>Your account request was not approved.</p>',
    });
  }

  await env.ASM_KV.put(`audit:user-status:${Date.now()}:${target.email}`, JSON.stringify({
    actor: actingUser.email, email: target.email, role, status: target.status || null, notifyUser: !!notifyUser, createdAt: new Date().toISOString(),
  }), { expirationTtl: 180 * 24 * 60 * 60 });

  return jsonResp({ success: true });
}

async function getPermissions(env) {
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' }) || {};
  return jsonResp({ permissions: settings.permissions || {} });
}

async function savePermissions(request, env) {
  const { permissions } = await request.json();
  const settings = await env.ASM_KV.get('settings:org', { type: 'json' }) || {};
  settings.permissions = permissions || settings.permissions || {};
  await env.ASM_KV.put('settings:org', JSON.stringify(settings));
  return jsonResp({ success: true, permissions: settings.permissions });
}

async function createQrInvite(request, env, actor) {
  const { role = 'leader', expiresHours = 48 } = await request.json().catch(() => ({}));
  const raw = generateToken();
  const tokenHash = await hashToken(raw);
  const ttl = Math.max(24, Math.min(72, Number(expiresHours) || 48)) * 3600;
  await env.ASM_KV.put(`invite:${tokenHash}`, JSON.stringify({ type: 'qr', role, status: 'active', createdBy: actor.email, createdAt: Date.now() }), { expirationTtl: ttl });
  return jsonResp({ success: true, inviteLink: `${new URL(request.url).origin}/?inviteToken=${raw}`, expiresHours: ttl / 3600 });
}

async function redeemInvite(request, env) {
  const { token, name, password } = await request.json();
  if (!token || !name || !password) return jsonResp({ error: 'Missing fields' }, 400);
  const tokenHash = await hashToken(token);
  const invite = await env.ASM_KV.get(`invite:${tokenHash}`, { type: 'json' });
  if (!invite || invite.status !== 'active') return jsonResp({ error: 'Invite invalid or expired' }, 400);
  invite.status = 'used';
  invite.usedAt = Date.now();
  await env.ASM_KV.put(`invite:${tokenHash}`, JSON.stringify(invite), { expirationTtl: 60 });

  const email = `invited-${Date.now()}@placeholder.local`;
  const user = { email, name, role: invite.role || 'leader', status: 'approved', mustChangePassword: false, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
  await env.ASM_KV.put(`user:${email}`, JSON.stringify(user));
  return jsonResp({ success: true });
}

async function inviteManual(request, env, actor) {
  const { name, email, role = 'leader' } = await request.json();
  if (!name || !email) return jsonResp({ error: 'Name and email required' }, 400);
  const raw = generateToken();
  const tokenHash = await hashToken(raw);
  await env.ASM_KV.put(`onboard:${tokenHash}`, JSON.stringify({ email: email.toLowerCase(), role, createdBy: actor.email, createdAt: Date.now() }), { expirationTtl: 72 * 3600 });

  const user = {
    email: email.toLowerCase(), name, role, status: 'approved', mustChangePassword: true,
    passwordHash: await hashPassword(generateToken().slice(0, 14)), createdAt: new Date().toISOString(),
  };
  await env.ASM_KV.put(`user:${user.email}`, JSON.stringify(user));

  await sendEmail(env, {
    to: user.email,
    subject: 'Welcome! Set Up Your Account',
    html: `<p>Welcome! Use this secure onboarding link to set your password:</p><p><a href="${new URL(request.url).origin}/?onboardToken=${raw}">Set Up Your Account</a></p>`,
  });
  return jsonResp({ success: true });
}
