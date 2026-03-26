import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

const MAX = 500

/** @returns {Array<{ id: string, at: string, read: boolean, fromEmail: string, toEmail: string, body: string, bookingId?: string|number, propertyId?: number, propertyName?: string, threadKey: string }>} */
export function loadHostMessages() {
  const raw = loadJson(STORAGE_KEYS.HOST_MESSAGES, [])
  return Array.isArray(raw) ? raw : []
}

export function saveHostMessages(list) {
  try {
    saveJson(STORAGE_KEYS.HOST_MESSAGES, list)
  } catch {
    /* ignore */
  }
}

export function appendHostMessage(row) {
  const list = loadHostMessages()
  const id = `hm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const threadKey =
    row.threadKey ||
    (row.bookingId != null ? `b-${row.bookingId}` : `t-${row.fromEmail}-${row.toEmail}`)
  const entry = {
    id,
    at: new Date().toISOString(),
    read: false,
    threadKey,
    fromEmail: String(row.fromEmail || '').trim().toLowerCase(),
    toEmail: String(row.toEmail || '').trim().toLowerCase(),
    body: String(row.body || '').trim(),
    bookingId: row.bookingId,
    propertyId: row.propertyId != null ? Number(row.propertyId) : undefined,
    propertyName: row.propertyName,
  }
  const next = [entry, ...list].slice(0, MAX)
  saveHostMessages(next)
  try {
    window.dispatchEvent(new Event('ns-host-messages'))
  } catch {
    /* ignore */
  }
  return entry
}

export function markHostMessagesReadForUser(emailKey) {
  const k = String(emailKey || '')
    .trim()
    .toLowerCase()
  if (!k) return
  const list = loadHostMessages().map(m =>
    m.toEmail === k && !m.read ? { ...m, read: true } : m
  )
  saveHostMessages(list)
  try {
    window.dispatchEvent(new Event('ns-host-messages'))
  } catch {
    /* ignore */
  }
}
