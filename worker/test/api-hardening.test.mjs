import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyPassword, hashPassword, checkRateLimit, hasPermission } from '../src/api/utils.js';
import { handleActivity } from '../src/api/activity.js';
import { handleInteractions } from '../src/api/interactions.js';
import { handleSettings } from '../src/api/settings.js';
import { handleStudents } from '../src/api/students.js';
import { handleDemo } from '../src/api/demo.js';
import { generateToken } from '../src/api/utils.js';

function makeEnv(seed = {}, extras = {}) {
  const kv = new Map(Object.entries(seed));
  return {
    ...extras,
    ST_KV: {
      async get(key, opts) {
        const v = kv.get(key);
        if (v === undefined) return null;
        if (opts?.type === 'json') return JSON.parse(v);
        return v;
      },
      async put(key, value) { kv.set(key, value); },
      async delete(key) { kv.delete(key); },
      async list({ prefix = '' } = {}) {
        return { keys: [...kv.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) };
      },
    },
  };
}

test('verifyPassword safely handles malformed hashes', async () => {
  assert.equal(await verifyPassword('Password123', null), false);
  assert.equal(await verifyPassword('Password123', 'not-a-hash'), false);
  assert.equal(await verifyPassword('Password123', 'xyz:abc'), false);

  const stored = await hashPassword('Password123');
  assert.equal(await verifyPassword('Password123', stored), true);
  assert.equal(await verifyPassword('WrongPass123', stored), false);
});

test('recent activity requires authentication', async () => {
  const env = makeEnv();
  const req = new Request('https://app.storytrackr.app/api/activity/recent');
  const res = await handleActivity(req, env, '/api/activity/recent', 'GET');
  assert.equal(res.status, 401);
});

test('get interactions requires at least view permission', async () => {
  const env = makeEnv();
  const req = new Request('https://app.storytrackr.app/api/student/interactions?sk=hs&section=core&index=0');
  const res = await handleInteractions(req, env, '/api/student/interactions', 'GET');
  assert.equal(res.status, 401);
});

test('settings non-public routes preserve auth status from permission check', async () => {
  const env = makeEnv();
  const req = new Request('https://app.storytrackr.app/api/settings');
  const res = await handleSettings(req, env, '/api/settings', 'GET');
  assert.equal(res.status, 401);
});


test('rate limiter enforces limit within window', async () => {
  const env = makeEnv();
  assert.equal(await checkRateLimit(env, 'rl:test', 2, 60), true);
  assert.equal(await checkRateLimit(env, 'rl:test', 2, 60), true);
  assert.equal(await checkRateLimit(env, 'rl:test', 2, 60), false);
});


test('permissions are derived from org-scoped membership role', async () => {
  const env = makeEnv({
    'settings:org:orgA': JSON.stringify({ permissions: { modules: { adminland: { leader: 'none' } } } }),
  });
  const user = { role: 'user', orgRole: 'leader', orgStatus: 'approved', orgId: 'orgA' };
  assert.equal(await hasPermission(env, user, 'roster', 'edit'), true);
  assert.equal(await hasPermission(env, user, 'adminland', 'admin'), false);
});

test('settings are saved and read per orgId from session context', async () => {
  const env = makeEnv();
  const sessionToken = generateToken();
  await env.ST_KV.put(`session:${sessionToken}`, JSON.stringify({ email: 'admin@example.com', orgId: 'orgA', expiresAt: Date.now() + 60000 }));
  await env.ST_KV.put('user:admin@example.com', JSON.stringify({ email: 'admin@example.com', name: 'A', role: 'user' }));
  await env.ST_KV.put('orgmember:orgA:admin@example.com', JSON.stringify({ role: 'admin', status: 'approved' }));

  const saveReq = new Request('https://app.storytrackr.app/api/settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': `st_session=${sessionToken}` },
    body: JSON.stringify({ ministryName: 'Org A Name' }),
  });
  const saveRes = await handleSettings(saveReq, env, '/api/settings', 'POST');
  assert.equal(saveRes.status, 200);

  const storedA = await env.ST_KV.get('settings:org:orgA', { type: 'json' });
  const storedDefault = await env.ST_KV.get('settings:org:default', { type: 'json' });
  assert.equal(storedA.ministryName, 'Org A Name');
  assert.equal(storedDefault, null);
});

