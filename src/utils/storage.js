import { STORAGE_KEYS } from './constants'

export function loadJson(key, fallback) {
  try {
    const s = localStorage.getItem(key)
    if (!s) return fallback
    const p = JSON.parse(s)
    return p ?? fallback
  } catch {
    return fallback
  }
}

export function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota */
  }
}

export function loadAuthSession() {
  const row = loadJson(STORAGE_KEYS.AUTH_SESSION, null)
  if (!row || typeof row !== 'object' || !row.email) return null
  return row
}

export function saveAuthSession(user) {
  if (!user) {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION)
    } catch {
      /* ignore */
    }
    return
  }
  saveJson(STORAGE_KEYS.AUTH_SESSION, user)
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION)
  } catch {
    /* ignore */
  }
}
