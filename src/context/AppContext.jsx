import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { properties as staticProperties } from '../data/properties'
import { setApprovedCatalogRows, setHostOperationsCatalogSnapshot } from '../data/catalogStore'
import { STORAGE_KEYS } from '../utils/constants'
import { loadJson, saveJson, loadAuthSession, saveAuthSession, clearAuthSession } from '../utils/storage'
import { loadBookings, persistBookings, normalizeBookingRow } from '../api/bookingApi'
import { reconcileLiveCatalog } from '../utils/hostListingCatalog'
import { attachHostOperationsToProperty } from '../utils/hostCatalogMerge'
import { loadHostOperations, saveHostOperations } from '../utils/hostOperationsPersistence'
import { loadHostPromotions, saveHostPromotions } from '../utils/hostPromotionsPersistence'
import { loadPropertyReviews, savePropertyReviews, aggregateReviewsForProperty } from '../utils/propertyReviewsPersistence'
import { pushInAppNotification } from '../utils/inAppNotifications'
import { Toast } from '../components/ui/Toast'

const AppContext = createContext(null)

function loadHostListingsByEmail() {
  try {
    const p = loadJson(STORAGE_KEYS.HOST_LISTINGS, {})
    return p && typeof p === 'object' && !Array.isArray(p) ? p : {}
  } catch {
    return {}
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => loadAuthSession())
  const [bookings, setBookings] = useState(loadBookings)
  const [hostListingsByEmail, setHostListingsByEmail] = useState(loadHostListingsByEmail)
  const [hostOperations, setHostOperationsState] = useState(loadHostOperations)
  const [hostPromotions, setHostPromotionsState] = useState(loadHostPromotions)
  const [propertyReviewEntries, setPropertyReviewEntries] = useState(loadPropertyReviews)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const sync = () => {
      setPropertyReviewEntries(loadPropertyReviews())
      setHostPromotionsState(loadHostPromotions())
    }
    window.addEventListener('ns-platform-settings', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('ns-platform-settings', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const showToast = useCallback((msg, duration = 3000) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  const approvedCatalogRows = useMemo(
    () => reconcileLiveCatalog(hostListingsByEmail),
    [hostListingsByEmail]
  )

  const mergedCatalogProperties = useMemo(
    () =>
      [...staticProperties, ...approvedCatalogRows].map(p => {
        let row = attachHostOperationsToProperty(p, hostOperations)
        const agg = aggregateReviewsForProperty(propertyReviewEntries, p.id)
        if (agg && agg.count > 0) {
          row = { ...row, rating: agg.rating, reviews: agg.count }
        }
        return row
      }),
    [approvedCatalogRows, hostOperations, propertyReviewEntries]
  )

  const setHostOperations = useCallback(updater => {
    setHostOperationsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      saveHostOperations(next)
      return next
    })
  }, [])

  setApprovedCatalogRows(approvedCatalogRows)
  setHostOperationsCatalogSnapshot(hostOperations)

  const login = useCallback(userData => {
    let joinedAt = userData.joinedAt
    const emailKey = String(userData.email || '')
      .trim()
      .toLowerCase()
    try {
      const all = loadJson(STORAGE_KEYS.USER_META, {})
      const prev = all[emailKey] || {}
      if (!joinedAt) joinedAt = prev.joinedAt || new Date().toISOString()
      const phone =
        userData.phone != null && String(userData.phone).trim() !== ''
          ? String(userData.phone).trim()
          : prev.phone
      all[emailKey] = {
        ...prev,
        joinedAt,
        name: userData.name,
        role: userData.role,
        phone,
        kycTier: prev.kycTier || 'none',
        suspended: prev.suspended === true,
      }
      saveJson(STORAGE_KEYS.USER_META, all)
    } catch {
      joinedAt = joinedAt || new Date().toISOString()
    }
    const session = { ...userData, joinedAt }
    setUser(session)
    saveAuthSession(session)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    clearAuthSession()
  }, [])

  const registerHostListing = useCallback((email, data) => {
    const key = String(email || '')
      .trim()
      .toLowerCase()
    if (!key) return
    const listing = {
      id: Date.now(),
      submittedAt: new Date().toISOString(),
      status: 'review',
      adminDecision: null,
      ...data,
    }
    setHostListingsByEmail(prev => {
      const next = { ...prev, [key]: [...(prev[key] || []), listing] }
      try {
        saveJson(STORAGE_KEYS.HOST_LISTINGS, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const updateHostListingAdminDecision = useCallback((email, listingId, decision) => {
    const key = String(email || '')
      .trim()
      .toLowerCase()
    if (!key) return
    setHostListingsByEmail(prev => {
      const list = prev[key] || []
      const nextList = list.map(l =>
        l.id === listingId ? { ...l, adminDecision: decision } : l
      )
      const next = { ...prev, [key]: nextList }
      try {
        saveJson(STORAGE_KEYS.HOST_LISTINGS, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const setHostPromotions = useCallback(updater => {
    setHostPromotionsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (!Array.isArray(next)) return prev
      saveHostPromotions(next)
      return next
    })
  }, [])

  const addBooking = useCallback(booking => {
    const row = normalizeBookingRow(booking)
    setBookings(prev => {
      const next = [...prev, row]
      persistBookings(next)
      return next
    })
    try {
      pushInAppNotification({
        title: 'Booking confirmed',
        body: `${row.property || 'Stay'} · ₹${Number(row.total || 0).toLocaleString('en-IN')}`,
        href: '/bookings',
        recipientEmail: row.guestEmail,
      })
      window.dispatchEvent(new Event('ns-notifications'))
    } catch {
      /* ignore */
    }
  }, [])

  const patchBooking = useCallback((bookingId, patch) => {
    setBookings(prev => {
      const next = prev.map(b =>
        String(b.id) === String(bookingId) || b.reference === bookingId ? { ...b, ...patch } : b
      )
      persistBookings(next)
      return next
    })
  }, [])

  const addPropertyReview = useCallback(entry => {
    const list = loadPropertyReviews()
    const id = `rv-${Date.now()}`
    const guestKey = String(entry.guestEmail || '')
      .trim()
      .toLowerCase()
    const row = {
      id,
      propertyId: Number(entry.propertyId),
      bookingId: entry.bookingId,
      guestEmail: guestKey,
      rating: Math.min(5, Math.max(1, Math.round(Number(entry.rating) || 0))),
      comment: String(entry.comment || '').trim(),
      createdAt: new Date().toISOString(),
      moderationStatus: 'pending',
    }
    const dupe = list.some(
      r =>
        String(r.bookingId) === String(row.bookingId) &&
        String(r.guestEmail || '')
          .trim()
          .toLowerCase() === guestKey
    )
    if (dupe) return { ok: false, reason: 'already_reviewed' }
    const next = [...list, row]
    savePropertyReviews(next)
    setPropertyReviewEntries(next)
    return { ok: true, review: row }
  }, [])

  const moderatePropertyReview = useCallback((reviewId, status) => {
    const list = loadPropertyReviews().map(r =>
      r.id === reviewId ? { ...r, moderationStatus: status } : r
    )
    savePropertyReviews(list)
    setPropertyReviewEntries(list)
  }, [])

  const value = {
    user,
    login,
    logout,
    bookings,
    addBooking,
    patchBooking,
    hostListingsByEmail,
    registerHostListing,
    updateHostListingAdminDecision,
    mergedCatalogProperties,
    approvedCatalogRows,
    hostOperations,
    setHostOperations,
    hostPromotions,
    setHostPromotions,
    propertyReviewEntries,
    addPropertyReview,
    moderatePropertyReview,
    toast,
    showToast,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      <Toast message={toast} />
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
