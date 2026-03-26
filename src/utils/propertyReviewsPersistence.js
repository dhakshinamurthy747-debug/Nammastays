import { STORAGE_KEYS } from './constants'
import { loadJson, saveJson } from './storage'

/**
 * @typedef {{ id: string, propertyId: number, bookingId: number|string, guestEmail: string, rating: number, comment: string, createdAt: string }} PropertyReview
 */

/** @returns {PropertyReview[]} */
export function loadPropertyReviews() {
  const raw = loadJson(STORAGE_KEYS.PROPERTY_REVIEWS, [])
  return Array.isArray(raw) ? raw : []
}

/** @param {PropertyReview[]} list */
export function savePropertyReviews(list) {
  try {
    saveJson(STORAGE_KEYS.PROPERTY_REVIEWS, list)
  } catch {
    /* ignore */
  }
}

/** @param {Record<string, unknown>} row */
export function addPropertyReview(row) {
  const list = loadPropertyReviews()
  const id = `rv-${Date.now()}`
  const entry = {
    id,
    propertyId: Number(row.propertyId),
    bookingId: row.bookingId,
    guestEmail: String(row.guestEmail || ''),
    rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 0))),
    comment: String(row.comment || '').trim(),
    createdAt: new Date().toISOString(),
  }
  const next = [...list, entry]
  savePropertyReviews(next)
  return next
}

/** @param {number} propertyId — only approved reviews (and legacy rows with no moderation flag) affect the public score */
export function aggregateReviewsForProperty(entries, propertyId) {
  const pid = Number(propertyId)
  const rows = entries.filter(
    r =>
      Number(r.propertyId) === pid &&
      r.moderationStatus !== 'rejected' &&
      (r.moderationStatus === 'approved' ||
        r.moderationStatus == null ||
        r.moderationStatus === undefined)
  )
  if (!rows.length) return null
  const sum = rows.reduce((s, r) => s + (Number(r.rating) || 0), 0)
  return {
    count: rows.length,
    rating: Math.round((sum / rows.length) * 10) / 10,
  }
}
