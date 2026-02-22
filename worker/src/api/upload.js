/**
 * Photo upload API — R2 only (Google Drive removed)
 * Handles leader photos, logos, and student photos all via Cloudflare R2.
 */
import { jsonResp, getSessionUser } from './utils.js';

export async function handleUpload(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ error: 'Not authenticated' }, 401);
  if (user.isDemoMode) return jsonResp({ error: 'Demo is read-only' }, 403);
  if (!env.ASM_R2) return jsonResp({ error: 'Storage not configured' }, 500);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'student'; // 'student' | 'leader' | 'logo'
    if (!file) return jsonResp({ error: 'No file provided' }, 400);

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

  await env.ASM_R2.put(key, buffer, { httpMetadata: { contentType: mime } });

  // Detect logo brightness for nav contrast
  let logoTone = null;
  if (type === 'logo' && !mime.includes('svg')) {
    const bytes = new Uint8Array(buffer).slice(0, 2048);
    const avg   = bytes.length ? bytes.reduce((a, b) => a + b, 0) / bytes.length : 128;
    logoTone    = avg < 127 ? 'dark' : 'light';
  }

  return jsonResp({ url: `/r2/${key}`, logoTone });
}
