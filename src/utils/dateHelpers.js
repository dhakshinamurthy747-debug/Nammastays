export function todayYmd() {
  return new Date().toISOString().split('T')[0]
}

/**
 * @param {string} ymd - YYYY-MM-DD
 * @param {string} [timeSuffix='T12:00:00']
 */
export function parseYmd(ymd, timeSuffix = 'T12:00:00') {
  if (!ymd) return null
  const d = new Date(`${ymd}${timeSuffix}`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Nights between check-in and check-out (checkout exclusive). */
export function nightsBetween(checkInYmd, checkOutYmd) {
  const a = parseYmd(checkInYmd)
  const b = parseYmd(checkOutYmd)
  if (!a || !b) return 0
  return Math.max(0, Math.round((b - a) / 86400000))
}
