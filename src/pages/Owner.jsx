import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp,
  Calendar,
  Star,
  Home,
  Plus,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Mail,
  Clock,
  Layers,
  Tag,
  Percent,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ownerProperties } from '../data/properties'
import { toYMD, bookingForDay } from '../data/ownerDashboard'
import {
  buildNightlyPricesForStay,
  validateStayAvailability,
} from '../utils/hostCatalogMerge'
import { computeGuestBookingBreakdown, sumGuestLifetimeSpend } from '../utils/guestPricing'
import { getPlatformCommissionRate } from '../utils/platformSettings'
import {
  getEffectiveRateForDate,
  monthUnitCapacityStats,
} from '../utils/ownerBulkScheduling'
import { buildIcsForStays, downloadIcs } from '../utils/icalExport'
import { datesFromIcsAllDay } from '../utils/icalImport'
import { loadHostMessages, appendHostMessage, markHostMessagesReadForUser } from '../utils/hostMessagesPersistence'
import { pushInAppNotification } from '../utils/inAppNotifications'
import Footer from '../components/Footer'
import styles from './Owner.module.css'

const TABS = [
  'Overview',
  'Inbox',
  'Applications',
  'Properties',
  'Calendar',
  'Inventory',
  'Rates & promos',
  'Bookings',
  'Earnings',
  'Settings',
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildMonthGrid(year, monthIndex) {
  const first = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const pad = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < pad; i++) {
    cells.push({ type: 'pad', key: `pad-${i}` })
  }
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, monthIndex, d)
    cells.push({ type: 'day', date, key: `day-${d}` })
  }
  return cells
}

function bookingsOverlappingMonth(bookings, year, monthIndex) {
  const monthStart = toYMD(new Date(year, monthIndex, 1))
  const monthEnd = toYMD(new Date(year, monthIndex + 1, 0))
  return bookings.filter(b => b.checkIn <= monthEnd && b.checkOut > monthStart)
}

