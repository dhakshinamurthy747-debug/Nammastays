const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

function storageKey(identifier) {
  return `ns_login_attempts_${btoa(unescape(encodeURIComponent(String(identifier).slice(0, 200))))}`
}

/** Call before processing login. Returns { ok: true } or { ok: false, retryAfterMs } */
export function consumeLoginAttempt(identifier) {
  const k = storageKey(identifier)
  const now = Date.now()
  let rec
  try {
    rec = JSON.parse(sessionStorage.getItem(k) || 'null')
  } catch {
    rec = null
  }
  if (!rec || typeof rec !== 'object' || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + WINDOW_MS }
  }
  if (rec.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfterMs: Math.max(0, rec.resetAt - now) }
  }
  rec.count += 1
  try {
    sessionStorage.setItem(k, JSON.stringify(rec))
  } catch {
    /* ignore */
  }
  return { ok: true }
}

export function clearLoginAttempts(identifier) {
  try {
    sessionStorage.removeItem(storageKey(identifier))
  } catch {
    /* ignore */
  }
}
