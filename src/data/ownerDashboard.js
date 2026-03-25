/**
 * Demo reservations for the owner portal (anchored to “today” so the calendar always shows relevant nights).
 * checkOut is exclusive (guest departs that morning).
 */
export function getDemoOwnerBookings() {
  const n = new Date()
  const y = n.getFullYear()
  const m = n.getMonth()
  const o = (year, month, day) => toYMD(new Date(year, month, day))
  return [
    {
      id: 'b1',
      propertyId: 101,
      propertyName: 'The Cliff House',
      guest: 'Charlotte M.',
      email: 'charlotte@example.com',
      checkIn: o(y, m - 1, 10),
      checkOut: o(y, m - 1, 16),
      nights: 6,
      total: 582000,
      status: 'completed',
    },
    {
      id: 'b2',
      propertyId: 101,
      propertyName: 'The Cliff House',
      guest: 'James R.',
      email: 'james@example.com',
      checkIn: o(y, m, 14),
      checkOut: o(y, m, 21),
      nights: 7,
      total: 679000,
      status: 'upcoming',
    },
    {
      id: 'b3',
      propertyId: 101,
      propertyName: 'The Cliff House',
      guest: 'Priya S.',
      email: 'priya@example.com',
      checkIn: o(y, m + 1, 2),
      checkOut: o(y, m + 1, 6),
      nights: 4,
      total: 388000,
      status: 'upcoming',
    },
    {
      id: 'b4',
      propertyId: 102,
      propertyName: 'Desert Fortress',
      guest: 'Alex T.',
      email: 'alex@example.com',
      checkIn: o(y, m + 2, 1),
      checkOut: o(y, m + 2, 5),
      nights: 4,
      total: 420000,
      status: 'upcoming',
    },
  ]
}

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
