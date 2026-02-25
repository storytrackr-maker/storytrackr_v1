import { jsonResp, getSessionUser, sendEmail, generateToken, hashPassword, hashToken, hasPermission, validatePasswordStrength, checkRateLimit, getClientIp, orgMemberKey, orgSettingsKey } from './utils.js';
import { isValidEmail, normalizeEmail, parseJsonBody } from './validation.js';

const APP_URL = 'https://app.storytrackr.app';

const VALID_ROLES = new Set(['pending', 'approved', 'leader', 'admin']);

export async function handleAdmin(request, env, pathname, method) {
  if (pathname === '/api/admin/invite/redeem' && method === 'POST') return redeemInvite(request, env);

  const adminCheck = await requireAdmin(request, env);
  if (!adminCheck.ok) return adminCheck.response;

  if (pathname === '/api/admin/users'            && method === 'GET')    return listUsers(env, adminCheck.user);
  if (pathname === '/api/admin/update'           && method === 'POST')   return updateUser(request, env, adminCheck.user);
  if (pathname === '/api/admin/permissions'      && method === 'GET')    return getPermissions(env, adminCheck.user);
  if (pathname === '/api/admin/permissions'      && method === 'POST')   return savePermissions(request, env, adminCheck.user);
  if (pathname === '/api/admin/invite/manual'    && method === 'POST')   return inviteManual(request, env, adminCheck.user);
  if (pathname === '/api/admin/invite/qr'        && method === 'POST')   return createQrInvite(request, env, adminCheck.user);
  if (pathname === '/api/admin/ministry'         && method === 'DELETE') return deleteMinistry(request, env, adminCheck.user);
  if (pathname === '/api/admin/archive-graduates'&& method === 'POST')   return archiveGraduates(env, adminCheck.user);
  if (pathname === '/api/admin/analytics'        && method === 'GET')    return getAnalytics(env, adminCheck.user);
  return jsonResp({ error: 'Not found' }, 404);
}

async function requireAdmin(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return { ok: false, response: jsonResp({ error: 'Unauthorized' }, 403) };
  const ok = await hasPermission(env, user, 'adminland', 'admin');
  if (!ok) return { ok: false, response: jsonResp({ error: 'Unauthorized' }, 403) };
  return { ok: true, user };
}

async function listUsers(env, actingUser) {
  const prefix = `orgmember:${actingUser.orgId}:`;
  const list = await env.ST_KV.list({ prefix });
  const users = [];
  for (const key of list.keys) {
    const membership = await env.ST_KV.get(key.name, { type: 'json' });
    const email = key.name.slice(prefix.length);
    const u = await env.ST_KV.get(`user:${email}`, { type: 'json' });
    if (u && membership) users.push({
      name: u.name, email: u.email, role: membership.role, status: membership.status || null,
      createdAt: u.createdAt, leaderSince: u.leaderSince, orgId: actingUser.orgId,
    });
  }
  return jsonResp({ users });
}

async function updateUser(request, env, actingUser) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { email, role, status, notifyUser } = body;
  if (!email || !VALID_ROLES.has(role)) return jsonResp({ error: 'Invalid request' }, 400);
  if (email.toLowerCase() === actingUser.email.toLowerCase() && role !== 'admin') return jsonResp({ error: 'You cannot change your own admin status.' }, 403);

  const target = await env.ST_KV.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!target) return jsonResp({ error: 'User not found' }, 404);
  const targetKey = orgMemberKey(actingUser.orgId, email.toLowerCase());
  const existingMembership = await env.ST_KV.get(targetKey, { type: 'json' }) || {};
  const nextStatus = status || (role !== 'pending' ? 'approved' : (existingMembership.status || 'pending_approval'));
  await env.ST_KV.put(targetKey, JSON.stringify({
    ...existingMembership,
    role,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  }));

  if (notifyUser) {
    const approved = nextStatus === 'approved' || role !== 'pending';
    await sendEmail(env, {
      to: target.email,
      subject: approved ? 'Your StoryTrackr account has been approved' : 'StoryTrackr account update',
      html: approved
        ? `<p>Your account has been approved! <a href="${APP_URL}/login">Log in here</a>.</p>`
        : `<p>Your account request was not approved. Contact your ministry administrator for details.</p>`,
    });
  }

  await env.ST_KV.put(`audit:user-status:${Date.now()}:${target.email}`, JSON.stringify({
    actor: actingUser.email, email: target.email, role, status: nextStatus || null, orgId: actingUser.orgId, notifyUser: !!notifyUser, createdAt: new Date().toISOString(),
  }), { expirationTtl: 180 * 24 * 60 * 60 });

  return jsonResp({ success: true });
}

