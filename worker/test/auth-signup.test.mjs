import test from 'node:test';
import assert from 'node:assert/strict';

import { handleAuth } from '../src/api/auth.js';

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

test('signup rejects missing ministry name', async () => {
  const env = makeEnv();
  const req = new Request('https://app.storytrackr.app/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'StrongPass123',
    }),
  });

  const res = await handleAuth(req, env, '/api/auth/signup', 'POST');
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error, 'Name, email, password, and ministry name are required');
});

test('signup rejects blank ministry name', async () => {
  const env = makeEnv();
  const req = new Request('https://app.storytrackr.app/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'StrongPass123',
      orgName: '   ',
    }),
  });

  const res = await handleAuth(req, env, '/api/auth/signup', 'POST');
  assert.equal(res.status, 400);
});

test('signup accepts ministry name and /api/me includes orgName', async () => {
  const env = makeEnv();
  const signupReq = new Request('https://app.storytrackr.app/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Alex',
      email: 'alex@example.com',
      password: 'StrongPass123',
      orgName: 'Westside Students',
    }),
  });

  const signupRes = await handleAuth(signupReq, env, '/api/auth/signup', 'POST');
  assert.equal(signupRes.status, 200);
  const setCookie = signupRes.headers.get('Set-Cookie') || '';
  const match = setCookie.match(/st_session=([a-f0-9]+)/);
  assert.ok(match);

  const meReq = new Request('https://app.storytrackr.app/api/me', {
    method: 'GET',
    headers: { cookie: `st_session=${match[1]}` },
  });
  const meRes = await handleAuth(meReq, env, '/api/me', 'GET');
  const meBody = await meRes.json();
  assert.equal(meRes.status, 200);
  assert.equal(meBody.user.orgName, 'Westside Students');
});
