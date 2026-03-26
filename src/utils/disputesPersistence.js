import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

/** @returns {Array<{ id: string, createdAt: string, status: 'open'|'resolved', bookingId: string|number, openedByEmail: string, reason: string, notes?: string }>} */
export function loadDisputes() {
  const raw = loadJson(STORAGE_KEYS.DISPUTES, [])
  return Array.isArray(raw) ? raw : []
}

export function saveDisputes(list) {
  saveJson(STORAGE_KEYS.DISPUTES, list)
}

export function appendDispute(row) {
  const list = loadDisputes()
  const id = `dsp-${Date.now()}`
  const entry = {
    id,
    createdAt: new Date().toISOString(),
    status: 'open',
    bookingId: row.bookingId,
    openedByEmail: String(row.openedByEmail || '').trim().toLowerCase(),
    reason: String(row.reason || '').trim(),
    notes: row.notes ? String(row.notes) : '',
  }
  saveDisputes([entry, ...list])
  try {
    window.dispatchEvent(new Event('ns-disputes'))
  } catch {
    /* ignore */
  }
  return entry
}

export function patchDispute(id, patch) {
  const list = loadDisputes().map(d => (d.id === id ? { ...d, ...patch } : d))
  saveDisputes(list)
  try {
    window.dispatchEvent(new Event('ns-disputes'))
  } catch {
    /* ignore */
  }
}
