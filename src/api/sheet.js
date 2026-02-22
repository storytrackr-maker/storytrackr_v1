import { jsonResp, getSessionUser, requirePermission } from './utils.js';

export async function handleSheet(request, env, pathname, method) {
  if (pathname === '/api/sheet/read' && method === 'GET') return sheetRead(request, env);
  if (pathname === '/api/sheet/write' && method === 'GET') return sheetWrite(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function sheetRead(request, env) {
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'GOOGLE_SCRIPT_URL not set' }, 500);
  try {
    const secret = env.GAS_SHARED_SECRET ? `&_s=${encodeURIComponent(env.GAS_SHARED_SECRET)}` : '';
    const res = await fetch(env.GOOGLE_SCRIPT_URL + '?action=read' + secret);
    const text = await res.text();
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return jsonResp({ error: 'Could not reach Google Sheet' }, 502);
  }
}

async function sheetWrite(request, env) {
  const perm = await requirePermission(env, request, 'roster', 'edit');
  if (!perm.ok) return perm.response;
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'GOOGLE_SCRIPT_URL not set' }, 500);
  try {
    const params = new URL(request.url).searchParams;
    if (env.GAS_SHARED_SECRET) params.set('_s', env.GAS_SHARED_SECRET);
    const res = await fetch(env.GOOGLE_SCRIPT_URL + '?' + params.toString());
    const text = await res.text();
    return new Response(text, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return jsonResp({ error: 'Could not reach Google Sheet' }, 502);
  }
}
