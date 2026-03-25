import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { properties as staticProperties } from '../data/properties'
import { setApprovedCatalogRows } from '../data/catalogStore'
import { STORAGE_KEYS } from '../utils/constants'
import { loadJson, saveJson, loadAuthSession, saveAuthSession, clearAuthSession } from '../utils/storage'
import { loadBookings, persistBookings, normalizeBookingRow } from '../api/bookingApi'
import { reconcileLiveCatalog } from '../utils/hostListingCatalog'
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
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, duration = 3000) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  const approvedCatalogRows = useMemo(
    () => reconcileLiveCatalog(hostListingsByEmail),
    [hostListingsByEmail]
  )

  const mergedCatalogProperties = useMemo(
    () => [...staticProperties, ...approvedCatalogRows],
    [approvedCatalogRows]
  )

  setApprovedCatalogRows(approvedCatalogRows)

  const login = useCallback(userData => {
    let joinedAt = userData.joinedAt
    try {
      const all = loadJson(STORAGE_KEYS.USER_META, {})
      const prev = all[userData.email]
      if (!joinedAt) joinedAt = prev?.joinedAt || new Date().toISOString()
      const phone =
        userData.phone != null && String(userData.phone).trim() !== ''
          ? String(userData.phone).trim()
          : prev?.phone
      all[userData.email] = { ...prev, joinedAt, name: userData.name, role: userData.role, phone }
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

  const addBooking = useCallback(booking => {
    const row = normalizeBookingRow(booking)
    setBookings(prev => {
      const next = [...prev, row]
      persistBookings(next)
      return next
    })
  }, [])

  const value = {
    user,
    login,
    logout,
    bookings,
    addBooking,
    hostListingsByEmail,
    registerHostListing,
    updateHostListingAdminDecision,
    mergedCatalogProperties,
    approvedCatalogRows,
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