// ── Tenant Isolation Tests ────────────────────────────────────

test('interactions are scoped per org — Org A cannot see Org B data', async () => {
  const env = makeEnv();
  const tokenA = generateToken();
  const tokenB = generateToken();

  // Set up Org A session
  await env.ST_KV.put(`session:${tokenA}`, JSON.stringify({ email: 'a@a.com', orgId: 'orgA', expiresAt: Date.now() + 60000 }));
  await env.ST_KV.put('user:a@a.com', JSON.stringify({ email: 'a@a.com', name: 'A', role: 'user' }));
  await env.ST_KV.put('orgmember:orgA:a@a.com', JSON.stringify({ role: 'admin', status: 'approved' }));

  // Set up Org B session
  await env.ST_KV.put(`session:${tokenB}`, JSON.stringify({ email: 'b@b.com', orgId: 'orgB', expiresAt: Date.now() + 60000 }));
  await env.ST_KV.put('user:b@b.com', JSON.stringify({ email: 'b@b.com', name: 'B', role: 'user' }));
  await env.ST_KV.put('orgmember:orgB:b@b.com', JSON.stringify({ role: 'admin', status: 'approved' }));

  // Org A posts an interaction at hs/core/0
  const postReq = new Request('https://app.storytrackr.app/api/student/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': `st_session=${tokenA}` },
    body: JSON.stringify({ sk: 'hs', section: 'core', index: 0, interaction: { id: 'ix1', summary: 'OrgA secret note', leader: 'A', date: '2026-01-01', tags: [], createdAt: new Date().toISOString() }, studentName: 'Alice' }),
  });
  const postRes = await handleInteractions(postReq, env, '/api/student/interactions', 'POST');
  assert.equal(postRes.status, 200);

  // Verify interaction stored under orgA prefix
  const storedA = await env.ST_KV.get('interactions:orgA:hs:core:0', { type: 'json' });
  assert.ok(storedA && storedA.length === 1, 'Org A interaction should be stored under orgA key');
  assert.equal(storedA[0].summary, 'OrgA secret note');

  // Verify orgB key is empty (not contaminated)
  const storedB = await env.ST_KV.get('interactions:orgB:hs:core:0', { type: 'json' });
  assert.equal(storedB, null, 'Org B key must be empty');

  // Org B reads same sk/section/index — must get empty list, not Org A's data
  const getReq = new Request('https://app.storytrackr.app/api/student/interactions?sk=hs&section=core&index=0', {
    headers: { cookie: `st_session=${tokenB}` },
  });
  const getRes = await handleInteractions(getReq, env, '/api/student/interactions', 'GET');
  assert.equal(getRes.status, 200);
  const body = await getRes.json();
  assert.equal(body.interactions.length, 0, 'Org B must not see Org A interactions');
});

