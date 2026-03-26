import { getPlatformCommissionRate } from './platformSettings'

/** Nightly tariff threshold — same rule applied to room subtotal for the stay */
export const GST_NIGHTLY_THRESHOLD = 7500
export const GST_RATE_LOW = 0.05
export const GST_RATE_HIGH = 0.18

/** @deprecated Use Admin platform commission via getPlatformCommissionRate() */
export const HOST_COMMISSION_RATE = 0.15

/** Guest service fee % by lifetime spend (pre‑this booking), in ₹ */
export const SERVICE_SPEND_TIER_1_MAX = 50000
export const SERVICE_SPEND_TIER_2_MAX = 100000
export const SERVICE_FEE_RATE_NEW = 0.1
export const SERVICE_FEE_RATE_REGULAR = 0.08
export const SERVICE_FEE_RATE_LOYAL = 0.06

export function gstRateForNightlyPrice(nightlyPrice) {
  return Number(nightlyPrice) < GST_NIGHTLY_THRESHOLD ? GST_RATE_LOW : GST_RATE_HIGH
}

/**
 * @param {number} lifetimeSpendInr - Sum of past `total` paid (confirmed) for this guest, before current cart
 */
export function serviceFeeRateForLifetimeSpend(lifetimeSpendInr) {
  const s = Math.max(0, Number(lifetimeSpendInr) || 0)
  if (s < SERVICE_SPEND_TIER_1_MAX) return SERVICE_FEE_RATE_NEW
  if (s < SERVICE_SPEND_TIER_2_MAX) return SERVICE_FEE_RATE_REGULAR
  return SERVICE_FEE_RATE_LOYAL
}

export function serviceFeeTierLabel(rate) {
  if (rate === SERVICE_FEE_RATE_NEW) return 'Member (10%) — under ₹50k spent'
  if (rate === SERVICE_FEE_RATE_REGULAR) return 'Member (8%) — ₹50k–₹1L spent'
  return 'Member (6%) — over ₹1L spent'
}

/**
 * @param {Array<{ total?: number, guestEmail?: string }>} bookings
 * @param {string} guestEmailRaw
 */
export function sumGuestLifetimeSpend(bookings, guestEmailRaw) {
  if (!guestEmailRaw || !Array.isArray(bookings)) return 0
  const key = String(guestEmailRaw).trim().toLowerCase()
  return bookings.reduce((sum, b) => {
    const em = b.guestEmail != null ? String(b.guestEmail).trim().toLowerCase() : ''
    if (!em || em !== key) return sum
    if (b.status === 'cancelled' || b.status === 'refunded') return sum
    return sum + (Number(b.total) || 0)
  }, 0)
}

/**
 * @param {{
 *   nightlyPrice?: number,
 *   nights?: number,
 *   lifetimeSpendBefore: number,
 *   platformCommissionRate?: number,
 *   nightlyPrices?: number[],
 *   promoDiscountPct?: number,
 * }} p
 */
export function computeGuestBookingBreakdown({
  nightlyPrice,
  nights: nightsArg,
  lifetimeSpendBefore,
  platformCommissionRate,
  nightlyPrices: nightlyPricesArg,
  promoDiscountPct: promoDiscountPctArg,
}) {
  let nightlyPricesAudit = []
  let n = 0

  if (Array.isArray(nightlyPricesArg) && nightlyPricesArg.length > 0) {
    nightlyPricesAudit = nightlyPricesArg.map(x => Math.max(0, Math.round(Number(x) || 0)))
    n = nightlyPricesAudit.length
  } else {
    n = Math.max(0, Number(nightsArg) || 0)
    const nightly = Math.max(0, Number(nightlyPrice) || 0)
    nightlyPricesAudit = n > 0 ? Array.from({ length: n }, () => Math.round(nightly)) : []
  }

  const roomSubtotalBeforePromo = nightlyPricesAudit.reduce((a, b) => a + b, 0)
  const promoDiscountPct = Math.min(50, Math.max(0, Number(promoDiscountPctArg) || 0))
  if (promoDiscountPct > 0 && nightlyPricesAudit.length > 0) {
    const factor = 1 - promoDiscountPct / 100
    nightlyPricesAudit = nightlyPricesAudit.map(p => Math.max(0, Math.round(p * factor)))
  }
  const roomSubtotal = nightlyPricesAudit.reduce((a, b) => a + b, 0)
  const promoDiscountAmount = Math.max(0, roomSubtotalBeforePromo - roomSubtotal)

  let gstAmount = 0
  for (const nightly of nightlyPricesAudit) {
    const r = gstRateForNightlyPrice(nightly)
    gstAmount += Math.round(nightly * r)
  }

  const representativeNightly =
    nightlyMathAverage(nightlyPricesAudit) || Math.max(0, Number(nightlyPrice) || 0)
  const gstRate = gstRateForNightlyPrice(representativeNightly)

  const spendBefore = Math.max(0, Number(lifetimeSpendBefore) || 0)
  const serviceFeeRate = serviceFeeRateForLifetimeSpend(spendBefore)
  const serviceFeeAmount = Math.round(roomSubtotal * serviceFeeRate)
  const grandTotal = roomSubtotal + gstAmount + serviceFeeAmount
  const commissionRate =
    platformCommissionRate != null ? Number(platformCommissionRate) : getPlatformCommissionRate()
  const hostCommissionAmount = Math.round(roomSubtotal * commissionRate)
  const hostNetOnRoom = Math.max(0, roomSubtotal - hostCommissionAmount)

  return {
    roomSubtotal,
    roomSubtotalBeforePromo,
    promoDiscountPct,
    promoDiscountAmount,
    gstRate,
    gstPercentLabel: gstRate === GST_RATE_LOW ? 5 : 18,
    gstAmount,
    serviceFeeRate,
    serviceFeePercentLabel: Math.round(serviceFeeRate * 100),
    serviceFeeAmount,
    grandTotal,
    hostCommissionAmount,
    hostNetOnRoom,
    nightlyPrice: representativeNightly,
    nightlyPrices: nightlyPricesAudit,
    nights: n,
    lifetimeSpendBefore: spendBefore,
    serviceFeeTierNote: serviceFeeTierLabel(serviceFeeRate),
    platformCommissionRate: commissionRate,
  }
}

function nightlyMathAverage(arr) {
  if (!arr.length) return 0
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length)
}
