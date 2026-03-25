/**
 * @param {number} amount
 * @param {string} [locale='en-IN']
 * @returns {string}
 */
export function formatPrice(amount, locale = 'en-IN') {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '—'
  return `₹${n.toLocaleString(locale)}`
}
