export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isNonEmptyString(value, maxLen = 1000) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLen;
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function parseJsonBody(request) {
  return request.json().catch(() => null);
}
