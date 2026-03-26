import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

const MAX = 40

export function initClientMonitoring() {
  if (typeof window === 'undefined') return

  const push = payload => {
    try {
      const prev = loadJson(STORAGE_KEYS.CLIENT_ERROR_LOG, [])
      const list = Array.isArray(prev) ? prev : []
      const next = [{ t: new Date().toISOString(), ...payload }, ...list].slice(0, MAX)
      saveJson(STORAGE_KEYS.CLIENT_ERROR_LOG, next)
    } catch {
      /* ignore */
    }
  }

  window.addEventListener('error', e => {
    push({
      type: 'error',
      message: e.message,
      source: e.filename,
      line: e.lineno,
    })
  })

  window.addEventListener('unhandledrejection', e => {
    push({
      type: 'rejection',
      message: String(e.reason?.message || e.reason),
    })
  })
}
