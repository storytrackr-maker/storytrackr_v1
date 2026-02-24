/**
 * Interactions API — stores hangout notes in KV (Google Sheets sync removed)
 */
import { jsonResp, requirePermission, withPermission } from './utils.js';

export async function handleInteractions(request, env, pathname, method) {
  if (pathname === '/api/student/interactions' && method === 'GET')    return getInteractions(request, env);
  if (pathname === '/api/student/interactions' && method === 'POST')   return postInteraction(request, env);
  if (pathname === '/api/student/interactions' && method === 'PUT')    return updateInteraction(request, env);
  if (pathname === '/api/student/interactions' && method === 'DELETE') return deleteInteraction(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function getInteractions(request, env) {
  return withPermission(env, request, 'hangoutNotes', 'view', async (user) => {
    const url = new URL(request.url);
    const sk = url.searchParams.get('sk');
    const section = url.searchParams.get('section');
    const index = url.searchParams.get('index');

    if (!sk || !section || index === null) {
      return jsonResp({ error: 'Missing sk, section, or index query parameter' }, 400);
    }

    const org = user.orgId || 'default';
    const key = `interactions:${org}:${sk}:${section}:${index}`;
    const data = await env.ST_KV.get(key, { type: 'json' });
    return jsonResp({ interactions: data || [] });
  });
}

async function postInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;

  const body = await request.json();
  const { sk, section, index, interaction, studentName } = body;

  const org = perm.user.orgId || 'default';
  // Store interaction list keyed by student, scoped to org
  const kvKey   = `interactions:${org}:${sk}:${section}:${index}`;
  const existing = (await env.ST_KV.get(kvKey, { type: 'json' })) || [];
  existing.push(interaction);
  await env.ST_KV.put(kvKey, JSON.stringify(existing));

  // Global activity feed entry (90-day TTL), scoped to org
  const actKey = `activity:${org}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  await env.ST_KV.put(
    actKey,
    JSON.stringify({ ...interaction, studentName: studentName || '', sk, section, index }),
    { expirationTtl: 90 * 24 * 60 * 60 }
  );

  // Update student summary on the roster record
  await updateStudentSummary(env, perm.user, sk, section, index, interaction);

  return jsonResp({ success: true });
}

async function updateInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;
  const user = perm.user;

  const { sk, section, index, interactionId, changes } = await request.json();
  const org = user.orgId || 'default';
  const kvKey   = `interactions:${org}:${sk}:${section}:${index}`;
  const existing = (await env.ST_KV.get(kvKey, { type: 'json' })) || [];
  const noteIndex = existing.findIndex(n => n.id === interactionId);
  if (noteIndex === -1) return jsonResp({ error: 'Note not found' }, 404);

  const note = existing[noteIndex];
  if (user.role !== 'admin' && note.leaderEmail !== user.email) {
    return jsonResp({ error: 'Forbidden' }, 403);
  }

  existing[noteIndex] = { ...note, ...changes, updatedAt: new Date().toISOString() };
  await env.ST_KV.put(kvKey, JSON.stringify(existing));
  return jsonResp({ success: true });
}

async function deleteInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;
  const user = perm.user;

  const { sk, section, index, interactionId } = await request.json();
  const org = user.orgId || 'default';
  const kvKey   = `interactions:${org}:${sk}:${section}:${index}`;
  const existing = (await env.ST_KV.get(kvKey, { type: 'json' })) || [];
  const note    = existing.find(n => n.id === interactionId);
  if (!note) return jsonResp({ error: 'Note not found' }, 404);
  if (user.role !== 'admin' && note.leaderEmail !== user.email) {
    return jsonResp({ error: 'Forbidden' }, 403);
  }

  const updated = existing.filter(n => n.id !== interactionId);
  await env.ST_KV.put(kvKey, JSON.stringify(updated));
  return jsonResp({ success: true });
}

// Update lastInteraction summary on the roster entry
async function updateStudentSummary(env, user, sk, section, index, interaction) {
  try {
    const org     = user.orgId || 'default';
    const listKey = `roster:${org}:${sk}:${section}`;
    const list    = await env.ST_KV.get(listKey, { type: 'json' });
    if (!list || !list[index]) return;
    list[index].lastInteractionDate    = interaction.date || new Date().toISOString().slice(0, 10);
    list[index].lastInteractionSummary = (interaction.summary || '').slice(0, 200);
    list[index].lastLeader             = interaction.leader || '';
    list[index].interactionCount       = (list[index].interactionCount || 0) + 1;
    list[index].connectedThisQuarter   = true;
    await env.ST_KV.put(listKey, JSON.stringify(list));
    // Also update individual record
    if (list[index].id) {
      const sKey = `student:${org}:${list[index].id}`;
      const s    = await env.ST_KV.get(sKey, { type: 'json' });
      if (s) await env.ST_KV.put(sKey, JSON.stringify({ ...s, ...list[index] }));
    }
  } catch (_) {}
}
