import { jsonResp, getSessionUser, requirePermission } from './utils.js';

export async function handleInteractions(request, env, pathname, method) {
  if (pathname === '/api/student/interactions' && method === 'GET')    return getInteractions(request, env);
  if (pathname === '/api/student/interactions' && method === 'POST')   return postInteraction(request, env);
  if (pathname === '/api/student/interactions' && method === 'PUT')    return updateInteraction(request, env);
  if (pathname === '/api/student/interactions' && method === 'DELETE') return deleteInteraction(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function getInteractions(request, env) {
  const url = new URL(request.url);
  const sk      = url.searchParams.get('sk');
  const section = url.searchParams.get('section');
  const index   = url.searchParams.get('index');
  const key = `interactions:${sk}:${section}:${index}`;
  const data = await env.ASM_KV.get(key, { type: 'json' });
  return jsonResp({ interactions: data || [] });
}

async function postInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;
  const user = perm.user;

  const body = await request.json();
  const { sk, section, index, interaction, rowIndex, studentName } = body;

  // 1. Store interaction list in KV keyed by student
  const kvKey = `interactions:${sk}:${section}:${index}`;
  const existing = (await env.ASM_KV.get(kvKey, { type: 'json' })) || [];
  existing.push(interaction);
  await env.ASM_KV.put(kvKey, JSON.stringify(existing));

  // 2. Store in global activity feed (keyed by timestamp for ordering)
  const actKey = `activity:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
  await env.ASM_KV.put(
    actKey,
    JSON.stringify({ ...interaction, studentName: studentName || '', sk, section, index, rowIndex }),
    { expirationTtl: 90 * 24 * 60 * 60 } // 90 days
  );

  // 3. Sync to Google Sheet (fire and forget)
  if (env.GOOGLE_SCRIPT_URL && rowIndex !== undefined) {
    try {
      const params = new URLSearchParams({
        action: 'addInteraction',
        payload: JSON.stringify({ sheet: sk, rowIndex, interaction }),
      });
      env.ASM_KV && fetch(env.GOOGLE_SCRIPT_URL + '?' + params).catch(() => {});
    } catch (e) {}
  }

  return jsonResp({ success: true });
}

async function updateInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;
  const user = perm.user;

  const body = await request.json();
  const { sk, section, index, interactionId, changes, rowIndex } = body;

  const kvKey = `interactions:${sk}:${section}:${index}`;
  const existing = (await env.ASM_KV.get(kvKey, { type: 'json' })) || [];

  const noteIndex = existing.findIndex(n => n.id === interactionId);
  if (noteIndex === -1) return jsonResp({ error: 'Note not found' }, 404);

  const note = existing[noteIndex];

  // Only the original author or an admin may edit
  if (user.role !== 'admin' && note.leaderEmail !== user.email) {
    return jsonResp({ error: 'Forbidden' }, 403);
  }

  existing[noteIndex] = { ...note, ...changes, updatedAt: new Date().toISOString() };
  await env.ASM_KV.put(kvKey, JSON.stringify(existing));

  // Sync update to Google Sheet (fire and forget)
  if (env.GOOGLE_SCRIPT_URL && rowIndex !== undefined) {
    try {
      const params = new URLSearchParams({
        action: 'updateInteraction',
        payload: JSON.stringify({ sheet: sk, rowIndex, interactionId, changes }),
      });
      fetch(env.GOOGLE_SCRIPT_URL + '?' + params).catch(() => {});
    } catch (_) {}
  }

  return jsonResp({ success: true });
}

async function deleteInteraction(request, env) {
  const perm = await requirePermission(env, request, 'hangoutNotes', 'edit');
  if (!perm.ok) return perm.response;
  const user = perm.user;

  const body = await request.json();
  const { sk, section, index, interactionId, rowIndex } = body;

  const kvKey = `interactions:${sk}:${section}:${index}`;
  const existing = (await env.ASM_KV.get(kvKey, { type: 'json' })) || [];

  const note = existing.find(n => n.id === interactionId);
  if (!note) return jsonResp({ error: 'Note not found' }, 404);

  // Only the original author or an admin may delete
  if (user.role !== 'admin' && note.leaderEmail !== user.email) {
    return jsonResp({ error: 'Forbidden' }, 403);
  }

  const updated = existing.filter(n => n.id !== interactionId);
  await env.ASM_KV.put(kvKey, JSON.stringify(updated));

  // Sync deletion to Google Sheet (fire and forget)
  if (env.GOOGLE_SCRIPT_URL && rowIndex !== undefined) {
    try {
      const params = new URLSearchParams({
        action: 'deleteInteraction',
        payload: JSON.stringify({ sheet: sk, rowIndex, interactionId }),
      });
      fetch(env.GOOGLE_SCRIPT_URL + '?' + params).catch(() => {});
    } catch (_) {}
  }

  return jsonResp({ success: true });
}
