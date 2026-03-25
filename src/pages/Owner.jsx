import React, { useState, useMemo, useEffect } from 'react'
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
import {
  getDemoOwnerBookings,
  toYMD,
  bookingForDay,
  bookedDaysInMonthForProperty,
  countBlockedInMonth,
} from '../data/ownerDashboard'
import Footer from '../components/Footer'
import styles from './Owner.module.css'

const TABS = [
  'Overview',
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
  const { user, showToast, hostListingsByEmail, mergedCatalogProperties } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [calPropertyId, setCalPropertyId] = useState('all')
  const [blockedByProp, setBlockedByProp] = useState({})
  const [ownerRates, setOwnerRates] = useState({})
  const [inventoryUnits, setInventoryUnits] = useState({})
  const [promos, setPromos] = useState([
    { id: 'p1', propertyId: 101, title: 'Stay 5+ nights', discountPct: 12, code: 'EXT12', active: true },
  ])
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
    setOwnerRates(prev => {
      const next = { ...prev }
      portfolioProperties.forEach(p => {
        if (!(p.id in next)) {
          let nightly = p.submittedPrice || 25000
          if (p.id === 101) nightly = 85000
          else if (p.id === 102) nightly = 62000
          next[p.id] = { nightly, minNights: p.id === 102 ? 3 : 2 }
        }
      })
      return next
    })
    setInventoryUnits(prev => {
      const next = { ...prev }
      portfolioProperties.forEach(p => {
        if (!(p.id in next)) next[p.id] = 1
      })
      return next
    })
    setBlockedByProp(prev => {
      const next = { ...prev }
      portfolioProperties.forEach(p => {
        if (!(p.id in next)) next[p.id] = []
      })
      return next
    })
  }, [portfolioProperties])

  useEffect(() => {
    if (portfolioProperties.length === 0) return
    setPromoForm(f => {
      const ok = f.propertyId && portfolioProperties.some(p => p.id === f.propertyId)
      if (ok) return f
      return { ...f, propertyId: portfolioProperties[0].id }
    })
  }, [portfolioProperties])

  const allDemoBookings = useMemo(() => getDemoOwnerBookings(), [])
  const portfolioIds = useMemo(() => new Set(portfolioProperties.map(p => p.id)), [portfolioProperties])
  const portfolioBookings = useMemo(
    () => allDemoBookings.filter(b => portfolioIds.has(b.propertyId)),
    [allDemoBookings, portfolioIds]
  )

  const bookingsForFilter = useMemo(() => {
    if (calPropertyId === 'all') return portfolioBookings
    return portfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
  }, [calPropertyId, portfolioBookings])

  const calYear = calMonth.getFullYear()
  const calMonthIdx = calMonth.getMonth()
  const monthLabel = calMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const calendarCells = useMemo(() => buildMonthGrid(calYear, calMonthIdx), [calYear, calMonthIdx])

  const bookingsInViewMonth = useMemo(
    () => bookingsOverlappingMonth(bookingsForFilter, calYear, calMonthIdx),
    [bookingsForFilter, calYear, calMonthIdx]
  )

  const visiblePromos = useMemo(
    () => promos.filter(pr => portfolioIds.has(pr.propertyId)),
    [promos, portfolioIds]
  )

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
        ? 'Day opened on your calendar (demo — not saved to server).'
        : 'Day blocked on your calendar (demo — not saved to server).'
    )
  }

  const handleDayClick = (ymd) => {
    const scopedBookings =
      calPropertyId === 'all'
        ? portfolioBookings
        : portfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
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

  const stats = [
    {
      icon: <Home size={18} />,
      label: 'Properties',
      value: portfolioProperties.length,
      sub: `${portfolioProperties.filter(p => p.status === 'active').length} live`,
    },
    { icon: <DollarSign size={18} />, label: 'Total Revenue', value: '₹6,21,000', sub: 'This year' },
    {
      icon: <Calendar size={18} />,
      label: 'Bookings',
      value: portfolioBookings.length,
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
                  {portfolioBookings
                    .filter(b => b.status === 'upcoming')
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
                    Booked nights show in sage. Click an empty day to block or unblock it (demo). Click a booking for details.
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
              </div>

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
                      ? portfolioBookings
                      : portfolioBookings.filter(b => String(b.propertyId) === String(calPropertyId))
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
                      <button type="button" className={styles.calStayMsg} onClick={() => showToast(`Message sent to ${b.email} (demo).`)}>
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
                  Snapshot for <strong>{monthLabel}</strong> — booked vs blocked vs open (demo). Syncs with your calendar tab.
                </p>
              </div>
              <button type="button" className={styles.panelLink} onClick={() => setTab('Calendar')}>
                Edit in calendar
              </button>
            </div>
            <div className={styles.invGrid}>
              {portfolioProperties.map(p => {
                const units = inventoryUnits[p.id] ?? 1
                const dim = new Date(calYear, calMonthIdx + 1, 0).getDate()
                const booked = bookedDaysInMonthForProperty(portfolioBookings, p.id, calYear, calMonthIdx)
                const blocked = countBlockedInMonth(blockedByProp[p.id], calYear, calMonthIdx)
                const capacity = dim * units
                const open = Math.max(0, capacity - booked - blocked)
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
                      <span>Listings (units)</span>
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
                      <div><span className={styles.invLabel}>Booked guest-nights</span><strong>{booked}</strong></div>
                      <div><span className={styles.invLabel}>Blocked (manual)</span><strong>{blocked}</strong></div>
                      <div><span className={styles.invLabel}>Open (est.)</span><strong>{open}</strong></div>
                    </div>
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
                You set minimum nights and base rate for each listing (demo — not synced to the live catalog yet).
              </p>
              {portfolioProperties.map(p => (
                <div key={p.id} className={styles.rateCard}>
                  <div className={styles.rateCardTitle}>{p.name}</div>
                  <div className={styles.rateFields}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nightly rate (₹)</label>
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
                      <label className="form-label">Minimum nights (your rule)</label>
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
                    onClick={() => showToast(`Saved rate for ${p.name} (demo).`)}
                  >
                    Update listing rate
                  </button>
                </div>
              ))}
            </div>
            <div>
              <div className={styles.panelTitle} style={{ marginBottom: 16 }}>
                Promotions
              </div>
              <p className={styles.tabSub} style={{ marginBottom: 20 }}>
                Promo codes and discounts for direct / member bookings (demo).
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
                    setPromos(list => [
                      ...list,
                      {
                        id: `p-${Date.now()}`,
                        propertyId: promoForm.propertyId,
                        title: promoForm.title.trim(),
                        discountPct: pct,
                        code: promoForm.code.trim(),
                        active: true,
                      },
                    ])
                    setPromoForm(f => ({ ...f, title: '', discountPct: '', code: '' }))
                    showToast('Promotion added (demo).')
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
                          setPromos(list => list.map(x => (x.id === pr.id ? { ...x, active: !x.active } : x)))
                          showToast(pr.active ? 'Promotion paused (demo).' : 'Promotion active (demo).')
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
                <span>Status</span>
              </div>
              {portfolioBookings.map(b => (
                <div key={b.id} className={styles.tableRow}>
                  <span>{b.guest}</span>
                  <span className={styles.dim}>{b.propertyName}</span>
                  <span>{b.checkIn}</span>
                  <span>{b.checkOut}</span>
                  <span>{b.nights}</span>
                  <span>₹{b.total.toLocaleString('en-IN')}</span>
                  <span className={`${styles.bookingStatus} ${styles[b.status]}`}>{b.status}</span>
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
            <div className={styles.earningsSummary}>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>₹6,21,000</div>
                <div className={styles.earningLabel}>Year to date</div>
              </div>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>₹2,15,000</div>
                <div className={styles.earningLabel}>Pending payout</div>
              </div>
              <div className={styles.earningStat}>
                <div className={styles.earningNum}>₹4,06,000</div>
                <div className={styles.earningLabel}>Paid out</div>
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
              <button type="button" className="btn-gold" style={{ width: 'fit-content' }} onClick={() => showToast('Changes saved (demo — not persisted).')}>
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
