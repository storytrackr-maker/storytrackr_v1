/**
 * StoryTrackr — Cloudflare Worker API
 *
 * Handles: app.storytrackr.app/api/*  (via Worker Route)
 * Marketing demo endpoint: POST /api/demo-session  (CORS-enabled for storytrackr.app)
 *
 * KV BINDING:  ST_KV
 * R2 BINDING:  ST_R2
 * SECRETS:     ADMIN_EMAIL, SESSION_SECRET, DEMO_TENANT_ID, MAILCHANNELS_FROM
 */

import { handleAuth }         from './api/auth.js';
import { handleAdmin }        from './api/admin.js';
import { handleOwner }        from './api/superadmin.js';
import { handleInteractions } from './api/interactions.js';
import { handleActivity }     from './api/activity.js';
import { handleBrainDump }    from './api/brainDump.js';
import { handleUpload }       from './api/upload.js';
import { handleSettings }     from './api/settings.js';
import { handleStudents }     from './api/students.js';
import { handleDemo }         from './api/demo.js';
import { generateToken, logEvent } from './api/utils.js';

const ALLOWED_ORIGINS = [
  'https://storytrackr.app',
  'https://app.storytrackr.app',
  'http://localhost:3000',
  'http://localhost:8787',
];



function securityHeaders(requestId) {
  return {
    'X-Request-Id': requestId,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none';",
  };
}

function withRequestId(request, requestId) {
  const headers = new Headers(request.headers);
  headers.set('X-Request-Id', requestId);
  return new Request(request, { headers });
}

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
    const requestId = request.headers.get('CF-Ray') || generateToken().slice(0, 16);
    const req = withRequestId(request, requestId);
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;
    const cors = { ...corsHeaders(req), ...securityHeaders(requestId) };

    logEvent(req, 'info', 'request.start', { method, pathname });

    try {
      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
      }

      if (pathname === '/manifest.json') {
        const orgId = new URL(req.url).searchParams.get('orgId') || 'default';
        const settings = await env.ST_KV.get(`settings:org:${orgId}`, { type: 'json' });
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
        return new Response(manifest, { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600', ...cors } });
      }

      if (pathname.startsWith('/r2/') && method === 'GET') return serveR2(env, pathname, req, requestId);
      if (pathname.startsWith('/api/settings')) return withCors(handleSettings(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/auth/') || pathname === '/api/me' || pathname.startsWith('/api/profile')) return withCors(handleAuth(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/demo')) return withCors(handleDemo(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/student/interactions')) return withCors(handleInteractions(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/students')) return withCors(handleStudents(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/owner'))  return withCors(handleOwner(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/admin/')) return withCors(handleAdmin(req, env, pathname, method), cors);
      if (pathname.startsWith('/api/activity/')) return withCors(handleActivity(req, env, pathname, method), cors);
      if (pathname === '/api/brain-dump' && method === 'POST') return withCors(handleBrainDump(req, env), cors);
      if (pathname === '/api/upload-photo' && method === 'POST') return withCors(handleUpload(req, env), cors);

      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...cors } });
    } catch (error) {
      logEvent(req, 'error', 'request.error', { method, pathname, message: error?.message || 'unknown' });
      return new Response(JSON.stringify({ error: 'Internal server error', requestId }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } });
    }
  },
};

async function withCors(responsePromise, cors) {
  const response = await responsePromise;
  const newHeaders = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors)) newHeaders.set(k, v);
  return new Response(response.body, { status: response.status, headers: newHeaders });
}

async function serveR2(env, pathname, request, requestId) {
  if (!env.ST_R2) return new Response('R2 not configured', { status: 500 });
  const key = pathname.slice(4);
  if (!key || key.includes('..')) return new Response('Invalid path', { status: 400 });
  const object = await env.ST_R2.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.etag,
      ...corsHeaders(request),
      ...securityHeaders(requestId),
    },
  });
}
