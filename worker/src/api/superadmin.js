import { jsonResp } from './utils.js';

function requireOwner(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const secret = env.OWNER_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) return false;
  return true;
}

export async function handleOwner(request, env, pathname, method) {
  if (!requireOwner(request, env)) return jsonResp({ error: 'Unauthorized' }, 403);

  if (pathname === '/api/owner/ministries' && method === 'GET') return listMinistries(env);

  const deleteMatch = pathname.match(/^\/api\/owner\/ministry\/([^/]+)$/);
  if (deleteMatch && method === 'DELETE') return deleteMinistry(env, deleteMatch[1]);

  return jsonResp({ error: 'Not found' }, 404);
}

async function listMinistries(env) {
  const orgList = await env.ST_KV.list({ prefix: 'org:' });
  const ministries = [];

  for (const key of orgList.keys) {
    const org = await env.ST_KV.get(key.name, { type: 'json' });
    if (!org) continue;

    const orgId = org.id;
    let studentCount = 0;
    let leaderCount = 0;
    let activityCount = 0;

    // Count students
    for (const sk of ['hs', 'ms']) {
      for (const section of ['core', 'loose', 'fringe']) {
        const roster = (await env.ST_KV.get(`roster:${orgId}:${sk}:${section}`, { type: 'json' })) || [];
        studentCount += roster.length;
      }
    }

    // Count members
    const memberList = await env.ST_KV.list({ prefix: `orgmember:${orgId}:` });
    leaderCount = memberList.keys.length;

    // Count activity entries
    const activityList = await env.ST_KV.list({ prefix: `activity:${orgId}:` });
    activityCount = activityList.keys.length;

    ministries.push({
      id: orgId,
      name: org.name,
      createdAt: org.createdAt,
      ownerId: org.ownerId,
      studentCount,
      leaderCount,
      activityCount,
    });
  }

  return jsonResp({ ministries });
}

async function deleteMinistry(env, orgId) {
  if (!orgId || orgId === 'default') return jsonResp({ error: 'Cannot delete default org' }, 400);

  const org = await env.ST_KV.get(`org:${orgId}`, { type: 'json' });
  if (!org) return jsonResp({ error: 'Organization not found' }, 404);

  const prefixes = [
    `settings:org:${orgId}`,
    `orgmember:${orgId}:`,
    `roster:${orgId}:`,
    `student:${orgId}:`,
    `interactions:${orgId}:`,
    `activity:${orgId}:`,
  ];

  let deleted = 0;
  for (const prefix of prefixes) {
    const list = await env.ST_KV.list({ prefix });
    for (const key of list.keys) {
      await env.ST_KV.delete(key.name);
      deleted++;
    }
  }

  await env.ST_KV.delete(`org:${orgId}`);
  deleted++;

  return jsonResp({ success: true, deleted, orgId });
}
