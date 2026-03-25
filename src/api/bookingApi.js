import { STORAGE_KEYS } from '../utils/constants'
import { loadJson, saveJson } from '../utils/storage'

export function loadBookings() {
  const parsed = loadJson(STORAGE_KEYS.BOOKINGS, [])
  return Array.isArray(parsed) ? parsed : []
}

export function persistBookings(list) {
  saveJson(STORAGE_KEYS.BOOKINGS, list)
}

export function normalizeBookingRow(booking) {
  const reference =
    booking.reference || `NS-${Date.now().toString(36).toUpperCase().slice(-10)}`
  return {
    ...booking,
    id: booking.id ?? Date.now(),
    status: booking.status || 'confirmed',
    reference,
    createdAt: booking.createdAt ?? new Date().toISOString(),
  }
}
