import { toYMD, bookingForDay } from '../data/ownerDashboard'

/**
 * Effective listing count for a single calendar night (last matching range wins).
 * @param {string} ymd
 * @param {string|number} propertyId
 * @param {number} defaultUnits
 * @param {Record<string, Array<{ from: string, to: string, units: number }>>} unitRangesByProp
 */
export function getUnitsForDate(ymd, propertyId, defaultUnits, unitRangesByProp) {
  const ranges = unitRangesByProp[String(propertyId)] || []
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i]
    if (ymd >= r.from && ymd <= r.to) {
      return Math.max(1, Math.min(20, Number(r.units) || 1))
    }
  }
  return Math.max(1, Math.min(20, Number(defaultUnits) || 1))
}

/**
 * @param {string} ymd
 * @param {string|number} propertyId
 * @param {{ nightly: number, minNights: number }} base
 * @param {Record<string, Array<{ from: string, to: string, nightly: number|null, minNights: number|null }>>} rateRangesByProp
 */
export function getEffectiveRateForDate(ymd, propertyId, base, rateRangesByProp) {
  const ranges = rateRangesByProp[String(propertyId)] || []
  let nightly = base.nightly
  let minNights = base.minNights
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i]
    if (ymd >= r.from && ymd <= r.to) {
      if (r.nightly != null) nightly = r.nightly
      if (r.minNights != null) minNights = r.minNights
      break
    }
  }
  return { nightly, minNights }
}

/**
 * Month snapshot for inventory card: sums per-night unit capacity vs booked/blocked days.
 */
export function monthUnitCapacityStats({
  propertyId,
  year,
  monthIndex,
  defaultUnits,
  unitRangesByProp,
  blockedYmds,
  bookings,
}) {
  const dim = new Date(year, monthIndex + 1, 0).getDate()
  const list = bookings.filter(b => String(b.propertyId) === String(propertyId))
  let capacity = 0
  let bookedDays = 0
  let blockedDays = 0
  for (let day = 1; day <= dim; day++) {
    const ymd = toYMD(new Date(year, monthIndex, day))
    const u = getUnitsForDate(ymd, propertyId, defaultUnits, unitRangesByProp)
    capacity += u
    if (blockedYmds?.includes(ymd)) blockedDays += 1
    if (bookingForDay(ymd, list)) bookedDays += 1
  }
  const open = Math.max(0, capacity - bookedDays - blockedDays)
  return { capacity, bookedDays, blockedDays, open, dim }
}