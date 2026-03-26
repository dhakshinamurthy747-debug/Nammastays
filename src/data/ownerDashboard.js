/**
 * Owner portal calendar helpers (date math, night occupancy).
 * checkOut is exclusive (guest departs that calendar morning).
 */

export function toYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Guest stays on night of ymd if ymd >= checkIn and ymd < checkOut */
export function ymdInStay(ymd, checkIn, checkOut) {
  return ymd >= checkIn && ymd < checkOut
}

export function bookingForDay(ymd, bookings) {
  return bookings.find(b => ymdInStay(ymd, b.checkIn, b.checkOut))
}

/** Guest-nights in calendar month for one listing (each booked calendar day counts once). */
export function bookedDaysInMonthForProperty(bookings, propertyId, year, monthIndex) {
  const dim = new Date(year, monthIndex + 1, 0).getDate()
  const list = bookings.filter(b => b.propertyId === propertyId)
  let n = 0
  for (let d = 1; d <= dim; d++) {
    const ymd = toYMD(new Date(year, monthIndex, d))
    if (bookingForDay(ymd, list)) n++
  }
  return n
}

export function countBlockedInMonth(blockedYmds, year, monthIndex) {
  if (!blockedYmds?.length) return 0
  const p = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`
  return blockedYmds.filter(ymd => ymd.startsWith(p)).length
}