async function getPermissions(env, actingUser) {
  const settings = await env.ST_KV.get(orgSettingsKey(actingUser.orgId), { type: 'json' }) || {};
  return jsonResp({ permissions: settings.permissions || {} });
}

async function savePermissions(request, env, actingUser) {
  const { permissions } = await request.json();
  const settings = await env.ST_KV.get(orgSettingsKey(actingUser.orgId), { type: 'json' }) || {};
  settings.permissions = permissions || settings.permissions || {};
  await env.ST_KV.put(orgSettingsKey(actingUser.orgId), JSON.stringify(settings));
  return jsonResp({ success: true, permissions: settings.permissions });
}

async function createQrInvite(request, env, actor) {
  const body = (await parseJsonBody(request)) || {};
  const { role = 'leader', expiresHours = 48 } = body;
  if (!VALID_ROLES.has(role)) return jsonResp({ error: 'Invalid role' }, 400);
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:admin:invite:qr:${ip}`, 30, 60 * 60);
  if (!allowed) return jsonResp({ error: 'Too many invite requests. Please try again later.' }, 429);
  const raw       = generateToken();
  const tokenHash = await hashToken(raw);
  const ttl       = Math.max(24, Math.min(72, Number(expiresHours) || 48)) * 3600;
  await env.ST_KV.put(`invite:${tokenHash}`, JSON.stringify({ type: 'qr', role, status: 'active', orgId: actor.orgId || 'default', createdBy: actor.email, createdAt: Date.now() }), { expirationTtl: ttl });
  return jsonResp({ success: true, inviteLink: `${APP_URL}/signup?inviteToken=${raw}`, expiresHours: ttl / 3600 });
}

async function redeemInvite(request, env) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { token, name, email, password } = body;
  if (!token || !name || !password) return jsonResp({ error: 'Missing fields' }, 400);
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:admin:invite:redeem:${ip}`, 20, 60 * 60);
  if (!allowed) return jsonResp({ error: 'Too many redemption attempts. Please try again later.' }, 429);
  if (!validatePasswordStrength(password)) return jsonResp({ error: 'Weak password' }, 400);
  const tokenHash = await hashToken(token);
  const invite    = await env.ST_KV.get(`invite:${tokenHash}`, { type: 'json' });
  if (!invite || invite.status !== 'active') return jsonResp({ error: 'Invite invalid or expired' }, 400);
  invite.status = 'used'; invite.usedAt = Date.now();
  await env.ST_KV.put(`invite:${tokenHash}`, JSON.stringify(invite), { expirationTtl: 60 });

  if (email && !isValidEmail(email)) return jsonResp({ error: 'Invalid email' }, 400);
  const userEmail = email ? normalizeEmail(email) : `invited-${Date.now()}@placeholder.local`;
  if (await env.ST_KV.get(`user:${userEmail}`)) return jsonResp({ error: 'Account already exists' }, 409);
  const user = {
    email: userEmail, name, role: invite.role || 'leader', status: 'approved',
    mustChangePassword: false, passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await env.ST_KV.put(`user:${userEmail}`, JSON.stringify(user));
  await env.ST_KV.put(orgMemberKey(invite.orgId || 'default', userEmail), JSON.stringify({ role: invite.role || 'leader', status: 'pending_approval', joinedAt: new Date().toISOString() }));
  return jsonResp({ success: true, message: 'Account created. An admin will review and approve your access shortly.' });
}

async function deleteMinistry(request, env, actingUser) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { confirmName } = body;
  const orgId = actingUser.orgId || 'default';
  const org = await env.ST_KV.get(`org:${orgId}`, { type: 'json' });
  if (!org) return jsonResp({ error: 'Organization not found' }, 404);
  if (!confirmName || confirmName !== org.name) return jsonResp({ error: 'Ministry name does not match' }, 400);

  const prefixes = [
    `org:${orgId}`,
    `settings:org:${orgId}`,
    `orgmember:${orgId}:`,
    `roster:${orgId}:`,
    `student:${orgId}:`,
    `interactions:${orgId}:`,
    `activity:${orgId}:`,
    `invite:`,
  ];
  let deleted = 0;
  for (const prefix of prefixes) {
    const list = await env.ST_KV.list({ prefix });
    for (const key of list.keys) {
      await env.ST_KV.delete(key.name);
      deleted++;
    }
  }
  // Also delete the org key itself
  await env.ST_KV.delete(`org:${orgId}`);
  deleted++;
  return jsonResp({ success: true, deleted });
}

