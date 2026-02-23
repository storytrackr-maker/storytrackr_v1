import { jsonResp, getSessionUser, requirePermission } from './utils.js';

export async function handleActivity(request, env, pathname, method) {
  if (pathname === '/api/activity/recent' && method === 'GET') return recentActivity(request, env);
  if (pathname === '/api/activity/stats'  && method === 'GET') return activityStats(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function recentActivity(request, env) {
  const list = await env.ASM_KV.list({ prefix: 'activity:' });
  const items = [];
  // Get the 50 most recent keys (KV lists alphabetically; timestamp keys sort correctly)
  const keys = list.keys.slice(-50).reverse();
  for (const key of keys) {
    const item = await env.ASM_KV.get(key.name, { type: 'json' });
    if (item) items.push(item);
  }
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return jsonResp({ items: items.slice(0, 30) });
}

async function activityStats(request, env) {
  const perm = await requirePermission(env, request, 'activity', 'view');
  if (!perm.ok) return perm.response;

  const list = await env.ASM_KV.list({ prefix: 'activity:' });
  const leaderCounts = {};
  const studentCounts = {};
  const now = new Date();
  let thisMonth = 0;

  for (const key of list.keys) {
    const item = await env.ASM_KV.get(key.name, { type: 'json' });
    if (!item) continue;
    leaderCounts[item.leader] = (leaderCounts[item.leader] || 0) + 1;
    if (item.studentName) studentCounts[item.studentName] = (studentCounts[item.studentName] || 0) + 1;
    const d = new Date(item.createdAt);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) thisMonth++;
  }

  const topLeaders = Object.entries(leaderCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  const topStudents = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));

  return jsonResp({
    totalInteractions: list.keys.length,
    uniqueLeaders: Object.keys(leaderCounts).length,
    uniqueStudents: Object.keys(studentCounts).length,
    thisMonth,
    topLeaders,
    topStudents,
  });
}
