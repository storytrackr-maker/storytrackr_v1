/**
 * Students API — KV-backed roster (replaces Google Sheets integration)
 *
 * GET    /api/students               list all students for current org (optional ?sk=hs&section=core)
 * GET    /api/students/:id           single student
 * POST   /api/students               create student
 * PUT    /api/students/:id           update student
 * DELETE /api/students/:id           delete student
 *
 * Legacy interaction-key compat: students carry a stable numeric `index` per section
 * so existing /api/student/interactions?sk=&section=&index= keys still work.
 */
import { jsonResp, requirePermission, getSessionUser } from './utils.js';

function uuid() {
  // RFC-4122 v4 using crypto.getRandomValues
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export async function handleStudents(request, env, pathname, method) {
  // Legacy interactions path — delegate to interactions handler
  if (pathname.startsWith('/api/student/interactions')) return null; // handled by interactions.js

  if (pathname === '/api/students' && method === 'GET')    return listStudents(request, env);
  if (pathname === '/api/students' && method === 'POST')   return createStudent(request, env);

  // /api/students/:id
  const idMatch = pathname.match(/^\/api\/students\/([^/]+)$/);
  if (idMatch) {
    const id = idMatch[1];
    if (method === 'GET')    return getStudent(request, env, id);
    if (method === 'PUT')    return updateStudent(request, env, id);
    if (method === 'DELETE') return deleteStudent(request, env, id);
  }

  return jsonResp({ error: 'Not found' }, 404);
}

function orgId(user) {
  return user.orgId || 'default';
}

// KV key helpers
const rosterKey  = (org, sk, section) => `roster:${org}:${sk}:${section}`;
const studentKey = (org, id) => `student:${org}:${id}`;

async function listStudents(request, env) {
  const perm = await requirePermission(env, request, 'roster', 'view');
  if (!perm.ok) return perm.response;

  const url = new URL(request.url);
  const sk      = url.searchParams.get('sk');
  const section = url.searchParams.get('section');
  const org     = orgId(perm.user);

  if (sk && section) {
    const data = (await env.ST_KV.get(rosterKey(org, sk, section), { type: 'json' })) || [];
    return jsonResp({ students: data });
  }

  // Return all students grouped by sk/section
  const result = { hs: { core: [], loose: [], fringe: [] }, ms: { core: [], loose: [], fringe: [] } };
  for (const s of ['hs', 'ms']) {
    for (const sec of ['core', 'loose', 'fringe']) {
      result[s][sec] = (await env.ST_KV.get(rosterKey(org, s, sec), { type: 'json' })) || [];
    }
  }
  return jsonResp({ roster: result });
}

async function getStudent(request, env, id) {
  const perm = await requirePermission(env, request, 'roster', 'view');
  if (!perm.ok) return perm.response;
  const student = await env.ST_KV.get(studentKey(orgId(perm.user), id), { type: 'json' });
  if (!student) return jsonResp({ error: 'Not found' }, 404);
  return jsonResp({ student });
}

async function createStudent(request, env) {
  const perm = await requirePermission(env, request, 'roster', 'edit');
  if (!perm.ok) return perm.response;

  const body = await request.json();
  const { name, sk = 'hs', section = 'core', grade, school, birthday, group, primaryGoal, photoUrl } = body;
  if (!name) return jsonResp({ error: 'Name required' }, 400);

  const org   = orgId(perm.user);
  const id    = uuid();

  // Assign a stable index for interaction-key compatibility
  const list  = (await env.ST_KV.get(rosterKey(org, sk, section), { type: 'json' })) || [];
  const index = list.length;

  const student = {
    id, orgId: org, sk, section, index,
    name, grade: grade || null, school: school || '',
    birthday: birthday || '', group: group || '', primaryGoal: primaryGoal || '',
    goals: [], photoUrl: photoUrl || null,
    familyContacted: false, connectedThisQuarter: false, lastInteractionDate: null,
    lastInteractionSummary: '', lastLeader: '', interactionCount: 0,
    archivedAt: null, createdAt: new Date().toISOString(),
  };

  list.push(student);
  await env.ST_KV.put(rosterKey(org, sk, section), JSON.stringify(list));
  await env.ST_KV.put(studentKey(org, id), JSON.stringify(student));

  return jsonResp({ success: true, student }, 201);
}

async function updateStudent(request, env, id) {
  const perm = await requirePermission(env, request, 'roster', 'edit');
  if (!perm.ok) return perm.response;

  const org  = orgId(perm.user);
  const existing = await env.ST_KV.get(studentKey(org, id), { type: 'json' });
  if (!existing) return jsonResp({ error: 'Not found' }, 404);

  const updates = await request.json();
  // Guard against tenant reassignment
  delete updates.id; delete updates.orgId; delete updates.sk; delete updates.section; delete updates.index;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };

  // Update individual record
  await env.ST_KV.put(studentKey(org, id), JSON.stringify(updated));

  // Update roster list in-place
  const list = (await env.ST_KV.get(rosterKey(org, existing.sk, existing.section), { type: 'json' })) || [];
  const idx  = list.findIndex(s => s.id === id);
  if (idx !== -1) list[idx] = updated;
  await env.ST_KV.put(rosterKey(org, existing.sk, existing.section), JSON.stringify(list));

  return jsonResp({ success: true, student: updated });
}

async function deleteStudent(request, env, id) {
  const perm = await requirePermission(env, request, 'roster', 'edit');
  if (!perm.ok) return perm.response;

  const org = orgId(perm.user);
  const existing = await env.ST_KV.get(studentKey(org, id), { type: 'json' });
  if (!existing) return jsonResp({ error: 'Not found' }, 404);

  await env.ST_KV.delete(studentKey(org, id));

  const list    = (await env.ST_KV.get(rosterKey(org, existing.sk, existing.section), { type: 'json' })) || [];
  const filtered = list.filter(s => s.id !== id);
  // Re-index for interaction-key compat
  filtered.forEach((s, i) => { s.index = i; });
  await env.ST_KV.put(rosterKey(org, existing.sk, existing.section), JSON.stringify(filtered));

  return jsonResp({ success: true });
}
