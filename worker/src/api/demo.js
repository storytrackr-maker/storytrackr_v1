/**
 * Demo Session API
 *
 * POST /api/demo-session         — create one-time token (called from marketing site, CORS-open)
 * POST /api/demo-session/redeem  — exchange token for httpOnly session cookie (called from app)
 */
import { jsonResp, cookieStr, generateToken, hashToken } from './utils.js';

const DEMO_TOKEN_TTL  = 5 * 60;       // 5 minutes to redeem the one-time token
const DEMO_SESSION_TTL = 60 * 60;     // 60-minute demo session
const RATE_LIMIT_MAX  = 10;           // max demo sessions per IP per window
const RATE_LIMIT_WINDOW = 60 * 60;    // 1-hour window

export async function handleDemo(request, env, pathname, method) {
  if (pathname === '/api/demo-session' && method === 'POST') return createDemoSession(request, env);
  if (pathname === '/api/demo-session/redeem' && method === 'POST') return redeemDemoToken(request, env);
  return jsonResp({ error: 'Not found' }, 404);
}

async function createDemoSession(request, env) {
  // Rate limit by IP
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const rlKey = `demorl:${ip}`;
  const rl = (await env.ST_KV.get(rlKey, { type: 'json' })) || { count: 0, start: Date.now() };

  if (rl.count >= RATE_LIMIT_MAX) {
    return jsonResp({ error: 'Too many demo requests. Try again later.' }, 429);
  }
  rl.count++;
  await env.ST_KV.put(rlKey, JSON.stringify(rl), { expirationTtl: RATE_LIMIT_WINDOW });

  // Create one-time token
  const raw = generateToken();
  const tokenHash = await hashToken(raw);
  await env.ST_KV.put(
    `demotok:${tokenHash}`,
    JSON.stringify({ createdAt: Date.now(), used: false }),
    { expirationTtl: DEMO_TOKEN_TTL }
  );

  const redirect = `https://app.storytrackr.app/demo?token=${raw}`;
  return jsonResp({ ok: true, token: raw, redirect });
}

async function redeemDemoToken(request, env) {
  let token = '';
  try { ({ token } = await request.json()); } catch (_) {}
  if (!token) return jsonResp({ error: 'Token required' }, 400);

  const tokenHash = await hashToken(token);
  const tok = await env.ST_KV.get(`demotok:${tokenHash}`, { type: 'json' });

  if (!tok || tok.used) return jsonResp({ error: 'Demo token invalid or already used' }, 400);

  // Mark used immediately (prevent replay)
  await env.ST_KV.put(`demotok:${tokenHash}`, JSON.stringify({ ...tok, used: true }), { expirationTtl: 60 });

  // Create demo session
  const sessionToken = generateToken();
  const expiresAt = Date.now() + DEMO_SESSION_TTL * 1000;
  await env.ST_KV.put(
    `session:${sessionToken}`,
    JSON.stringify({ type: 'demo', orgId: env.DEMO_TENANT_ID || 'demo', expiresAt }),
    { expirationTtl: DEMO_SESSION_TTL }
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieStr('st_session', sessionToken, DEMO_SESSION_TTL),
    },
  });
}
