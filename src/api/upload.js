import { jsonResp, getSessionUser } from './utils.js';

export async function handleUpload(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) return jsonResp({ error: 'Not authenticated' }, 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type') || 'student';
    if (!file) return jsonResp({ error: 'No file provided' }, 400);

    // Profile photos and logos → R2
    if ((type === 'leader' || type === 'logo') && env.ASM_R2) {
      return uploadToR2(file, type, env);
    }

    // Student photos → Google Drive (existing flow)
    return uploadToGoogleDrive(file, env);
  } catch (e) {
    return jsonResp({ error: 'Upload error: ' + e.message }, 500);
  }
}

async function uploadToR2(file, type, env) {
  const buffer = await file.arrayBuffer();
  const ext = (file.type || 'image/jpeg').includes('png') ? 'png' : ((file.type||'').includes('svg') ? 'svg' : 'jpg');
  const key = type === 'logo'
    ? `logo_${Date.now()}.${ext}`
    : `photos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.ASM_R2.put(key, buffer, {
    httpMetadata: { contentType: file.type || 'image/jpeg' },
  });

  let logoTone = null;
  if (type === 'logo' && !String(file.type || '').includes('svg')) {
    const bytes = new Uint8Array(buffer).slice(0, 2048);
    const avg = bytes.length ? bytes.reduce((a, b) => a + b, 0) / bytes.length : 128;
    logoTone = avg < 127 ? 'dark' : 'light';
  }

  return jsonResp({ url: `/r2/${key}`, logoTone });
}

async function uploadToGoogleDrive(file, env) {
  if (!env.GOOGLE_SCRIPT_URL) return jsonResp({ error: 'Upload not configured' }, 500);

  const buffer = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mimeType = file.type || 'image/jpeg';
  const fileName = file.name || `upload_${Date.now()}.jpg`;
  const folderId = env.DRIVE_FOLDER_ID || '1p7TiaPjqEPGIBxFMUEwqIGwTi81HA15r';

  const res = await fetch(env.GOOGLE_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'uploadPhoto', fileName, mimeType, base64, folderId, _s: env.GAS_SHARED_SECRET || '' }),
  });
  const data = await res.json();

  if (data.url || data.fileUrl) {
    return jsonResp({ url: data.url || data.fileUrl });
  }
  return jsonResp({ error: data.error || 'Upload failed' }, 500);
}
