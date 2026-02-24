/**
 * Photo upload API — R2 only (Google Drive removed)
 * Handles leader photos, logos, and student photos all via Cloudflare R2.
 */
import { jsonResp, getSessionUser, checkRateLimit, getClientIp } from './utils.js';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export async function handleUpload(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ error: 'Not authenticated' }, 401);
  if (user.isDemoMode) return jsonResp({ error: 'Demo is read-only' }, 403);
  if (!env.ST_R2) return jsonResp({ error: 'Storage not configured' }, 500);

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(env, `ratelimit:upload:${ip}`, 30, 60 * 15);
  if (!allowed) return jsonResp({ error: 'Too many upload attempts. Please try again later.' }, 429);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'student'; // 'student' | 'leader' | 'logo'
    if (!file || typeof file.arrayBuffer !== 'function') return jsonResp({ error: 'No file provided' }, 400);
    if (!['student', 'leader', 'logo'].includes(type)) return jsonResp({ error: 'Invalid upload type' }, 400);

    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) return jsonResp({ error: 'Unsupported file type' }, 400);
    if (file.size > MAX_UPLOAD_BYTES) return jsonResp({ error: 'File too large (max 5MB)' }, 400);

    return uploadToR2(file, type, env);
  } catch (e) {
    return jsonResp({ error: 'Upload error: ' + e.message }, 500);
  }
}

async function uploadToR2(file, type, env) {
  const buffer = await file.arrayBuffer();
  const mime   = file.type || 'image/jpeg';
  const ext    = mime.includes('png') ? 'png' : mime.includes('svg') ? 'svg' : mime.includes('webp') ? 'webp' : 'jpg';
  const rand   = Math.random().toString(36).slice(2, 9);
  const ts     = Date.now();

  let key;
  if (type === 'logo')    key = `logos/logo_${ts}.${ext}`;
  else if (type === 'leader') key = `photos/leader_${ts}_${rand}.${ext}`;
  else                    key = `photos/student_${ts}_${rand}.${ext}`;

  await env.ST_R2.put(key, buffer, { httpMetadata: { contentType: mime } });

  // Detect logo brightness for nav contrast
  let logoTone = null;
  if (type === 'logo' && !mime.includes('svg')) {
    const bytes = new Uint8Array(buffer).slice(0, 2048);
    const avg   = bytes.length ? bytes.reduce((a, b) => a + b, 0) / bytes.length : 128;
    logoTone    = avg < 127 ? 'dark' : 'light';
  }

  return jsonResp({ url: `/r2/${key}`, logoTone });
}
