import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

const DEFAULT_PROMOS = [
  { id: 'p1', propertyId: 101, title: 'Stay 5+ nights', discountPct: 12, code: 'EXT12', active: true },
]

/** @returns {Array<{ id: string, propertyId: number, title: string, discountPct: number, code: string, active?: boolean }>} */
export function loadHostPromotions() {
  const raw = loadJson(STORAGE_KEYS.HOST_PROMOS, null)
  if (Array.isArray(raw) && raw.length) return raw
  return DEFAULT_PROMOS.map(p => ({ ...p }))
}

/** @param {unknown[]} list */
export function saveHostPromotions(list) {
  if (!Array.isArray(list)) return
  try {
    saveJson(STORAGE_KEYS.HOST_PROMOS, list)
  } catch {
    /* ignore */
  }
}
