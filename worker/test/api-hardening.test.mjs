import test from 'node:test';
import assert from 'node:assert/strict';

import { verifyPassword, hashPassword, checkRateLimit, hasPermission } from '../src/api/utils.js';
import { handleActivity } from '../src/api/activity.js';
import { handleInteractions } from '../src/api/interactions.js';
import { handleSettings } from '../src/api/settings.js';
import { generateToken } from '../src/api/utils.js';

function makeEnv(seed = {}) {
  const kv = new Map(Object.entries(seed));
  return {
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
