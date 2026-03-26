const PREFIX = 'ns_login_otp_'
const TTL_MS = 10 * 60 * 1000

function key(digits) {
  return `${PREFIX}${String(digits).replace(/\D/g, '')}`
}

/**
 * Generate and store a 6-digit OTP for this phone (demo: no SMS — code returned for UI).
 * @param {string} digits – 10–15 digit phone
 * @returns {{ ok: boolean, code?: string, reason?: string }}
 */
export function issueLoginOtp(digits) {
  const d = String(digits || '').replace(/\D/g, '')
  if (d.length < 10 || d.length > 15) return { ok: false, reason: 'invalid_phone' }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  try {
    sessionStorage.setItem(
      key(d),
      JSON.stringify({ code, exp: Date.now() + TTL_MS, issuedAt: Date.now() })
    )
  } catch {
    return { ok: false, reason: 'storage' }
  }
  return { ok: true, code }
}

/**
 * @param {string} digits
 * @param {string} input – user-entered OTP
 */
export function consumeLoginOtp(digits, input) {
  const d = String(digits || '').replace(/\D/g, '')
  if (d.length < 10) return { ok: false, reason: 'invalid_phone' }
  let raw
  try {
    raw = sessionStorage.getItem(key(d))
  } catch {
    return { ok: false, reason: 'storage' }
  }
  if (!raw) return { ok: false, reason: 'no_otp' }
  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'bad_payload' }
  }
  if (Date.now() > payload.exp) {
    try {
      sessionStorage.removeItem(key(d))
    } catch {
      /* ignore */
    }
    return { ok: false, reason: 'expired' }
  }
  const entered = String(input || '').replace(/\D/g, '')
  if (entered.length !== 6 || entered !== String(payload.code)) {
    return { ok: false, reason: 'wrong' }
  }
  try {
    sessionStorage.removeItem(key(d))
  } catch {
    /* ignore */
  }
  return { ok: true }
}

export function hasPendingLoginOtp(digits) {
  try {
    const raw = sessionStorage.getItem(key(digits))
    if (!raw) return false
    const p = JSON.parse(raw)
    return Date.now() <= p.exp
  } catch {
    return false
  }
}
