import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

const MAX = 40

/** @returns {Array<{ id: string, title: string, body: string, href?: string, read: boolean, at: string }>} */
export function loadInAppNotifications() {
  const raw = loadJson(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])
  return Array.isArray(raw) ? raw : []
}

/** @param {{ title: string, body: string, href?: string, recipientEmail?: string }} n */
export function pushInAppNotification(n) {
  const list = loadInAppNotifications()
  const recipientEmail = n.recipientEmail
    ? String(n.recipientEmail)
        .trim()
        .toLowerCase()
    : undefined
  const row = {
    id: `ntf-${Date.now()}`,
    title: n.title,
    body: n.body,
    href: n.href,
    read: false,
    at: new Date().toISOString(),
    recipientEmail,
  }
  const next = [row, ...list].slice(0, MAX)
  saveJson(STORAGE_KEYS.IN_APP_NOTIFICATIONS, next)
  return next
}

export function markNotificationRead(id) {
  const list = loadInAppNotifications().map(x => (x.id === id ? { ...x, read: true } : x))
  saveJson(STORAGE_KEYS.IN_APP_NOTIFICATIONS, list)
  try {
    window.dispatchEvent(new Event('ns-notifications'))
  } catch {
    /* ignore */
  }
}

export function markAllNotificationsRead() {
  const list = loadInAppNotifications().map(x => ({ ...x, read: true }))
  saveJson(STORAGE_KEYS.IN_APP_NOTIFICATIONS, list)
  try {
    window.dispatchEvent(new Event('ns-notifications'))
  } catch {
    /* ignore */
  }
}
