import { PLATFORM_ROLE_EMAILS } from '../utils/constants'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parse a single “email / mobile” field. Phone logins get a stable synthetic email for session storage.
 * @param {string} raw
 * @returns {{ kind: 'email', emailRef: string, phone: '' } | { kind: 'phone', emailRef: string, phone: string, digits: string } | null}
 */
export function parseLoginIdentifier(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (EMAIL_RE.test(s)) {
    return { kind: 'email', emailRef: s.toLowerCase(), phone: '' }
  }
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 15) {
    return {
      kind: 'phone',
      emailRef: `${digits}@guest.nammastays.local`,
      phone: s,
      digits,
    }
  }
  return null
}

/**
 * @param {NonNullable<ReturnType<typeof parseLoginIdentifier>>} parsed
 */
export function displayNameForLogin(parsed) {
  if (parsed.kind === 'email') return displayNameFromEmail(parsed.emailRef)
  return `Guest (${parsed.digits.slice(-4)})`
}

/**
 * @param {string} emailNormalized - lowercased trim email
 */
export function resolveRoleFromEmail(emailNormalized) {
  if (emailNormalized === PLATFORM_ROLE_EMAILS.ADMIN.toLowerCase()) return 'admin'
  if (emailNormalized === PLATFORM_ROLE_EMAILS.OWNER.toLowerCase()) return 'owner'
  return 'guest'
}

/**
 * Build display name from email local-part when no display name is provided.
 * @param {string} email
 */
export function displayNameFromEmail(email) {
  const local = String(email).split('@')[0] || ''
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function fakeNetworkDelay(ms = 800) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
