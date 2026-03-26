import { STORAGE_KEYS } from './constants'
import { loadJson } from './storage'

const DEFAULT_COMMISSION_PCT = 15

/** Decimal rate (e.g. 0.15) from Admin → Settings, capped for sanity. */
export function getPlatformCommissionRate() {
  const s = loadJson(STORAGE_KEYS.ADMIN_PLATFORM_SETTINGS, { commissionPct: DEFAULT_COMMISSION_PCT })
  const pct = Number(s.commissionPct)
  const n = Number.isFinite(pct) ? pct : DEFAULT_COMMISSION_PCT
  return Math.min(0.5, Math.max(0, n / 100))
}
