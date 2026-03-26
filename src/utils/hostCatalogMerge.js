import { getEffectiveRateForDate, getUnitsForDate } from './ownerBulkScheduling'
import { toYMD } from '../data/ownerDashboard'

function ratesEntry(hostOpsState, id) {
  const sk = String(id)
  return hostOpsState.ownerRates[id] ?? hostOpsState.ownerRates[sk]
}

function invEntry(hostOpsState, id) {
  const sk = String(id)
  return hostOpsState.inventoryUnits[id] ?? hostOpsState.inventoryUnits[sk]
}

function blockedEntry(hostOpsState, id) {
  const sk = String(id)
  return hostOpsState.blockedByProp[id] ?? hostOpsState.blockedByProp[sk]
}

/** Attach persisted host operational fields to a catalog row for guest flows. */
export function attachHostOperationsToProperty(prop, hostOpsState) {
  if (!hostOpsState) {
    const nightly = Math.max(0, Math.round(Number(prop.price) || 0)) || 15000
    return {
      ...prop,
      price: nightly,
      minStayNights: prop.minStayNights ?? 2,
      _hostOps: {
        base: { nightly, minNights: prop.minStayNights ?? 2 },
        inventoryUnits: 1,
        unitRangesByProp: [],
        rateRangesByProp: [],
        blockedByProp: [],
      },
    }
  }
  const id = prop.id
  const sk = String(id)
  const rates = ratesEntry(hostOpsState, id)
  const baseNightly =
    rates?.nightly != null
      ? Math.max(0, Math.round(Number(rates.nightly) || 0))
      : Math.max(0, Math.round(Number(prop.price) || 0)) || 15000
  const baseMin =
    rates?.minNights != null
      ? Math.max(1, Math.min(30, Number(rates.minNights) || 1))
      : Math.max(1, Number(prop.minStayNights) || 2)
  const inventoryUnits =
    invEntry(hostOpsState, id) != null
      ? Math.max(1, Math.min(20, Number(invEntry(hostOpsState, id)) || 1))
      : 1
  const unitRanges = hostOpsState.unitRangesByProp[sk] || []
  const rateRanges = hostOpsState.rateRangesByProp[sk] || []
  const blockedRaw = blockedEntry(hostOpsState, id)
  const blocked = Array.isArray(blockedRaw) ? blockedRaw : []

  const pol = hostOpsState.listingPolicies?.[sk] || hostOpsState.listingPolicies?.[id] || {}
  const cdn = hostOpsState.listingCdnGallery?.[sk] || hostOpsState.listingCdnGallery?.[id]
  const cdnUrls = cdn && Array.isArray(cdn.urls) ? cdn.urls.map(String).filter(Boolean) : []
  let image = prop.image
  let gallery = Array.isArray(prop.gallery) ? prop.gallery : undefined
  if (cdnUrls.length) {
    image = cdnUrls[0]
    gallery = cdnUrls
  }

  return {
    ...prop,
    image,
    gallery,
    cancellationPolicyText: pol.cancellationText || prop.cancellationPolicyText,
    houseRulesText: pol.houseRulesText || prop.houseRulesText,
    policyAttachments: Array.isArray(pol.attachments) ? pol.attachments : prop.policyAttachments,
    price: baseNightly,
    minStayNights: baseMin,
    _hostOps: {
      base: { nightly: baseNightly, minNights: baseMin },
      inventoryUnits,
      unitRangesByProp: unitRanges,
      rateRangesByProp: rateRanges,
      blockedByProp: blocked,
    },
  }
}

/**
 * @param {Record<string, unknown>} property
 * @param {string} checkInYmd
 * @param {string} checkOutYmd
 */
export function buildNightlyPricesForStay(property, checkInYmd, checkOutYmd) {
  const id = property.id
  const ho = property._hostOps || {}
  const base = ho.base || {
    nightly: property.price,
    minNights: property.minStayNights || 2,
  }
  const rateMap = { [String(id)]: ho.rateRangesByProp || [] }
  const nightlyPrices = []
  const minNightsRequired = []
  const start = new Date(`${checkInYmd}T12:00:00`)
  const end = new Date(`${checkOutYmd}T12:00:00`)
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const ymd = toYMD(d)
    const eff = getEffectiveRateForDate(ymd, id, base, rateMap)
    nightlyPrices.push(eff.nightly)
    minNightsRequired.push(eff.minNights)
  }
  const stayMinNights = minNightsRequired.length ? Math.max(...minNightsRequired) : base.minNights
  return { nightlyPrices, stayMinNights, base }
}

/**
 * @param {Record<string, unknown>} property
 * @param {string} checkInYmd
 * @param {string} checkOutYmd
 * @param {Array<{ propertyId?: unknown, checkIn?: string, checkOut?: string, status?: string }>} bookings
 */
export function validateStayAvailability(property, checkInYmd, checkOutYmd, bookings) {
  const ho = property._hostOps
  if (!ho) return { ok: true }
  const id = property.id
  const blocked = new Set(ho.blockedByProp || [])
  const defaultUnits = ho.inventoryUnits ?? 1
  const unitMap = { [String(id)]: ho.unitRangesByProp || [] }
  const active = Array.isArray(bookings)
    ? bookings.filter(
        b =>
          String(b.propertyId) === String(id) &&
          b.status !== 'cancelled' &&
          b.status !== 'refunded'
      )
    : []

  const start = new Date(`${checkInYmd}T12:00:00`)
  const end = new Date(`${checkOutYmd}T12:00:00`)
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const ymd = toYMD(d)
    if (blocked.has(ymd)) {
      return {
        ok: false,
        message: `Those dates include ${ymd}, when the host has closed this listing.`,
      }
    }
    const cap = getUnitsForDate(ymd, id, defaultUnits, unitMap)
    const overlapping = active.filter(b => ymd >= b.checkIn && ymd < b.checkOut).length
    if (overlapping >= cap) {
      return {
        ok: false,
        message: `No availability for part of this stay (${ymd} is fully booked). Try different dates.`,
      }
    }
  }
  return { ok: true }
}
