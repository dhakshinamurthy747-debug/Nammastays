/**
 * @param {Array<{ propertyId?: unknown, code?: string, discountPct?: number, active?: boolean }>} promos
 * @param {number|string} propertyId
 * @param {string} rawCode
 */
export function findActivePromo(promos, propertyId, rawCode) {
  if (!rawCode || !String(rawCode).trim() || !Array.isArray(promos)) return null
  const code = String(rawCode).trim().toUpperCase()
  const pid = Number(propertyId)
  const hit = promos.find(
    p =>
      p.active !== false &&
      Number(p.propertyId) === pid &&
      String(p.code || '')
        .trim()
        .toUpperCase() === code
  )
  if (!hit) return null
  const discountPct = Math.min(50, Math.max(1, Math.round(Number(hit.discountPct) || 0)))
  return {
    discountPct,
    code: String(hit.code).trim(),
    title: String(hit.title || 'Promotion'),
  }
}