function parseSubmittedPrice(raw) {
  if (raw == null || raw === '') return 0
  const n = Number(String(raw).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function maskBankAcct(n) {
  const s = String(n ?? '').replace(/\D/g, '')
  if (!s) return '—'
  return `••••${s.slice(-4)}`
}

function maskPanOwner(p) {
  const s = String(p ?? '')
    .toUpperCase()
    .replace(/\s/g, '')
  if (s.length !== 10) return p ? '••••••••••' : '—'
  return `${s.slice(0, 2)}••••${s.slice(8)}`
}

function applicationDecisionLabel(adminDecision) {
  if (adminDecision === 'approved') return { text: 'Approved', kind: 'ok' }
  if (adminDecision === 'rejected') return { text: 'Not approved', kind: 'no' }
  return { text: 'Under review', kind: 'pending' }
}

export default function Owner() {
  const {
    user,
    showToast,
    hostListingsByEmail,
    mergedCatalogProperties,
    hostOperations,
    setHostOperations,
    bookings,
    hostPromotions,
    setHostPromotions,
    patchBooking,
  } = useApp()
  const promos = hostPromotions
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [inboxMessages, setInboxMessages] = useState(() => loadHostMessages())
  const [inboxReply, setInboxReply] = useState('')
  const [inboxThreadKey, setInboxThreadKey] = useState(null)
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [calPropertyId, setCalPropertyId] = useState('all')
  const icsImportRef = useRef(null)
  const [calCompose, setCalCompose] = useState(null)
  const [calComposeBody, setCalComposeBody] = useState('')
  const ownerRates = hostOperations.ownerRates
  const setOwnerRates = fn =>
    setHostOperations(p => ({ ...p, ownerRates: typeof fn === 'function' ? fn(p.ownerRates) : fn }))
  const inventoryUnits = hostOperations.inventoryUnits
  const setInventoryUnits = fn =>
    setHostOperations(p => ({
      ...p,
      inventoryUnits: typeof fn === 'function' ? fn(p.inventoryUnits) : fn,
    }))
  const blockedByProp = hostOperations.blockedByProp
  const setBlockedByProp = fn =>
    setHostOperations(p => ({
      ...p,
      blockedByProp: typeof fn === 'function' ? fn(p.blockedByProp) : fn,
    }))
  const unitRangesByProp = hostOperations.unitRangesByProp
  const setUnitRangesByProp = fn =>
    setHostOperations(p => ({
      ...p,
      unitRangesByProp: typeof fn === 'function' ? fn(p.unitRangesByProp) : fn,
    }))
  const rateRangesByProp = hostOperations.rateRangesByProp
  const setRateRangesByProp = fn =>
    setHostOperations(p => ({
      ...p,
      rateRangesByProp: typeof fn === 'function' ? fn(p.rateRangesByProp) : fn,
    }))
  const [bulkUnits, setBulkUnits] = useState({ from: '', to: '', units: '2' })
  const [bulkTargetsUnits, setBulkTargetsUnits] = useState({})
  const [bulkRateForm, setBulkRateForm] = useState({
    from: '',
    to: '',
    nightly: '',
    minNights: '',
    applyNightly: true,
    applyMin: true,
  })
  const [bulkTargetsRate, setBulkTargetsRate] = useState({})
  const [promoForm, setPromoForm] = useState({ propertyId: '', title: '', discountPct: '', code: '' })
  const [expandedApplicationId, setExpandedApplicationId] = useState(null)

  const userEmail = user?.email?.toLowerCase?.() || ''
  const submittedRaw = hostListingsByEmail[userEmail]
  const myListingCount = submittedRaw?.length || 0

  const portfolioProperties = useMemo(() => {
    const fromSubmissions = (submittedRaw || []).map(l => ({
      id: l.id,
      name: l.propertyName,
      location: l.location,
      status: l.status || 'review',
      bookings: 0,
      revenue: 0,
      rating: null,
      submittedPrice: parseSubmittedPrice(l.pricePerNight),
      adminDecision: l.adminDecision || null,
      submission: l,
    }))
    if (user?.role === 'owner') {
      return [...ownerProperties.map(p => ({ ...p, submittedPrice: 0, submission: null })), ...fromSubmissions]
    }
    return fromSubmissions
  }, [user?.role, submittedRaw])

  useEffect(() => {
    setHostOperations(prev => {
      let changed = false
      const next = {
        ...prev,
        ownerRates: { ...prev.ownerRates },
        inventoryUnits: { ...prev.inventoryUnits },
        blockedByProp: { ...prev.blockedByProp },
      }
      portfolioProperties.forEach(p => {
        const hasRate =
          next.ownerRates[p.id] !== undefined || next.ownerRates[String(p.id)] !== undefined
        if (!hasRate) {
          let nightly = p.submittedPrice || 25000
          if (p.id === 101) nightly = 85000
          else if (p.id === 102) nightly = 62000
          next.ownerRates[p.id] = { nightly, minNights: p.id === 102 ? 3 : 2 }
          changed = true
        }
        if (next.inventoryUnits[p.id] === undefined && next.inventoryUnits[String(p.id)] === undefined) {
          next.inventoryUnits[p.id] = 1
          changed = true
        }
        if (next.blockedByProp[p.id] === undefined && next.blockedByProp[String(p.id)] === undefined) {
          next.blockedByProp[p.id] = []
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [portfolioProperties, setHostOperations])

  useEffect(() => {
    if (portfolioProperties.length === 0) return
    setPromoForm(f => {
      const ok = f.propertyId && portfolioProperties.some(p => p.id === f.propertyId)
      if (ok) return f
      return { ...f, propertyId: portfolioProperties[0].id }
    })
  }, [portfolioProperties])

  useEffect(() => {
    setBulkTargetsUnits(prev => {
      const n = { ...prev }
      portfolioProperties.forEach(p => {
        if (n[p.id] === undefined) n[p.id] = true
      })
      Object.keys(n).forEach(k => {
        if (!portfolioProperties.some(p => String(p.id) === k)) delete n[k]
      })
      return n
    })
    setBulkTargetsRate(prev => {
      const n = { ...prev }
      portfolioProperties.forEach(p => {
        if (n[p.id] === undefined) n[p.id] = true
      })
      Object.keys(n).forEach(k => {
        if (!portfolioProperties.some(p => String(p.id) === k)) delete n[k]
      })
      return n
    })
  }, [portfolioProperties])

  const portfolioIds = useMemo(() => new Set(portfolioProperties.map(p => p.id)), [portfolioProperties])
  const portfolioLiveBookings = useMemo(
    () => bookings.filter(b => portfolioIds.has(Number(b.propertyId))),
    [bookings, portfolioIds]
  )
  const combinedPortfolioBookings = useMemo(() => {
    return portfolioLiveBookings.map(b => ({
      id: `live-${b.id}`,
      bookingId: b.id,
      propertyId: b.propertyId,
      propertyName: b.property,
      guest: (b.guestEmail || 'Guest').split('@')[0],
      email: b.guestEmail,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      nights: b.nights,
      total: b.total,
      status: b.status || 'confirmed',
      hostNet: b.hostNetOnRoom ?? b.hostPayoutAmount,
      settlementStatus: b.settlementStatus,
      source: 'live',
      modificationRequest: b.modificationRequest,
      refundRequest: b.refundRequest,
    }))
  }, [portfolioLiveBookings])

  const bookingsForFilter = useMemo(() => {
    if (calPropertyId === 'all') return combinedPortfolioBookings
    return combinedPortfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
  }, [calPropertyId, combinedPortfolioBookings])

  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const monthLabel = calMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const calendarCells = useMemo(() => buildMonthGrid(calYear, calMonthIdx), [calYear, calMonthIdx])

  const bookingsInViewMonth = useMemo(
    () => bookingsOverlappingMonth(bookingsForFilter, calYear, calMonthIdx),
    [bookingsForFilter, calYear, calMonthIdx]
  )

  const approveGuestDateChange = useCallback(
    b => {
      const req = b.modificationRequest
      if (!req?.proposedCheckIn || b.bookingId == null) return
      const prop = mergedCatalogProperties.find(p => String(p.id) === String(b.propertyId))
      if (!prop) {
        showToast('Listing not found.')
        return
      }
      const others = bookings.filter(x => String(x.id) !== String(b.bookingId))
      const avail = validateStayAvailability(prop, req.proposedCheckIn, req.proposedCheckOut, others)
      if (!avail.ok) {
        showToast(avail.message)
        return
      }
      const nights = Math.max(
        0,
        Math.round(
          (new Date(`${req.proposedCheckOut}T12:00:00`) - new Date(`${req.proposedCheckIn}T12:00:00`)) /
            86400000
        )
      )
      const guestEmail = b.email || b.guestEmail
      const life = sumGuestLifetimeSpend(
        bookings.filter(x => String(x.id) !== String(b.bookingId)),
        guestEmail
      )
      const { nightlyPrices } = buildNightlyPricesForStay(prop, req.proposedCheckIn, req.proposedCheckOut)
      const row = bookings.find(x => String(x.id) === String(b.bookingId))
      const promoPct = Number(row?.promoDiscountPct) || 0
      const p = computeGuestBookingBreakdown({
        nightlyPrices,
        lifetimeSpendBefore: life,
        platformCommissionRate: getPlatformCommissionRate(),
        promoDiscountPct: promoPct,
      })
      patchBooking(b.bookingId, {
        checkIn: req.proposedCheckIn,
        checkOut: req.proposedCheckOut,
        nights,
        total: p.grandTotal,
        roomSubtotal: p.roomSubtotal,
        roomSubtotalBeforePromo: p.roomSubtotalBeforePromo,
        promoDiscountAmount: p.promoDiscountAmount,
        gstAmount: p.gstAmount,
        gstPercentLabel: p.gstPercentLabel,
        serviceFeeAmount: p.serviceFeeAmount,
        serviceFeePercentLabel: p.serviceFeePercentLabel,
        hostCommission: p.hostCommissionAmount,
        hostNetOnRoom: p.hostNetOnRoom,
        hostPayoutAmount: p.hostNetOnRoom,
        platformFeeAmount: p.hostCommissionAmount,
        nightlyPrices: p.nightlyPrices,
        modificationRequest: null,
      })
      if (guestEmail) {
        try {
          pushInAppNotification({
            title: 'Stay dates updated',
            body: `${b.propertyName || 'Your stay'} · ${req.proposedCheckIn} → ${req.proposedCheckOut}. New total ₹${p.grandTotal.toLocaleString('en-IN')}.`,
            href: '/bookings',
            recipientEmail: guestEmail,
          })
          window.dispatchEvent(new Event('ns-notifications'))
        } catch {
          /* ignore */
        }
      }
      showToast('Dates updated — guest totals recalculated.')
    },
    [bookings, mergedCatalogProperties, patchBooking, showToast]
  )

  const exportHostIcs = useCallback(() => {
    const stays = portfolioLiveBookings
      .filter(x => x.status !== 'cancelled' && x.status !== 'refunded')
      .map(x => ({
        property: x.property || 'Stay',
        checkIn: x.checkIn,
        checkOut: x.checkOut,
        reference: String(x.reference || x.id),
      }))
    if (!stays.length) {
      showToast('No active stays to export.')
      return
    }
    downloadIcs('nammastays-host.ics', buildIcsForStays(stays, 'NammaStays host'))
    showToast('Downloaded .ics — import into Google Calendar or Apple Calendar.')
  }, [portfolioLiveBookings, showToast])

  const mergeIcsBlockedDates = useCallback(
    (propertyKey, ymds) => {
      if (!ymds.length) return
      setBlockedByProp(prev => {
        const sk = String(propertyKey)
        const cur = [...(prev[propertyKey] || prev[sk] || [])]
        const nextSet = new Set(cur)
        ymds.forEach(d => nextSet.add(d))
        return { ...prev, [sk]: [...nextSet].sort() }
      })
      showToast(`Blocked ${ymds.length} night(s) from imported calendar.`)
    },
    [setBlockedByProp, showToast]
  )

  const onIcsImportChange = e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (calPropertyId === 'all') {
      showToast('Select one property first, then import.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const dates = datesFromIcsAllDay(String(reader.result || ''))
        if (!dates.length) {
          showToast('No all-day stays found in that file.')
          return
        }
        mergeIcsBlockedDates(calPropertyId, dates)
      } catch {
        showToast('Could not read that calendar file.')
      }
    }
    reader.readAsText(f)
  }

  useEffect(() => {
    const r = () => setInboxMessages(loadHostMessages())
    window.addEventListener('ns-host-messages', r)
    return () => window.removeEventListener('ns-host-messages', r)
  }, [])

  useEffect(() => {
    if (tab === 'Inbox' && user?.email) markHostMessagesReadForUser(user.email)
  }, [tab, user?.email])

  const inboxThreads = useMemo(() => {
    const my = String(user?.email || '')
      .trim()
      .toLowerCase()
    if (!my) return []
    const relevant = inboxMessages.filter(m => m.toEmail === my || m.fromEmail === my)
    const map = {}
    relevant.forEach(m => {
      map[m.threadKey] = map[m.threadKey] || []
      map[m.threadKey].push(m)
    })
    return Object.entries(map)
      .map(([key, msgs]) => ({
        key,
        msgs: [...msgs].sort((a, b) => String(a.at).localeCompare(String(b.at))),
      }))
      .sort((a, b) => String(b.msgs[b.msgs.length - 1]?.at).localeCompare(String(a.msgs[a.msgs.length - 1]?.at)))
  }, [inboxMessages, user?.email])

  const [mediaPickId, setMediaPickId] = useState(null)
  const [galleryDraft, setGalleryDraft] = useState('')
  const [polCancelDraft, setPolCancelDraft] = useState('')
  const [polRulesDraft, setPolRulesDraft] = useState('')
  const [attLabelDraft, setAttLabelDraft] = useState('')
  const [attUrlDraft, setAttUrlDraft] = useState('')
  const [cohostDraft, setCohostDraft] = useState('')

  useEffect(() => {
    if (!mediaPickId && portfolioProperties[0]) setMediaPickId(portfolioProperties[0].id)
  }, [portfolioProperties, mediaPickId])

  useEffect(() => {
    if (!mediaPickId) return
    const sk = String(mediaPickId)
    const urls = hostOperations.listingCdnGallery[sk]?.urls || []
    setGalleryDraft(urls.join('\n'))
    const pol = hostOperations.listingPolicies[sk] || {}
    setPolCancelDraft(pol.cancellationText || '')
    setPolRulesDraft(pol.houseRulesText || '')
    const a0 = pol.attachments?.[0]
    setAttLabelDraft(a0?.label || '')
    setAttUrlDraft(a0?.url || '')
    const co = hostOperations.coHostsByProperty[sk] || []
    setCohostDraft(co.map(c => c.email).join(', '))
  }, [mediaPickId, hostOperations])

  const saveListingTrust = () => {
    if (!mediaPickId) return
    const sk = String(mediaPickId)
    const urls = galleryDraft.split('\n').map(s => s.trim()).filter(Boolean)
    const coList = cohostDraft
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(email => ({ email, role: 'editor' }))
    setHostOperations(h => ({
      ...h,
      listingCdnGallery: { ...h.listingCdnGallery, [sk]: { urls } },
      listingPolicies: {
        ...h.listingPolicies,
        [sk]: {
          cancellationText: polCancelDraft.trim(),
          houseRulesText: polRulesDraft.trim(),
          attachments:
            attUrlDraft.trim() ? [{ label: attLabelDraft.trim() || 'Policy PDF', url: attUrlDraft.trim() }] : [],
        },
      },
      coHostsByProperty: { ...h.coHostsByProperty, [sk]: coList },
    }))
    showToast('Listing media, policies & co-hosts saved.')
  }

  const visiblePromos = useMemo(
    () => promos.filter(pr => portfolioIds.has(pr.propertyId)),
    [promos, portfolioIds]
  )

  const applyBulkUnits = () => {
    const { from, to } = bulkUnits
    const u = Math.max(1, Math.min(20, Number(bulkUnits.units) || 1))
    if (!from || !to || from > to) {
      showToast('Pick a valid date range (start → end).')
      return
    }
    const targets = portfolioProperties.filter(p => bulkTargetsUnits[p.id] !== false).map(p => p.id)
    if (!targets.length) {
      showToast('Select at least one listing.')
      return
    }
    const rid = `ur-${Date.now()}`
    setUnitRangesByProp(prev => {
      const next = { ...prev }
      targets.forEach(pid => {
        const k = String(pid)
        next[k] = [...(next[k] || []), { id: rid, from, to, units: u }]
      })
      return next
    })
    showToast(`Units ${u} applied to ${targets.length} listing(s) for ${from} – ${to}.`)
  }

  const applyBulkRates = () => {
    const { from, to, applyNightly, applyMin, nightly, minNights } = bulkRateForm
    if (!from || !to || from > to) {
      showToast('Pick a valid date range (start → end).')
      return
    }
    if (!applyNightly && !applyMin) {
      showToast('Enable nightly rate and/or minimum nights.')
      return
    }
    const n = applyNightly ? Math.max(1000, Number(nightly) || 0) : null
    if (applyNightly && !n) {
      showToast('Enter a nightly amount (₹).')
      return
    }
    const m = applyMin ? Math.max(1, Math.min(30, Number(minNights) || 1)) : null
    if (applyMin && !m) {
      showToast('Enter minimum nights.')
      return
    }
    const targets = portfolioProperties.filter(p => bulkTargetsRate[p.id] !== false).map(p => p.id)
    if (!targets.length) {
      showToast('Select at least one listing.')
      return
    }
    const rid = `rr-${Date.now()}`
    setRateRangesByProp(prev => {
      const next = { ...prev }
      targets.forEach(pid => {
        const k = String(pid)
        next[k] = [...(next[k] || []), { id: rid, from, to, nightly: n, minNights: m }]
      })
      return next
    })
    const bits = [applyNightly && `₹${n?.toLocaleString('en-IN')}`, applyMin && `min ${m} nights`].filter(Boolean)
    showToast(`Rate rule applied (${bits.join(' · ')}) for ${targets.length} listing(s), ${from} – ${to}.`)
  }

  const removeUnitRange = (propertyId, rangeId) => {
    const k = String(propertyId)
    setUnitRangesByProp(prev => ({
      ...prev,
      [k]: (prev[k] || []).filter(r => r.id !== rangeId),
    }))
  }

  const removeRateRange = (propertyId, rangeId) => {
    const k = String(propertyId)
    setRateRangesByProp(prev => ({
      ...prev,
      [k]: (prev[k] || []).filter(r => r.id !== rangeId),
    }))
  }

  const canAccessHosting = Boolean(user && (user.role === 'owner' || myListingCount > 0))

  if (!user) {
    return (
      <div className={styles.gate}>
        <h2 className={styles.gateTitle}>Sign in to manage hosting</h2>
        <p className={styles.gateSub}>Log in to see properties you&apos;ve listed or to open your owner dashboard.</p>
        <div className={styles.gateActions}>
          <button type="button" className="btn-gold" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button type="button" className="btn-outline" onClick={() => navigate('/signup')}>
            Join
          </button>
        </div>
      </div>
    )
  }

  if (!canAccessHosting) {
    return (
      <div className={styles.gate}>
        <h2 className={styles.gateTitle}>No listings yet</h2>
        <p className={styles.gateSub}>
          Submit a property to get hosting tools here, or sign in with an owner account. Use the same email you used on
          your application.
        </p>
        <div className={styles.gateActions}>
          <button type="button" className="btn-gold" onClick={() => navigate('/list')}>
            List a property
          </button>
          <button type="button" className="btn-outline" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const shiftMonth = delta => {
    setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + delta, 1))
  }

  const toggleBlocked = (ymd, propertyId) => {
    const list = [...(blockedByProp[propertyId] || [])]
    const wasBlocked = list.includes(ymd)
    const nextList = wasBlocked ? list.filter(x => x !== ymd) : [...list, ymd]
    setBlockedByProp(prev => ({ ...prev, [propertyId]: nextList }))
    showToast(
      wasBlocked
        ? 'Day opened — guests can book that night again (saved on this device).'
        : 'Day blocked — guests cannot book that night (saved on this device).'
    )
  }

  const handleDayClick = (ymd) => {
    const scopedBookings =
      calPropertyId === 'all'
        ? combinedPortfolioBookings
        : combinedPortfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
    const hit = bookingForDay(ymd, scopedBookings)
    if (hit) {
      showToast(`${hit.guest} · ${hit.checkIn} → ${hit.checkOut} · ${hit.status}`)
      return
    }
    if (calPropertyId === 'all') {
      showToast('Choose a property above to block or open specific dates.')
      return
    }
    toggleBlocked(ymd, Number(calPropertyId))
  }

  const earningsFromLive = useMemo(() => {
    const live = portfolioLiveBookings.filter(b => b.status !== 'cancelled' && b.status !== 'refunded')
    const ytdHostNet = live.reduce((s, b) => s + (Number(b.hostNetOnRoom ?? b.hostPayoutAmount) || 0), 0)
    const pending = live
      .filter(b => (b.settlementStatus || 'pending_settlement') !== 'paid')
      .reduce((s, b) => s + (Number(b.hostNetOnRoom ?? b.hostPayoutAmount) || 0), 0)
    const paid = live
      .filter(b => b.settlementStatus === 'paid')
      .reduce((s, b) => s + (Number(b.hostNetOnRoom ?? b.hostPayoutAmount) || 0), 0)
    return { ytdHostNet, pending, paid, liveCount: live.length }
  }, [portfolioLiveBookings])

  const stats = [
    {
      icon: <Home size={18} />,
      label: 'Properties',
      value: portfolioProperties.length,
      sub: `${portfolioProperties.filter(p => p.status === 'active').length} live`,
    },
    {
      icon: <DollarSign size={18} />,
      label: 'Host room share (YTD)',
      value:
      earningsFromLive.ytdHostNet > 0
        ? `₹${earningsFromLive.ytdHostNet.toLocaleString('en-IN')}`
        : '—',
      sub:
        earningsFromLive.liveCount > 0
          ? 'After platform fee · from guest bookings'
          : 'Shown when you have completed stays',
    },
    {
      icon: <Calendar size={18} />,
      label: 'Bookings',
      value: combinedPortfolioBookings.length,
      sub: 'In your portfolio',
    },
    { icon: <Star size={18} />, label: 'Avg Rating', value: '4.9', sub: 'From guest reviews' },
  ]

  const monthlyEarnings = [
    { month: 'Jan', amount: 0 },
    { month: 'Feb', amount: 9700 },
    { month: 'Mar', amount: 12610 },
    { month: 'Apr', amount: 3880 },
    { month: 'May', amount: 0 },
  ]
  const maxEarning = Math.max(...monthlyEarnings.map(m => m.amount))

  const todayYmd = toYMD(new Date())

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className="section-label">Hosting</div>
          <h1 className={styles.headerTitle}>Welcome back, {user.name}</h1>
          <p className={styles.headerSub}>
            {user.role === 'owner'
              ? 'Availability, bookings, and payouts — manage your NammaStays listings in one place.'
              : 'Properties you submitted appear here. Full owner tools unlock once your listing is approved.'}
          </p>
        </div>
        <button type="button" className="btn-gold" onClick={() => navigate('/list')}>
          <Plus size={14} /> Add Property
        </button>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button type="button" key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'Applications' && (
          <div>
            <p className={styles.appsIntro}>
              Properties you submitted through <strong>List a Property</strong>. Payout &amp; tax details are shown masked —
              full verification is handled by NammaStays. Need changes? Email{' '}
              <a href="mailto:hello@nammastays.com" className={styles.appsMail}>
                hello@nammastays.com
              </a>
              .
            </p>
            {!submittedRaw?.length ? (
              <div className={styles.appsEmpty}>
                <p>You haven&apos;t submitted an application with this account yet.</p>
                <button type="button" className="btn-gold" onClick={() => navigate('/list')}>
                  <Plus size={14} /> List a property
                </button>
              </div>
            ) : (
              <div className={styles.appsList}>
                {submittedRaw.map(l => {
                  const dec = applicationDecisionLabel(l.adminDecision)
                  const open = expandedApplicationId === l.id
                  return (
                    <div key={l.id} className={styles.appCard}>
                      <div className={styles.appCardHead}>
                        <div>
                          <div className={styles.appCardTitle}>{l.propertyName}</div>
                          <div className={styles.appCardMeta}>
                            {l.location}
                            {l.type && ` · ${l.type}`}
                            {l.submittedAt && ` · Submitted ${String(l.submittedAt).slice(0, 10)}`}
                          </div>
                        </div>
                        <div className={`${styles.appDecision} ${styles[`decision-${dec.kind}`]}`}>{dec.text}</div>
                      </div>
                      <div className={styles.appCardSummary}>
                        {l.pricePerNight ? (
                          <span>
                            Suggested rate: <strong>₹{Number(l.pricePerNight).toLocaleString('en-IN')}</strong>/night
                          </span>
                        ) : (
                          <span className={styles.dim}>No rate on file</span>
                        )}
                        {Array.isArray(l.amenities) && l.amenities.length > 0 && (
                          <span className={styles.dim}>{l.amenities.length} amenities selected</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.appToggle}
                        onClick={() => setExpandedApplicationId(open ? null : l.id)}
                        aria-expanded={open}
                      >
                        {open ? (
                          <>
                            Hide details <ChevronUp size={16} />
                          </>
                        ) : (
                          <>
                            View application &amp; KYC <ChevronDown size={16} />
                          </>
                        )}
                      </button>
                      {open && (
                        <div className={styles.appDetail}>
                          <div className={styles.appDetailGrid}>
                            <div>
                              <div className={styles.appDetailHeading}>Your details</div>
                              <p>
                                <strong>{l.ownerName || '—'}</strong>
                              </p>
                              <p className={styles.dim}>Phone: {l.ownerPhone || '—'}</p>
                              <p className={styles.dim}>Email: {user.email}</p>
                              {l.ownerBio && <p className={styles.appBio}>{l.ownerBio}</p>}
                            </div>
                            <div>
                              <div className={styles.appDetailHeading}>Property</div>
                              <p className={styles.dim}>{l.description || '—'}</p>
                              <p className={styles.dim}>
                                Beds {l.bedrooms || '—'} · Baths {l.bathrooms || '—'} · Guests {l.guests || '—'}
                                {l.sqft ? ` · ${l.sqft} sq ft` : ''}
                              </p>
                              {l.specialFeature && (
                                <p>
                                  <em>{l.specialFeature}</em>
                                </p>
                              )}
                              {Array.isArray(l.amenities) && l.amenities.length > 0 && (
                                <p className={styles.appAmenities}>{l.amenities.join(' · ')}</p>
                              )}
                            </div>
                            <div>
                              <div className={styles.appDetailHeading}>Payout &amp; tax (masked)</div>
                              <p>
                                Holder: <strong>{l.bankAccountHolderName || '—'}</strong>
                              </p>
                              <p className={styles.dim}>Bank: {l.bankName || '—'}</p>
                              <p className={styles.dim}>
                                Account: {maskBankAcct(l.bankAccountNumber)} · IFSC:{' '}
                                <span className={styles.mono}>{l.bankIfsc || '—'}</span>
                              </p>
                              <p className={styles.dim}>
                                PAN: <span className={styles.mono}>{maskPanOwner(l.panNumber)}</span>
                                {l.gstin ? (
                                  <>
                                    {' '}
                                    · GSTIN: <span className={styles.mono}>{l.gstin}</span>
                                  </>
                                ) : (
                                  ' · GSTIN: not registered'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'Inbox' && (
          <div>
            <div className={styles.panelTitle} style={{ marginBottom: 16 }}>
              Guest messages
            </div>
            <p className={styles.tabSub} style={{ marginBottom: 24 }}>
              Threads from guests who message you from their dashboard (no email client required). Co-hosts with access
              should sign in using the email you added under listing settings.
            </p>
            <div className={styles.inboxLayout}>
              <div className={styles.inboxList}>
                {inboxThreads.length === 0 ? (
                  <p className={styles.dim}>No messages yet.</p>
                ) : (
                  inboxThreads.map(t => (
                    <button
                      key={t.key}
                      type="button"
                      className={`${styles.inboxThread} ${inboxThreadKey === t.key ? styles.inboxThreadActive : ''}`}
                      onClick={() => setInboxThreadKey(t.key)}
                    >
                      <span className={styles.inboxThreadTitle}>
                        {t.msgs[0]?.propertyName || 'Stay'} · {t.msgs.length} msg
                      </span>
                      <span className={styles.dim} style={{ fontSize: 12 }}>
                        {t.msgs[t.msgs.length - 1]?.body.slice(0, 60)}
                        {(t.msgs[t.msgs.length - 1]?.body.length || 0) > 60 ? '…' : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className={styles.inboxDetail}>
                {!inboxThreadKey ? (
                  <p className={styles.dim}>Select a thread.</p>
                ) : (
                  <>
                    <div className={styles.inboxMsgs}>
                      {inboxThreads
                        .find(t => t.key === inboxThreadKey)
                        ?.msgs.map(m => (
                          <div
                            key={m.id}
                            className={
                              m.fromEmail ===
                              String(user.email || '')
                                .trim()
                                .toLowerCase()
                                ? styles.inboxBubbleHost
                                : styles.inboxBubbleGuest
                            }
                          >
                            <div className={styles.dim} style={{ fontSize: 11 }}>
                              {m.fromEmail} · {new Date(m.at).toLocaleString('en-IN')}
                            </div>
                            {m.body}
                          </div>
                        ))}
                    </div>
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Reply…"
                      value={inboxReply}
                      onChange={e => setInboxReply(e.target.value)}
                      style={{ marginTop: 12 }}
                    />
                    <button
                      type="button"
                      className="btn-gold"
                      style={{ marginTop: 8 }}
                      onClick={() => {
                        const th = inboxThreads.find(t => t.key === inboxThreadKey)
                        if (!th?.msgs.length || !inboxReply.trim()) return
                        const last = th.msgs[th.msgs.length - 1]
                        const peer =
                          last.fromEmail ===
                          String(user.email || '')
                            .trim()
                            .toLowerCase()
                            ? last.toEmail
                            : last.fromEmail
                        appendHostMessage({
                          fromEmail: user.email,
                          toEmail: peer,
                          body: inboxReply.trim(),
                          bookingId: last.bookingId,
                          propertyId: last.propertyId,
                          propertyName: last.propertyName,
                          threadKey: inboxThreadKey,
                        })
                        setInboxReply('')
                        setInboxMessages(loadHostMessages())
                        showToast('Reply sent.')
                      }}
                    >
                      Send reply
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'Overview' && (
          <>
            <div className={styles.statsGrid}>
              {stats.map((s, i) => (
                <div key={i} className={styles.statCard}>
                  <div className={styles.statIcon}>{s.icon}</div>
                  <div className={styles.statValue}>{s.value}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                  <div className={styles.statSub}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className={styles.overviewGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>Upcoming check-ins</div>
                  <button type="button" className={styles.panelLink} onClick={() => setTab('Calendar')}>
                    Open calendar
                  </button>
                </div>
                <div className={styles.bookingList}>
                  {combinedPortfolioBookings
                    .filter(
                      b =>
                        b.status === 'upcoming' ||
                        (b.source === 'live' && b.checkIn >= todayYmd && b.status !== 'cancelled')
                    )
                    .slice(0, 4)
                    .map(b => (
                      <div key={b.id} className={styles.bookingRow}>
                        <div className={styles.bookingGuest}>{b.guest}</div>
                        <div className={styles.bookingProp}>{b.propertyName}</div>
                        <div className={styles.bookingDates}>
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className={`${styles.bookingStatus} ${styles[b.status]}`}>{b.status}</div>
                        <div className={styles.bookingAmount}>₹{b.total.toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                </div>
              </div>
              <div className={styles.panel}>
                <div className={styles.panelTitle}>Quick actions</div>
                <div className={styles.quickActions}>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Inbox')}>
                    <Mail size={16} /> Inbox
                  </button>
                  <button type="button" className={styles.quickAction} onClick={exportHostIcs}>
                    <Calendar size={16} /> Export calendar (.ics)
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Calendar')}>
                    <Calendar size={16} /> Availability & calendar
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Inventory')}>
                    <Layers size={16} /> Inventory check
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Rates & promos')}>
                    <Percent size={16} /> Rates & promotions
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Properties')}>
                    <Home size={16} /> Your properties
                  </button>
                  {myListingCount > 0 && (
                    <button type="button" className={styles.quickAction} onClick={() => setTab('Applications')}>
                      <Mail size={16} /> My applications ({myListingCount})
                    </button>
                  )}
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Bookings')}>
                    <Clock size={16} /> All reservations
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => setTab('Earnings')}>
                    <TrendingUp size={16} /> Earnings
                  </button>
                  <button type="button" className={styles.quickAction} onClick={() => navigate('/list')}>
                    <Plus size={16} /> Submit new property
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'Properties' && (
          <div>
            <div className={styles.panelTitle} style={{ marginBottom: 24 }}>
              Your properties
            </div>
            {portfolioProperties.map(p => (
              <div key={p.id} className={styles.propRow}>
                <div className={styles.propInfo}>
                  <div className={styles.propName}>{p.name}</div>
                  <div className={styles.propLoc}>{p.location}</div>
                  {p.adminDecision === 'approved' && (
                    <div className={styles.adminReviewOk}>Approved by NammaStays — next steps via email</div>
                  )}
                  {p.adminDecision === 'rejected' && (
                    <div className={styles.adminReviewNo}>Not approved — contact concierge if you have questions</div>
                  )}
                </div>
                <div className={styles.propStats}>
                  <div>{p.bookings} bookings</div>
                  <div>₹{(p.revenue ?? 0).toLocaleString('en-IN')} revenue</div>
                  {p.rating && (
                    <div className={styles.propRating}>
                      <Star size={11} fill="var(--gold)" color="var(--gold)" />
                      {p.rating}
                    </div>
                  )}
                </div>
                <div className={`${styles.propStatus} ${p.status === 'active' ? styles.statusLive : styles.statusReview}`}>
                  {p.status === 'active' ? (
                    <>
                      <CheckCircle size={12} /> Live
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} /> Under review
                    </>
                  )}
                </div>
                <div className={styles.propActions}>
                  {p.submission && (
                    <button
                      type="button"
                      className={styles.propKycBtn}
                      title="Application and KYC"
                      onClick={() => {
                        setExpandedApplicationId(p.id)
                        setTab('Applications')
                      }}
                    >
                      Application
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Preview"
                    onClick={() => {
                      if (p.submission && p.submission.adminDecision !== 'approved') {
                        showToast('Live guest preview is available after admin approval.')
                        return
                      }
                      const byId = mergedCatalogProperties.find(
                        c => c.id === p.id || c.submittedListingId === p.id
                      )
                      const match = byId || mergedCatalogProperties.find(c => c.name === p.name)
                      if (match) navigate(`/property/${match.id}`)
                      else showToast('This listing is not in the public catalog yet.')
                    }}
                  >
                    <Eye size={14} />
                  </button>
                  <button type="button" className={styles.iconBtn} title="Edit" onClick={() => showToast('Property editor coming with your dashboard v2.')}>
                    <Edit size={14} />
                  </button>
                  <button type="button" className={styles.iconBtn} title="Calendar" onClick={() => { setCalPropertyId(String(p.id)); setTab('Calendar') }}>
                    <Calendar size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 40, maxWidth: 720, paddingTop: 28, borderTop: '1.5px solid var(--border)' }}>
              <div className={styles.panelTitle} style={{ marginBottom: 12 }}>
                Listing media &amp; policies (CDN URLs)
              </div>
              <p className={styles.tabSub} style={{ marginBottom: 16 }}>
                Use HTTPS image URLs from your CDN or storage. Shown on the public listing. Co-host emails may sign in to
                collaborate (same browser app; use exact addresses).
              </p>
              <div className="form-group">
                <label className="form-label">Property</label>
                <select
                  className="form-input"
                  value={mediaPickId || ''}
                  onChange={e => setMediaPickId(Number(e.target.value))}
                >
                  {portfolioProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gallery image URLs (one per line)</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={galleryDraft}
                  onChange={e => setGalleryDraft(e.target.value)}
                  placeholder="https://cdn.example.com/photo1.jpg"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cancellation policy (guest-visible)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={polCancelDraft}
                  onChange={e => setPolCancelDraft(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">House rules</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={polRulesDraft}
                  onChange={e => setPolRulesDraft(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Attachment label</label>
                  <input className="form-input" value={attLabelDraft} onChange={e => setAttLabelDraft(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Attachment URL (PDF)</label>
                  <input className="form-input" value={attUrlDraft} onChange={e => setAttUrlDraft(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Co-host emails (comma-separated)</label>
                <input
                  className="form-input"
                  value={cohostDraft}
                  onChange={e => setCohostDraft(e.target.value)}
                  placeholder="ops@example.com, finance@example.com"
                />
              </div>
              <button type="button" className="btn-gold" style={{ marginTop: 8 }} onClick={saveListingTrust}>
                Save listing trust settings
              </button>
            </div>
            <button type="button" className="btn-outline" style={{ marginTop: 32 }} onClick={() => navigate('/list')}>
              <Plus size={14} /> Submit another property
            </button>
          </div>
        )}

        {tab === 'Calendar' && (
          <div className={styles.calendarLayout}>
            <div className={styles.calMain}>
              <div className={styles.calToolbar}>
                <div>
                  <h2 className={styles.calHeading}>Availability</h2>
                  <p className={styles.calHint}>
                    Booked nights show in sage. Click an empty day to block or unblock it. Click a booking for details.
                  </p>
                </div>
                <div className={styles.calToolbarRight}>
                  <label className={styles.srOnly} htmlFor="owner-cal-property">
                    Property
                  </label>
                  <select
                    id="owner-cal-property"
                    className={styles.calSelect}
                    value={calPropertyId}
                    onChange={e => setCalPropertyId(e.target.value)}
                  >
                    <option value="all">All properties</option>
                    {portfolioProperties.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.calNav}>
                <button type="button" className={styles.calNavBtn} onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft size={20} />
                </button>
                <span className={styles.calMonthLabel}>{monthLabel}</span>
                <button type="button" className={styles.calNavBtn} onClick={() => shiftMonth(1)} aria-label="Next month">
                  <ChevronRight size={20} />
                </button>
                <button type="button" className={styles.calTodayBtn} onClick={() => setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
                  Today
                </button>
                <button type="button" className={styles.calTodayBtn} onClick={exportHostIcs}>
                  iCal export
                </button>
                <button
                  type="button"
                  className={styles.calTodayBtn}
                  onClick={() => {
                    if (calPropertyId === 'all') {
                      showToast('Select a property, then import blocks from another calendar’s .ics export.')
                      return
                    }
                    icsImportRef.current?.click()
                  }}
                >
                  Import .ics
                </button>
                <input
                  ref={icsImportRef}
                  type="file"
                  accept=".ics,text/calendar"
                  className={styles.srOnly}
                  onChange={onIcsImportChange}
                />
              </div>

              <p className={styles.calHint} style={{ marginTop: 12 }}>
                Export reservations as .ics for Google or Apple Calendar. Import an external .ics (all-day events) to block those
                nights on the listing you selected — useful after exporting from another channel.
              </p>

              <div className={styles.calGrid}>
                {WEEKDAYS.map(d => (
                  <div key={d} className={styles.calDow}>
                    {d}
                  </div>
                ))}
                {calendarCells.map(cell => {
                  if (cell.type === 'pad') {
                    return <div key={cell.key} className={styles.calPad} />
                  }
                  const ymd = toYMD(cell.date)
                  const scopedBookings =
                    calPropertyId === 'all'
                      ? combinedPortfolioBookings
                      : combinedPortfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
                  const hit = bookingForDay(ymd, scopedBookings)
                  const blocked =
                    calPropertyId === 'all'
                      ? portfolioProperties.some(p => blockedByProp[p.id]?.includes(ymd))
                      : blockedByProp[Number(calPropertyId)]?.includes(ymd)
                  const isToday = ymd === todayYmd

                  let cellClass = styles.calCell
                  if (isToday) cellClass += ` ${styles.calCellToday}`
                  if (hit) cellClass += ` ${styles.calCellBooked}`
                  else if (blocked) cellClass += ` ${styles.calCellBlocked}`

                  return (
                    <button
                      type="button"
                      key={cell.key}
                      className={cellClass}
                      onClick={() => handleDayClick(ymd)}
                    >
                      <span className={styles.calDayNum}>{cell.date.getDate()}</span>
                      {hit && <span className={styles.calDot} />}
                    </button>
                  )
                })}
              </div>

              <div className={styles.calLegend}>
                <span>
                  <i className={styles.legBooked} /> Booked
                </span>
                <span>
                  <i className={styles.legBlocked} /> Blocked (manual)
                </span>
                <span>
                  <i className={styles.legToday} /> Today
                </span>
              </div>
            </div>

            <aside className={styles.calSide}>
              <div className={styles.panelTitle}>This month</div>
              {bookingsInViewMonth.length === 0 ? (
                <p className={styles.calSideEmpty}>No reservations with nights in this month for the current filter.</p>
              ) : (
                <ul className={styles.calStayList}>
                  {bookingsInViewMonth.map(b => (
                    <li key={b.id} className={styles.calStayCard}>
                      <div className={styles.calStayProp}>{b.propertyName}</div>
                      <div className={styles.calStayGuest}>{b.guest}</div>
                      <div className={styles.calStayDates}>
                        {b.checkIn} → {b.checkOut} · {b.nights} nights
                      </div>
                      <div className={styles.calStayMeta}>
                        <span className={`${styles.bookingStatus} ${styles[b.status]}`}>{b.status}</span>
                        <span className={styles.calStayTotal}>₹{b.total.toLocaleString('en-IN')}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.calStayMsg}
                        onClick={() => {
                          const em = b.email || b.guestEmail
                          if (!em || !String(em).includes('@')) {
                            showToast('No guest email on file for this row.')
                            return
                          }
                          setCalCompose({
                            guestEmail: String(em).trim().toLowerCase(),
                            propertyName: b.propertyName,
                            bookingId: b.bookingId,
                            propertyId: b.propertyId,
                          })
                          setCalComposeBody('')
                        }}
                      >
                        <Mail size={14} /> Message guest
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}

        {tab === 'Inventory' && (
          <div>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.panelTitle}>Inventory</div>
                <p className={styles.tabSub}>
                  Snapshot for <strong>{monthLabel}</strong> — booked vs blocked vs open. Syncs with your calendar tab.
                  Use bulk ranges to change units for peak weekends or seasons without touching every day.
                </p>
              </div>
              <button type="button" className={styles.panelLink} onClick={() => setTab('Calendar')}>
                Edit in calendar
              </button>
            </div>
            <div className={styles.bulkPanel}>
              <div className={styles.bulkPanelTitle}>Bulk units by date range</div>
              <p className={styles.bulkPanelHint}>
                Choose dates and how many parallel listings count for that window. Default units on each card still apply
                outside these ranges. If two ranges overlap, the <strong>latest</strong> rule you add wins.
              </p>
              <div className={styles.bulkGrid}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">From</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bulkUnits.from}
                    onChange={e => setBulkUnits(b => ({ ...b, from: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">To</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bulkUnits.to}
                    onChange={e => setBulkUnits(b => ({ ...b, to: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Units in range</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={20}
                    value={bulkUnits.units}
                    onChange={e => setBulkUnits(b => ({ ...b, units: e.target.value }))}
                  />
                </div>
              </div>
              <div className={styles.bulkPropPick}>
                <span className={styles.bulkPropPickLabel}>Apply to</span>
                <button
                  type="button"
                  className={styles.bulkLinkBtn}
                  onClick={() =>
                    setBulkTargetsUnits(Object.fromEntries(portfolioProperties.map(x => [x.id, true])))
                  }
                >
                  All
                </button>
                <button
                  type="button"
                  className={styles.bulkLinkBtn}
                  onClick={() =>
                    setBulkTargetsUnits(Object.fromEntries(portfolioProperties.map(x => [x.id, false])))
                  }
                >
                  None
                </button>
                <div className={styles.bulkChips}>
                  {portfolioProperties.map(p => (
                    <label key={p.id} className={styles.bulkChip}>
                      <input
                        type="checkbox"
                        checked={bulkTargetsUnits[p.id] !== false}
                        onChange={e => setBulkTargetsUnits(prev => ({ ...prev, [p.id]: e.target.checked }))}
                      />
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" className="btn-gold" style={{ marginTop: 16 }} onClick={applyBulkUnits}>
                Apply to date range
              </button>
            </div>
            <div className={styles.invGrid}>
              {portfolioProperties.map(p => {
                const units = inventoryUnits[p.id] ?? 1
                const snap = monthUnitCapacityStats({
                  propertyId: p.id,
                  year: calYear,
                  monthIndex: calMonthIdx,
                  defaultUnits: units,
                  unitRangesByProp,
                  blockedYmds: blockedByProp[p.id],
                  bookings: combinedPortfolioBookings,
                })
                const { dim, bookedDays: booked, blockedDays: blocked, capacity, open } = snap
                const unitRanges = unitRangesByProp[String(p.id)] || []
                return (
                  <div key={p.id} className={styles.invCard}>
                    <div className={styles.invCardTop}>
                      <Layers size={18} className={styles.invIcon} />
                      <div>
                        <div className={styles.invPropName}>{p.name}</div>
                        <div className={styles.invPropLoc}>{p.location}</div>
                      </div>
                    </div>
                    <div className={styles.invRow}>
                      <span>Default listings (units)</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        className={styles.invInput}
                        value={units}
                        onChange={e =>
                          setInventoryUnits(u => ({
                            ...u,
                            [p.id]: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
                          }))
                        }
                      />
                    </div>
                    <div className={styles.invStats}>
                      <div><span className={styles.invLabel}>Days in month</span><strong>{dim}</strong></div>
                      <div><span className={styles.invLabel}>Booked days</span><strong>{booked}</strong></div>
                      <div><span className={styles.invLabel}>Blocked (manual)</span><strong>{blocked}</strong></div>
                      <div><span className={styles.invLabel}>Open (est.)</span><strong>{open}</strong></div>
                    </div>
                    <p className={styles.invCapacityNote}>
                      Unit-nights this month (Σ per day): <strong>{capacity}</strong>
                    </p>
                    {unitRanges.length > 0 && (
                      <div className={styles.rangeList}>
                        <div className={styles.rangeListTitle}>Date-based unit rules</div>
                        <ul className={styles.rangeUl}>
                          {unitRanges.map(r => (
                            <li key={r.id} className={styles.rangeLi}>
                              <span>
                                {r.from} → {r.to} · <strong>{r.units}</strong> units
                              </span>
                              <button type="button" className={styles.rangeRemove} onClick={() => removeUnitRange(p.id, r.id)}>
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className={styles.invFoot}>
                      Under review listings still appear here for planning; guests cannot book until live.
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'Rates & promos' && (
          <div className={styles.ratesLayout}>
            <div>
              <div className={styles.panelTitle} style={{ marginBottom: 16 }}>
                Nightly rates &amp; stay rules
              </div>
              <p className={styles.tabSub} style={{ marginBottom: 24 }}>
                Base rate and min nights per listing — plus <strong>bulk date ranges</strong> for seasonal or weekend
                pricing. Rules are stored on this device and apply to the guest catalog, property page, and checkout.
                Overlapping ranges: latest rule wins.
              </p>
              <div className={styles.bulkPanel}>
                <div className={styles.bulkPanelTitle}>Bulk rate / min stay by date range</div>
                <p className={styles.bulkPanelHint}>
                  Turn on nightly and/or minimum nights, pick the window, choose listings, then apply. Leave a toggle off
                  if you only want to change the other field in that window.
                </p>
                <div className={styles.bulkChecks}>
                  <label className={styles.bulkChip}>
                    <input
                      type="checkbox"
                      checked={bulkRateForm.applyNightly}
                      onChange={e => setBulkRateForm(f => ({ ...f, applyNightly: e.target.checked }))}
                    />
                    <span>Nightly rate</span>
                  </label>
                  <label className={styles.bulkChip}>
                    <input
                      type="checkbox"
                      checked={bulkRateForm.applyMin}
                      onChange={e => setBulkRateForm(f => ({ ...f, applyMin: e.target.checked }))}
                    />
                    <span>Minimum nights</span>
                  </label>
                </div>
                <div className={styles.bulkGrid}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">From</label>
                    <input
                      type="date"
                      className="form-input"
                      value={bulkRateForm.from}
                      onChange={e => setBulkRateForm(f => ({ ...f, from: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">To</label>
                    <input
                      type="date"
                      className="form-input"
                      value={bulkRateForm.to}
                      onChange={e => setBulkRateForm(f => ({ ...f, to: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nightly ₹</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1000}
                      placeholder="e.g. 32000"
                      disabled={!bulkRateForm.applyNightly}
                      value={bulkRateForm.nightly}
                      onChange={e => setBulkRateForm(f => ({ ...f, nightly: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Min nights</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      max={30}
                      disabled={!bulkRateForm.applyMin}
                      value={bulkRateForm.minNights}
                      onChange={e => setBulkRateForm(f => ({ ...f, minNights: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.bulkPropPick}>
                  <span className={styles.bulkPropPickLabel}>Apply to</span>
                  <button
                    type="button"
                    className={styles.bulkLinkBtn}
                    onClick={() =>
                      setBulkTargetsRate(Object.fromEntries(portfolioProperties.map(x => [x.id, true])))
                    }
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={styles.bulkLinkBtn}
                    onClick={() =>
                      setBulkTargetsRate(Object.fromEntries(portfolioProperties.map(x => [x.id, false])))
                    }
                  >
                    None
                  </button>
                  <div className={styles.bulkChips}>
                    {portfolioProperties.map(p => (
                      <label key={p.id} className={styles.bulkChip}>
                        <input
                          type="checkbox"
                          checked={bulkTargetsRate[p.id] !== false}
                          onChange={e => setBulkTargetsRate(prev => ({ ...prev, [p.id]: e.target.checked }))}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="button" className="btn-gold" style={{ marginTop: 16 }} onClick={applyBulkRates}>
                  Apply rate rule to range
                </button>
              </div>
              {portfolioProperties.map(p => {
                const baseNightly =
                  ownerRates[p.id]?.nightly ??
                  (p.id === 101 ? 85000 : p.id === 102 ? 62000 : p.submittedPrice || 25000)
                const baseMin = ownerRates[p.id]?.minNights ?? (p.id === 102 ? 3 : 2)
                const eff = getEffectiveRateForDate(todayYmd, p.id, { nightly: baseNightly, minNights: baseMin }, rateRangesByProp)
                const rateRanges = rateRangesByProp[String(p.id)] || []
                return (
                  <div key={p.id} className={styles.rateCard}>
                    <div className={styles.rateCardTitle}>{p.name}</div>
                    <p className={styles.rateEffectiveLine}>
                      Today ({todayYmd}): <strong>₹{eff.nightly.toLocaleString('en-IN')}</strong> · min{' '}
                      <strong>{eff.minNights}</strong> nights
                    </p>
                    <div className={styles.rateFields}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Base nightly rate (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          min={1000}
                          value={ownerRates[p.id]?.nightly ?? ''}
                          onChange={e =>
                            setOwnerRates(r => ({
                              ...r,
                              [p.id]: { ...r[p.id], nightly: Math.max(0, Number(e.target.value) || 0) },
                            }))
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Default minimum nights</label>
                        <input
                          type="number"
                          className="form-input"
                          min={1}
                          max={30}
                          value={ownerRates[p.id]?.minNights ?? 2}
                          onChange={e =>
                            setOwnerRates(r => ({
                              ...r,
                              [p.id]: {
                                ...r[p.id],
                                minNights: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ marginTop: 16 }}
                      onClick={() => showToast(`Base rate saved — guest catalog updated on this device.`)}
                    >
                      Save base rate
                    </button>
                    {rateRanges.length > 0 && (
                      <div className={styles.rangeList}>
                        <div className={styles.rangeListTitle}>Date-based rate rules</div>
                        <ul className={styles.rangeUl}>
                          {rateRanges.map(r => (
                            <li key={r.id} className={styles.rangeLi}>
                              <span>
                                {r.from} → {r.to}
                                {r.nightly != null && (
                                  <>
                                    {' · '}
                                    <strong>₹{r.nightly.toLocaleString('en-IN')}</strong>
                                  </>
                                )}
                                {r.minNights != null && (
                                  <>
                                    {' · min '}
                                    <strong>{r.minNights}</strong> nights
                                  </>
                                )}
                              </span>
                              <button type="button" className={styles.rangeRemove} onClick={() => removeRateRange(p.id, r.id)}>
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div>
              <div className={styles.panelTitle} style={{ marginBottom: 16 }}>
                Promotions
              </div>
              <p className={styles.tabSub} style={{ marginBottom: 20 }}>
                Promo codes apply to the <strong>room subtotal</strong> on the property and payment pages when guests enter the code (saved on this device).
              </p>
              <div className={styles.promoForm}>
                <select
                  className="form-input"
                  value={promoForm.propertyId}
                  onChange={e => setPromoForm(f => ({ ...f, propertyId: Number(e.target.value) }))}
                >
                  {portfolioProperties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  placeholder="Title (e.g. Monsoon week)"
                  value={promoForm.title}
                  onChange={e => setPromoForm(f => ({ ...f, title: e.target.value }))}
                />
                <div className={styles.promoFormRow}>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={50}
                    placeholder="% off"
                    value={promoForm.discountPct}
                    onChange={e => setPromoForm(f => ({ ...f, discountPct: e.target.value }))}
                  />
                  <input
                    className="form-input"
                    placeholder="Code"
                    value={promoForm.code}
                    onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  />
                </div>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    if (!promoForm.title.trim() || !promoForm.code.trim()) {
                      showToast('Add a title and promo code.')
                      return
                    }
                    const pct = Math.min(50, Math.max(1, Number(promoForm.discountPct) || 10))
                    setHostPromotions(list => [
                      ...list,
                      {
                        id: `p-${Date.now()}`,
                        propertyId: Number(promoForm.propertyId),
                        title: promoForm.title.trim(),
                        discountPct: pct,
                        code: promoForm.code.trim().toUpperCase(),
                        active: true,
                      },
                    ])
                    setPromoForm(f => ({ ...f, title: '', discountPct: '', code: '' }))
                    showToast('Promotion saved — guests can apply this code at checkout.')
                  }}
                >
                  <Tag size={14} /> Add promotion
                </button>
              </div>
              <ul className={styles.promoList}>
                {visiblePromos.map(pr => {
                  const pn = portfolioProperties.find(x => x.id === pr.propertyId)?.name || 'Property'
                  return (
                    <li key={pr.id} className={styles.promoItem}>
                      <div>
                        <div className={styles.promoItemTitle}>{pr.title}</div>
                        <div className={styles.promoItemSub}>
                          {pn} · {pr.discountPct}% off · code <strong>{pr.code}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.promoToggle}
                        onClick={() => {
                          setHostPromotions(list => list.map(x => (x.id === pr.id ? { ...x, active: !x.active } : x)))
                          showToast(pr.active ? 'Promotion paused — code inactive.' : 'Promotion active — code works at checkout.')
                        }}
                      >
                        {pr.active ? 'Active' : 'Paused'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {tab === 'Bookings' && (
          <div>
            <div className={styles.panelHead}>
              <div className={styles.panelTitle}>All reservations</div>
              <button type="button" className={styles.panelLink} onClick={() => setTab('Calendar')}>
                View calendar
              </button>
            </div>
            <div className={styles.bookingsTable}>
              <div className={styles.tableHeader}>
                <span>Guest</span>
                <span>Property</span>
                <span>Check-in</span>
                <span>Check-out</span>
                <span>Nights</span>
                <span>Total</span>
                <span>Host net</span>
                <span>Settlement</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {combinedPortfolioBookings.map(b => (
                <div key={b.id} className={styles.tableRow}>
                  <span>{b.guest}</span>
                  <span className={styles.dim}>{b.propertyName}</span>
                  <span>{b.checkIn}</span>
                  <span>{b.checkOut}</span>
                  <span>{b.nights}</span>
                  <span>₹{Number(b.total || 0).toLocaleString('en-IN')}</span>
                  <span>
                    {b.hostNet != null ? `₹${Number(b.hostNet).toLocaleString('en-IN')}` : '—'}
                  </span>
                  <span className={styles.dim}>{b.settlementStatus || '—'}</span>
                  <span className={`${styles.bookingStatus} ${styles[b.status]}`}>{b.status}</span>
                  <span className={styles.tableActions}>
                    {b.modificationRequest?.status === 'pending' && b.bookingId != null && (
                      <>
                        <button type="button" className={styles.inlineTabLink} onClick={() => approveGuestDateChange(b)}>
                          Approve dates
                        </button>
                        <button
                          type="button"
                          className={styles.inlineTabLink}
                          onClick={() => {
                            patchBooking(b.bookingId, { modificationRequest: null })
                            showToast('Date change declined.')
                          }}
                        >
                          Decline dates
                        </button>
                      </>
                    )}
                    {b.refundRequest?.status === 'pending' && b.bookingId != null && b.status !== 'refunded' && (
                      <button
                        type="button"
                        className={styles.inlineTabLink}
                        onClick={() => {
                          const refundId = `rfnd_host_${Date.now().toString(36)}`
                          patchBooking(b.bookingId, {
                            status: 'refunded',
                            refundedAt: new Date().toISOString(),
                            refundAmount: b.total,
                            refundRequest: { ...b.refundRequest, status: 'approved', approvedBy: 'host' },
                            paymentRefundId: refundId,
                          })
                          const guest = b.email || b.guestEmail
                          try {
                            if (guest) {
                              pushInAppNotification({
                                title: 'Refund processed',
                                body: `${b.propertyName} · ₹${Number(b.total || 0).toLocaleString('en-IN')} marked refunded.`,
                                href: '/bookings',
                                recipientEmail: guest,
                              })
                              window.dispatchEvent(new Event('ns-notifications'))
                            }
                          } catch {
                            /* ignore */
                          }
                          showToast('Refund recorded for this booking.')
                        }}
                      >
                        Approve refund
                      </button>
                    )}
                    {b.source === 'live' &&
                    b.status !== 'cancelled' &&
                    b.bookingId != null &&
                    new Date(b.checkIn) > new Date(new Date().toISOString().slice(0, 10)) ? (
                      <button
                        type="button"
                        className={styles.inlineTabLink}
                        onClick={() => {
                          patchBooking(b.bookingId, { status: 'cancelled' })
                          showToast('Booking cancelled — those nights are open again.')
                        }}
                      >
                        Cancel
                      </button>
                    ) : null}
                    {b.source === 'live' && (b.email || b.guestEmail) ? (
                      <button
                        type="button"
                        className={styles.inlineTabLink}
                        onClick={() => setTab('Inbox')}
                      >
                        Inbox
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'Earnings' && (
          <div>
            <div className={styles.panelTitle} style={{ marginBottom: 32 }}>
              Earnings overview
            </div>
            <div className={styles.earningsChart}>
              {monthlyEarnings.map((m, i) => (
                <div key={i} className={styles.barCol}>
                  <div className={styles.barAmount}>{m.amount > 0 ? `₹${(m.amount / 1000).toFixed(0)}k` : '—'}</div>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ height: `${maxEarning > 0 ? (m.amount / maxEarning) * 100 : 0}%` }} />
                  </div>
                  <div className={styles.barMonth}>{m.month}</div>
                </div>
              ))}
            </div>
            <p className={styles.tabSub} style={{ marginBottom: 20, maxWidth: 560 }}>
              Totals below are from <strong>confirmed bookings</strong> for your listings (room share after the platform
              commission set in Admin). The chart shows the same paid and pending amounts by month.
            </p>
            <div className={styles.earningsSummary}>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>
                  ₹{earningsFromLive.ytdHostNet.toLocaleString('en-IN')}
                </div>
                <div className={styles.earningLabel}>Room share · all stays</div>
              </div>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>
                  ₹{earningsFromLive.pending.toLocaleString('en-IN')}
                </div>
                <div className={styles.earningLabel}>Pending settlement</div>
              </div>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>₹{earningsFromLive.paid.toLocaleString('en-IN')}</div>
                <div className={styles.earningLabel}>Marked paid</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'Settings' && (
          <div style={{ maxWidth: 540 }}>
            <div className={styles.panelTitle} style={{ marginBottom: 32 }}>
              Account settings
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Display name</label>
                <input className="form-input" defaultValue={user.name} />
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" defaultValue={user.email} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile number</label>
                <input className="form-input" type="tel" defaultValue={user.phone || ''} placeholder="+91 …" readOnly />
              </div>
              <div className="form-group">
                <label className="form-label">Payout account</label>
                <input className="form-input" placeholder="················" readOnly />
                <p className={styles.settingsHint}>
                  On file from your <strong>List a property</strong> application — view or request changes under{' '}
                  <button type="button" className={styles.inlineTabLink} onClick={() => setTab('Applications')}>
                    Applications
                  </button>
                  .
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Notification preferences</label>
                <select className="form-input">
                  <option>All notifications</option>
                  <option>Bookings only</option>
                  <option>Weekly digest</option>
                </select>
              </div>
              <button type="button" className="btn-gold" style={{ width: 'fit-content' }} onClick={() => showToast('Preferences saved on this device.')}>
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>

      {calCompose && (
        <div className={styles.hostModalOverlay} role="dialog" aria-modal="true" aria-labelledby="host-msg-title">
          <div className={styles.hostModalBox}>
            <h2 id="host-msg-title" className={styles.hostModalTitle}>
              Message guest
            </h2>
            <p className={styles.hostModalSub}>
              {calCompose.propertyName} · {calCompose.guestEmail}
            </p>
            <textarea
              className="form-input"
              rows={5}
              value={calComposeBody}
              onChange={e => setCalComposeBody(e.target.value)}
              placeholder="Your message appears in the guest’s inbox on this app."
            />
            <div className={styles.hostModalActions}>
              <button
                type="button"
                className="btn-gold"
                onClick={() => {
                  if (!calComposeBody.trim()) {
                    showToast('Write a message first.')
                    return
                  }
                  appendHostMessage({
                    fromEmail: user.email,
                    toEmail: calCompose.guestEmail,
                    body: calComposeBody.trim(),
                    bookingId: calCompose.bookingId,
                    propertyId: calCompose.propertyId,
                    propertyName: calCompose.propertyName,
                  })
                  showToast('Message sent.')
                  setCalCompose(null)
                  setCalComposeBody('')
                  setInboxMessages(loadHostMessages())
                }}
              >
                Send
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setCalCompose(null)
                  setCalComposeBody('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
