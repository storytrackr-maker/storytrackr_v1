/**
 * StoryTrackr — Cloudflare Worker API
 *
 * Handles: app.storytrackr.app/api/*  (via Worker Route)
 * Marketing demo endpoint: POST /api/demo-session  (CORS-enabled for storytrackr.app)
 *
 * KV BINDING:  ASM_KV
 * R2 BINDING:  ASM_R2
 * SECRETS:     ADMIN_EMAIL, SESSION_SECRET, DEMO_TENANT_ID, MAILCHANNELS_FROM
 */

import { handleAuth }         from './api/auth.js';
import { handleAdmin }        from './api/admin.js';
import { handleInteractions } from './api/interactions.js';
import { handleActivity }     from './api/activity.js';
import { handleBrainDump }    from './api/brainDump.js';
import { handleUpload }       from './api/upload.js';
import { handleSettings }     from './api/settings.js';
import { handleStudents }     from './api/students.js';
import { handleDemo }         from './api/demo.js';

const ALLOWED_ORIGINS = [
  'https://storytrackr.app',
  'https://app.storytrackr.app',
  'http://localhost:3000',
  'http://localhost:8787',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://app.storytrackr.app';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ── CORS preflight ────────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // ── PWA Manifest ──────────────────────────────────────────
    if (pathname === '/manifest.json') {
      const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
      const name = settings?.ministryName || 'StoryTrackr';
      const manifest = JSON.stringify({
        name,
        short_name: 'StoryTrackr',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#6366f1',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      return new Response(manifest, {
        headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600', ...corsHeaders(request) },
      });
    }

    // ── R2 object serving ─────────────────────────────────────
    if (pathname.startsWith('/r2/') && method === 'GET') {
      return serveR2(env, pathname, request);
    }

    // ── API routing ───────────────────────────────────────────
    const cors = corsHeaders(request);

    if (pathname.startsWith('/api/settings')) {
      return withCors(handleSettings(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/auth/') || pathname === '/api/me' || pathname.startsWith('/api/profile')) {
      return withCors(handleAuth(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/demo')) {
      return withCors(handleDemo(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/student/interactions')) {
      return withCors(handleInteractions(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/students')) {
      return withCors(handleStudents(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/admin/')) {
      return withCors(handleAdmin(request, env, pathname, method), cors);
    }
    if (pathname.startsWith('/api/activity/')) {
      return withCors(handleActivity(request, env, pathname, method), cors);
    }
    if (pathname === '/api/brain-dump' && method === 'POST') {
      return withCors(handleBrainDump(request, env), cors);
    }
    if (pathname === '/api/upload-photo' && method === 'POST') {
      return withCors(handleUpload(request, env), cors);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  },
};

async function withCors(responsePromise, cors) {
  const response = await responsePromise;
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) newHeaders.set(k, v);
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

async function serveR2(env, pathname, request) {
  if (!env.ASM_R2) return new Response('R2 not configured', { status: 500 });
  const key = pathname.slice(4);
  if (!key || key.includes('..')) return new Response('Invalid path', { status: 400 });
  const object = await env.ASM_R2.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.etag,
      ...corsHeaders(request),
    },
  });
}