test('activity feed is scoped per org — Org A cannot see Org B activity', async () => {
  const env = makeEnv();
  const tokenA = generateToken();
  const tokenB = generateToken();

  await env.ST_KV.put(`session:${tokenA}`, JSON.stringify({ email: 'a2@a.com', orgId: 'orgA', expiresAt: Date.now() + 60000 }));
  await env.ST_KV.put('user:a2@a.com', JSON.stringify({ email: 'a2@a.com', name: 'A2', role: 'user' }));
  await env.ST_KV.put('orgmember:orgA:a2@a.com', JSON.stringify({ role: 'admin', status: 'approved' }));

  await env.ST_KV.put(`session:${tokenB}`, JSON.stringify({ email: 'b2@b.com', orgId: 'orgB', expiresAt: Date.now() + 60000 }));
  await env.ST_KV.put('user:b2@b.com', JSON.stringify({ email: 'b2@b.com', name: 'B2', role: 'user' }));
  await env.ST_KV.put('orgmember:orgB:b2@b.com', JSON.stringify({ role: 'admin', status: 'approved' }));

  // Org A posts interaction (which creates activity entry)
  const postReq = new Request('https://app.storytrackr.app/api/student/interactions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': `st_session=${tokenA}` },
    body: JSON.stringify({ sk: 'hs', section: 'core', index: 0, interaction: { id: 'ix2', summary: 'OrgA activity', leader: 'A2', date: '2026-01-01', tags: [], createdAt: new Date().toISOString() }, studentName: 'Alice' }),
  });
  await handleInteractions(postReq, env, '/api/student/interactions', 'POST');

  // Verify activity key has orgA prefix
  const allKeys = [...env.ST_KV.ST_KV ? [] : []]; // introspect via list
  const orgAActivity = await env.ST_KV.list({ prefix: 'activity:orgA:' });
  const orgBActivity = await env.ST_KV.list({ prefix: 'activity:orgB:' });
  assert.equal(orgAActivity.keys.length, 1, 'Org A should have 1 activity entry');
  assert.equal(orgBActivity.keys.length, 0, 'Org B should have 0 activity entries');

  // Org B's recent activity must be empty
  const actReq = new Request('https://app.storytrackr.app/api/activity/recent', {
    headers: { cookie: `st_session=${tokenB}` },
  });
  const actRes = await handleActivity(actReq, env, '/api/activity/recent', 'GET');
  assert.equal(actRes.status, 200);
  const actBody = await actRes.json();
  assert.equal(actBody.items.length, 0, 'Org B must not see Org A activity');
});

test('demo user cannot write students (403)', async () => {
  const env = makeEnv({}, { DEMO_TENANT_ID: 'demo' });
  const demoToken = generateToken();
  await env.ST_KV.put(`session:${demoToken}`, JSON.stringify({ type: 'demo', orgId: 'demo', expiresAt: Date.now() + 60000 }));

  const req = new Request('https://app.storytrackr.app/api/students', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cookie': `st_session=${demoToken}` },
    body: JSON.stringify({ name: 'Injected Student' }),
  });
  const res = await handleStudents(req, env, '/api/students', 'POST');
  assert.equal(res.status, 403, 'Demo user must receive 403 on write to /api/students');
});

test('demo session creation seeds Jordan, Kayla, Marcus', async () => {
  const env = makeEnv({}, { DEMO_TENANT_ID: 'demo' });

  // Simulate a valid (unused) demo token
  const rawToken = generateToken();
  const { hashToken } = await import('../src/api/utils.js');
  const tokHash = await hashToken(rawToken);
  await env.ST_KV.put(`demotok:${tokHash}`, JSON.stringify({ createdAt: Date.now(), used: false }), { expirationTtl: 300 });

  const redeemReq = new Request('https://app.storytrackr.app/api/demo-session/redeem', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: rawToken }),
  });
  const redeemRes = await handleDemo(redeemReq, env, '/api/demo-session/redeem', 'POST');
  assert.equal(redeemRes.status, 200);

  // Roster for demo org should include Jordan, Kayla
  const coreRoster = await env.ST_KV.get('roster:demo:hs:core', { type: 'json' });
  assert.ok(Array.isArray(coreRoster) && coreRoster.length >= 2, 'Demo hs/core roster should have at least 2 students');
  const names = coreRoster.map(s => s.name);
  assert.ok(names.includes('Jordan'), 'Demo roster must include Jordan');
  assert.ok(names.includes('Kayla'), 'Demo roster must include Kayla');

  const looseRoster = await env.ST_KV.get('roster:demo:hs:loose', { type: 'json' });
  assert.ok(looseRoster && looseRoster.some(s => s.name === 'Marcus'), 'Demo roster must include Marcus');
});
