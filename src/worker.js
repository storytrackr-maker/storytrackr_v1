/**
 * ASM 2026 Roster — Cloudflare Worker
 * Worship Grow Go · Anthem Students
 *
 * REQUIRED KV NAMESPACE BINDING:  ASM_KV
 * REQUIRED R2 BUCKET BINDING:     ASM_R2
 * REQUIRED SECRETS:
 *   ADMIN_EMAIL        (your email)
 *   GOOGLE_SCRIPT_URL  (Apps Script web app URL)
 *   MAILCHANNELS_FROM  (noreply@anthemstudents.org)
 *   DRIVE_FOLDER_ID    (1p7TiaPjqEPGIBxFMUEwqIGwTi81HA15r)
 */

import { handleAuth }         from './api/auth.js';
import { handleSheet }        from './api/sheet.js';
import { handleAdmin }        from './api/admin.js';
import { handleInteractions } from './api/interactions.js';
import { handleActivity }     from './api/activity.js';
import { handleBrainDump }    from './api/brainDump.js';
import { handleUpload }       from './api/upload.js';
import { handleSettings }     from './api/settings.js';
import { getHTML }            from './html/index.js';
import { buildManifest }       from './html/manifest.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ── CORS preflight ──────────────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // ── PWA Manifest (dynamic from settings) ────────────────
    if (pathname === '/manifest.json') {
      const settings = await env.ASM_KV.get('settings:org', { type: 'json' });
      return new Response(buildManifest(settings), {
        headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    // ── R2 object serving (photos, logos) ───────────────────
    if (pathname.startsWith('/r2/') && method === 'GET') {
      return serveR2(env, pathname);
    }

    // ── Settings endpoints ─────────────────────────────────
    if (pathname.startsWith('/api/settings')) {
      return handleSettings(request, env, pathname, method);
    }

    // ── Auth endpoints ───────────────────────────────────────
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/me') || pathname.startsWith('/api/profile')) {
      return handleAuth(request, env, pathname, method);
    }

    // ── Sheet endpoints ──────────────────────────────────────
    if (pathname.startsWith('/api/sheet/')) {
      return handleSheet(request, env, pathname, method);
    }

    // ── Admin endpoints ──────────────────────────────────────
    if (pathname.startsWith('/api/admin/')) {
      return handleAdmin(request, env, pathname, method);
    }

    // ── Interaction endpoints ────────────────────────────────
    if (pathname.startsWith('/api/student/')) {
      return handleInteractions(request, env, pathname, method);
    }

    // ── Activity feed ────────────────────────────────────────
    if (pathname.startsWith('/api/activity/')) {
      return handleActivity(request, env, pathname, method);
    }

    // ── Brain dump ───────────────────────────────────────────
    if (pathname === '/api/brain-dump' && method === 'POST') {
      return handleBrainDump(request, env);
    }

    // ── Photo upload ─────────────────────────────────────────
    if (pathname === '/api/upload-photo' && method === 'POST') {
      return handleUpload(request, env);
    }

    // ── Serve the app HTML ───────────────────────────────────
    return new Response(getHTML(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};

async function serveR2(env, pathname) {
  if (!env.ASM_R2) {
    return new Response('R2 not configured', { status: 500 });
  }
  const key = pathname.slice(4); // strip "/r2/"
  if (!key || key.includes('..')) {
    return new Response('Invalid path', { status: 400 });
  }
  const object = await env.ASM_R2.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'ETag': object.etag,
    },
  });
}