async function archiveGraduates(env, actingUser) {
  const orgId = actingUser.orgId || 'default';
  let archived = 0;
  for (const sk of ['hs', 'ms']) {
    for (const section of ['core', 'loose', 'fringe']) {
      const key = `roster:${orgId}:${sk}:${section}`;
      const list = (await env.ST_KV.get(key, { type: 'json' })) || [];
      let changed = false;
      for (const student of list) {
        if (Number(student.grade) === 12 && !student.archivedAt) {
          student.archivedAt = new Date().toISOString();
          await env.ST_KV.put(`student:${orgId}:${student.id}`, JSON.stringify(student));
          archived++;
          changed = true;
        }
      }
      if (changed) await env.ST_KV.put(key, JSON.stringify(list));
    }
  }
  return jsonResp({ success: true, archived });
}

async function getAnalytics(env, actingUser) {
  const orgId = actingUser.orgId || 'default';
  const prefix = `activity:${orgId}:`;
  const list = await env.ST_KV.list({ prefix });

  const leaderCounts = {};
  const studentCounts = {};
  const monthlyCounts = {};
  let total = 0;

  for (const key of list.keys) {
    const entry = await env.ST_KV.get(key.name, { type: 'json' });
    if (!entry) continue;
    const items = Array.isArray(entry) ? entry : [entry];
    for (const item of items) {
      total++;
      if (item.leader) leaderCounts[item.leader] = (leaderCounts[item.leader] || 0) + 1;
      if (item.studentName) studentCounts[item.studentName] = (studentCounts[item.studentName] || 0) + 1;
      const month = (item.date || item.createdAt || '').slice(0, 7);
      if (month) monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
    }
  }

  const topLeaders = Object.entries(leaderCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topStudents = Object.entries(studentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const monthly = Object.entries(monthlyCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count }));

  return jsonResp({ topLeaders, topStudents, monthly, total });
}

async function inviteManual(request, env, actor) {
  const body = await parseJsonBody(request);
  if (!body) return jsonResp({ error: 'Invalid JSON body' }, 400);
  const { name, email, role = 'leader' } = body;
  if (!name || !email) return jsonResp({ error: 'Name and email required' }, 400);
  if (!isValidEmail(email)) return jsonResp({ error: 'Invalid email' }, 400);
  if (!VALID_ROLES.has(role)) return jsonResp({ error: 'Invalid role' }, 400);
  const normalizedEmail = normalizeEmail(email);
  if (await env.ST_KV.get(`user:${normalizedEmail}`)) return jsonResp({ error: 'Account already exists' }, 409);
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:admin:invite:manual:${ip}`, 20, 60 * 60);
  if (!allowed) return jsonResp({ error: 'Too many invite requests. Please try again later.' }, 429);
  const raw       = generateToken();
  const tokenHash = await hashToken(raw);
  await env.ST_KV.put(`onboard:${tokenHash}`, JSON.stringify({ email: normalizedEmail, role, createdBy: actor.email, createdAt: Date.now() }), { expirationTtl: 72 * 3600 });

  const user = {
    email: normalizedEmail, name, role, status: 'approved', mustChangePassword: true,
    passwordHash: await hashPassword(generateToken().slice(0, 14)), createdAt: new Date().toISOString(),
  };
  await env.ST_KV.put(`user:${user.email}`, JSON.stringify(user));
  await env.ST_KV.put(orgMemberKey(actor.orgId || 'default', user.email), JSON.stringify({ role, status: 'pending_approval', joinedAt: new Date().toISOString() }));

  await sendEmail(env, {
    to: user.email,
    subject: `You've been invited to StoryTrackr`,
    html: `<p>Hi ${name},</p><p>You've been invited to join StoryTrackr. Set up your account here:</p><p><a href="${APP_URL}/signup?onboardToken=${raw}">Set Up Your Account</a></p>`,
  });
  return jsonResp({ success: true });
}
