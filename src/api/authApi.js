import { DEMO_EMAILS } from '../utils/constants'

/**
 * @param {string} emailNormalized - lowercased trim email
 */
export function resolveRoleFromEmail(emailNormalized) {
  if (emailNormalized === DEMO_EMAILS.ADMIN.toLowerCase()) return 'admin'
  if (emailNormalized === DEMO_EMAILS.OWNER.toLowerCase()) return 'owner'
  return 'guest'
}

/**
 * Build display name from email local-part (demo login).
 * @param {string} email
 */
export function displayNameFromEmail(email) {
  const local = String(email).split('@')[0] || ''
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function fakeNetworkDelay(ms = 800) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
