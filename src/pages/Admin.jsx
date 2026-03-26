import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home,
  Users,
  DollarSign,
  Star,
  BarChart2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  Edit,
  Shield,
  Activity,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Footer from '../components/Footer'
import { loadDisputes, patchDispute } from '../utils/disputesPersistence'
import { pushInAppNotification } from '../utils/inAppNotifications'
import styles from './Admin.module.css'

const TABS = ['Dashboard', 'Properties', 'Users', 'Bookings', 'Moderation', 'Disputes', 'Applications', 'Settings']

const ADMIN_SETTINGS_KEY = 'ns_admin_platform_settings'
const USER_META_KEY = 'ns_user_meta'

const DEFAULT_SETTINGS = {
  platformName: 'NammaStays',
  maxProperties: 50,
  commissionPct: 15,
  defaultMinNights: 2,
  cancellationPolicy: '30d',
  applicationsMode: 'open',
  maintenanceMode: false,
}

function loadJson(key, fallback) {
  try {
    const s = localStorage.getItem(key)
    if (!s) return fallback
    const p = JSON.parse(s)
    return p ?? fallback
  } catch {
    return fallback
  }
}

function saveJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* ignore */
  }
}

function traffic30d(p) {
  return Math.round(380 + p.id * 210 + p.reviews * 88 + p.rating * 45)
}

function estGmvForProperty(p, commissionPct) {
  const bookedNights = Math.min(14, Math.max(2, Math.floor(p.reviews / 2)))
  const gross = p.price * bookedNights
  const platformCut = Math.round(gross * (commissionPct / 100))
  return { gross, platformCut }
}

function maskBankAcct(n) {
  const s = String(n ?? '').replace(/\D/g, '')
  if (!s) return '—'
  return `••••${s.slice(-4)}`
}

function maskPanAdmin(p) {
  const s = String(p ?? '').toUpperCase().replace(/\s/g, '')
  if (s.length !== 10) return p ? '••••••••••' : '—'
  return `${s.slice(0, 2)}••••${s.slice(8)}`
}

function downloadCsv(filename, lines) {
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function Admin() {
  const {
    user,
    showToast,
    bookings,
    hostListingsByEmail,
    updateHostListingAdminDecision,
    mergedCatalogProperties,
    patchBooking,
    propertyReviewEntries,
    moderatePropertyReview,
  } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Dashboard')
  const [openApplicationId, setOpenApplicationId] = useState(null)
  const [userDirVersion, setUserDirVersion] = useState(0)
  const [disputeRows, setDisputeRows] = useState(() => loadDisputes())
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJson(ADMIN_SETTINGS_KEY, {}),
  }))
  const [settingsDirty, setSettingsDirty] = useState(false)

  useEffect(() => {
    saveJson(ADMIN_SETTINGS_KEY, settings)
  }, [settings])

  useEffect(() => {
    const r = () => setDisputeRows(loadDisputes())
    window.addEventListener('ns-disputes', r)
    return () => window.removeEventListener('ns-disputes', r)
  }, [])

  const mergedApplications = useMemo(() => {
    const fromHosts = []
    Object.entries(hostListingsByEmail).forEach(([email, list]) => {
      ;(list || []).forEach(l => {
        const decision = l.adminDecision
        const status =
          decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'pending'
        fromHosts.push({
          id: `sub-${l.id}`,
          kind: 'submission',
          property: l.propertyName,
          owner: l.ownerName || email.split('@')[0],
          ownerEmail: email,
          listingId: l.id,
          location: l.location,
          submitted: (l.submittedAt || '').slice(0, 10),
          status,
          type: l.type,
          pricePerNight: l.pricePerNight,
          submissionDetail: l,
        })
      })
    })
    return fromHosts.sort((a, b) => (b.submitted || '').localeCompare(a.submitted || ''))
  }, [hostListingsByEmail])

  const pendingCount = mergedApplications.filter(a => a.status === 'pending').length

  const catalogStats = useMemo(() => {
    const commissionPct = Number(settings.commissionPct) || 15
    return mergedCatalogProperties.map(p => ({
      ...p,
      traffic30d: traffic30d(p),
      ...estGmvForProperty(p, commissionPct),
    }))
  }, [settings.commissionPct, mergedCatalogProperties])

  const totalTraffic = useMemo(() => catalogStats.reduce((s, p) => s + p.traffic30d, 0), [catalogStats])
  const totalPlatformGmv = useMemo(() => catalogStats.reduce((s, p) => s + p.platformCut, 0), [catalogStats])
  const bookingsRevenue = useMemo(
    () => bookings.reduce((s, b) => s + (Number(b.total) || 0), 0),
    [bookings]
  )
  const livePropertyCount = mergedCatalogProperties.length
  const pipelinePending = mergedApplications.filter(a => a.status === 'pending')

  const registeredUserRows = useMemo(() => {
    const meta = loadJson(USER_META_KEY, {})
    if (!meta || typeof meta !== 'object') return []
    return Object.entries(meta)
      .map(([email, m]) => {
        const em = email.trim().toLowerCase()
        const bookingCount = bookings.filter(
          b =>
            String(b.guestEmail || '').trim().toLowerCase() === em &&
            b.status !== 'cancelled' &&
            b.status !== 'refunded'
        ).length
        let joined = '—'
        try {
          if (m.joinedAt)
            joined = new Date(m.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
        } catch {
          /* ignore */
        }
        const suspended = m.suspended === true
        return {
          id: email,
          name: m.name || email.split('@')[0],
          email,
          emailKey: em,
          role: m.role || 'guest',
          bookings: bookingCount,
          joined,
          kycTier: m.kycTier || 'none',
          suspended,
          status: suspended ? 'suspended' : 'active',
        }
      })
      .sort((a, b) => String(a.email).localeCompare(String(b.email)))
  }, [bookings, userDirVersion])

  const membersDisplay = registeredUserRows.length

  const pendingReviews = useMemo(
    () => propertyReviewEntries.filter(r => r.moderationStatus === 'pending'),
    [propertyReviewEntries]
  )

  const kpis = useMemo(
    () => [
      {
        icon: <Home size={20} />,
        label: 'Live on site',
        value: livePropertyCount,
        change: `${pipelinePending.length} in onboarding`,
        color: 'var(--sage)',
      },
      {
        icon: <Layers size={20} />,
        label: 'Pipeline (pending)',
        value: pendingCount,
        change: 'Applications tab',
        color: pendingCount ? 'var(--danger)' : 'var(--body)',
      },
      {
        icon: <Activity size={20} />,
        label: 'Listing traffic (30d)',
        value: `${(totalTraffic / 1000).toFixed(1)}k`,
        change: 'Projection per listing',
        color: 'var(--sage)',
      },
      {
        icon: <DollarSign size={20} />,
        label: 'Est. platform cut (30d)',
        value: `₹${(totalPlatformGmv / 1000).toFixed(0)}k`,
        change: `${settings.commissionPct}% commission basis`,
        color: 'var(--success)',
      },
      {
        icon: <BarChart2 size={20} />,
        label: 'Recorded bookings',
        value: bookings.length,
        change: `₹${(bookingsRevenue / 1000).toFixed(0)}k guest spend`,
        color: 'var(--sage)',
      },
      {
        icon: <Users size={20} />,
        label: 'Members (accounts)',
        value: membersDisplay,
        change: 'Registered accounts',
        color: 'var(--sage)',
      },
    ],
    [
      livePropertyCount,
      pipelinePending.length,
      pendingCount,
      totalTraffic,
      totalPlatformGmv,
      settings.commissionPct,
      bookings.length,
      bookingsRevenue,
      membersDisplay,
    ]
  )

  const updateApplication = useCallback(
    (app, status) => {
      updateHostListingAdminDecision(app.ownerEmail, app.listingId, status)
      showToast(status === 'approved' ? 'Approved — the host will see the update in Hosting.' : 'Submission rejected.')
    },
    [updateHostListingAdminDecision, showToast]
  )

  const savePlatformSettings = () => {
    saveJson(ADMIN_SETTINGS_KEY, settings)
    setSettingsDirty(false)
    window.dispatchEvent(new Event('ns-platform-settings'))
    showToast('Platform settings saved.')
  }

  const setSetting = (k, v) => {
    setSettings(s => ({ ...s, [k]: v }))
    setSettingsDirty(true)
    if (k === 'maintenanceMode') {
      window.dispatchEvent(new Event('ns-platform-settings'))
    }
  }

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '200px 60px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 48, color: 'var(--muted)', marginBottom: 16 }}>
          <Shield size={48} color="var(--gold)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--muted)', marginBottom: 24 }}>Master Access Required</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Sign in as <strong>admin@sanctum.com</strong> to open the master console.</p>
        <button type="button" className="btn-gold" onClick={() => navigate('/login')}>
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.masterBadge}>
            <Shield size={12} /> Master Access
          </div>
          <h1 className={styles.headerTitle}>Master console</h1>
          <p className={styles.headerSub}>
            Live catalog, onboarding pipeline, bookings, and platform rules — {user.email}
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button type="button" key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'Dashboard' && (
          <>
            <div className={styles.kpiGrid}>
              {kpis.map((k, i) => (
                <div key={i} className={styles.kpiCard}>
                  <div className={styles.kpiIcon} style={{ color: k.color }}>
                    {k.icon}
                  </div>
                  <div className={styles.kpiValue}>{k.value}</div>
                  <div className={styles.kpiLabel}>{k.label}</div>
                  <div className={styles.kpiChange}>{k.change}</div>
                </div>
              ))}
            </div>

            <div className={styles.dashGrid}>
              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>Live catalog · top by traffic</div>
                  <button type="button" className={styles.panelLink} onClick={() => setTab('Properties')}>
                    Full inventory
                  </button>
                </div>
                {[...catalogStats]
                  .sort((a, b) => b.traffic30d - a.traffic30d)
                  .slice(0, 5)
                  .map(p => (
                    <div key={p.id} className={styles.dashRow}>
                      <div className={styles.dashRowMain}>
                        <div className={styles.dashName}>{p.name}</div>
                        <div className={styles.dashSub}>{p.location}</div>
                      </div>
                      <div className={styles.dashMeta}>
                        <span className={styles.metricMuted}>{p.traffic30d.toLocaleString('en-IN')} views</span>
                        <span>₹{p.platformCut.toLocaleString('en-IN')} est. cut</span>
                        <span className={styles.livePill}>Live</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>Onboarding · needs action</div>
                  <button type="button" className={styles.panelLink} onClick={() => setTab('Applications')}>
                    All applications
                  </button>
                </div>
                {pipelinePending.slice(0, 5).map(a => (
                  <div key={a.id} className={styles.dashRow}>
                    <div className={styles.dashRowMain}>
                      <div className={styles.dashName}>{a.property}</div>
                      <div className={styles.dashSub}>
                        {a.owner} · {a.location}
                        <span className={styles.sourceTag}> List a property</span>
                      </div>
                    </div>
                    <div className={styles.appActions}>
                      <button
                        type="button"
                        className={styles.approveBtn}
                        onClick={() => updateApplication(a, 'approved')}
                        title="Approve"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        type="button"
                        className={styles.rejectBtn}
                        onClick={() => updateApplication(a, 'rejected')}
                        title="Reject"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {pipelinePending.length === 0 && <p className={styles.empty}>No pending applications.</p>}
              </div>
            </div>
          </>
        )}

        {tab === 'Properties' && (
          <div>
            <p className={styles.sectionIntro}>
              <strong>Live catalog</strong> — properties guests see on the site. Traffic and estimated platform cut columns are
              projections from listing price, reviews, and your commission rate in Settings; they help prioritize inventory until
              you plug in analytics.
            </p>
            <div className={styles.tableWrap}>
              <div className={`${styles.tableHead} ${styles.tableHeadProps}`}>
                <span>Property</span>
                <span>Location</span>
                <span>Type</span>
                <span>Price</span>
                <span>Rating</span>
                <span>Traffic (30d)</span>
                <span>Est. cut (30d)</span>
                <span>Guest status</span>
                <span>Actions</span>
              </div>
              {catalogStats.map(p => (
                <div key={p.id} className={`${styles.tableRow} ${styles.tableRowProps}`}>
                  <span className={styles.propName}>{p.name}</span>
                  <span className={styles.dimText}>{p.location}</span>
                  <span className={styles.dimText}>{p.type}</span>
                  <span>₹{p.price.toLocaleString('en-IN')}</span>
                  <span className={styles.ratingCell}>
                    <Star size={11} fill="var(--gold)" color="var(--gold)" /> {p.rating}
                  </span>
                  <span>{p.traffic30d.toLocaleString('en-IN')}</span>
                  <span className={styles.dimText}>₹{p.platformCut.toLocaleString('en-IN')}</span>
                  <span className={p.available ? styles.activeTag : styles.inactiveTag}>
                    {p.available ? 'Bookable' : 'Unavailable'}
                  </span>
                  <span className={styles.actionBtns}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() =>
                        window.open(`${window.location.origin}/property/${p.id}`, '_blank', 'noopener,noreferrer')
                      }
                      title="Open public listing in new tab"
                    >
                      <ExternalLink size={13} />
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => navigate(`/property/${p.id}`)} title="View in app">
                      <Eye size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => showToast('Open your CMS or API-backed editor when connected.')}
                      title="Edit"
                    >
                      <Edit size={13} />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.subSection}>
              <div className={styles.panelTitle} style={{ marginBottom: 16 }}>
                Pipeline · not live yet ({pipelinePending.length})
              </div>
              <p className={styles.sectionIntro}>
                Approve or reject from the <button type="button" className={styles.inlineLink} onClick={() => setTab('Applications')}>Applications</button>{' '}
                tab. Submissions from <strong>List a property</strong> appear here once the host uses the same email as their account.
              </p>
              {pipelinePending.length === 0 ? (
                <p className={styles.empty}>No properties waiting for approval.</p>
              ) : (
                <div className={styles.pipelineList}>
                  {pipelinePending.map(a => (
                    <div key={a.id} className={styles.pipelineRow}>
                      <div>
                        <strong>{a.property}</strong>
                        <div className={styles.dimText}>
                          {a.owner} · {a.location} · {a.submitted}
                          {' · List a property'}
                        </div>
                      </div>
                      <button type="button" className="btn-outline" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setTab('Applications')}>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'Users' && (
          <div>
            <p className={styles.sectionIntro}>
              Everyone who has signed up on this device ({registeredUserRows.length} account
              {registeredUserRows.length === 1 ? '' : 's'}). Guest booking counts exclude cancelled and refunded stays.
            </p>
            {registeredUserRows.length === 0 ? (
              <p className={styles.empty}>No registered users yet. Sign up from the guest flow to see rows here.</p>
            ) : (
              <div className={styles.tableWrap}>
                <div className={`${styles.tableHeadUsers} ${styles.tableHeadUsersWide}`}>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>KYC</span>
                  <span>Bookings</span>
                  <span>Joined</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {registeredUserRows.map(u => (
                  <div key={u.id} className={`${styles.tableRowUsers} ${styles.tableRowUsersWide}`}>
                    <span className={styles.propName}>{u.name}</span>
                    <span className={styles.dimText}>{u.email}</span>
                    <span className={`${styles.roleBadge} ${styles[u.role]}`}>{u.role}</span>
                    <span>
                      <select
                        className="form-input"
                        style={{ padding: '6px 8px', fontSize: '12px', minWidth: 100 }}
                        value={u.kycTier}
                        onChange={e => {
                          const all = loadJson(USER_META_KEY, {})
                          const prev = { ...(all[u.emailKey] || {}), ...(all[u.email] || {}) }
                          all[u.emailKey] = { ...prev, kycTier: e.target.value }
                          if (u.email !== u.emailKey) delete all[u.email]
                          saveJson(USER_META_KEY, all)
                          setUserDirVersion(x => x + 1)
                          showToast('KYC tier updated.')
                        }}
                      >
                        <option value="none">None</option>
                        <option value="basic">Basic</option>
                        <option value="verified">Verified</option>
                      </select>
                    </span>
                    <span>{u.bookings}</span>
                    <span className={styles.dimText}>{u.joined}</span>
                    <span className={u.status === 'active' ? styles.activeTag : styles.suspendedTag}>{u.status}</span>
                    <span className={styles.actionBtns}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => {
                          const all = loadJson(USER_META_KEY, {})
                          const prev = { ...(all[u.emailKey] || {}), ...(all[u.email] || {}) }
                          all[u.emailKey] = { ...prev, suspended: !u.suspended }
                          if (u.email !== u.emailKey) delete all[u.email]
                          saveJson(USER_META_KEY, all)
                          setUserDirVersion(x => x + 1)
                          showToast(u.suspended ? 'User unsuspended.' : 'User suspended — sign-in blocked.')
                        }}
                        title="Suspend / unsuspend"
                      >
                        <Shield size={13} />
                      </button>
                      <button type="button" className={styles.iconBtn} onClick={() => showToast(`Profile: ${u.name}`)} title="View">
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.dangerBtn}`}
                        onClick={() => {
                          if (!window.confirm(`Delete account ${u.email} from this directory?`)) return
                          const all = loadJson(USER_META_KEY, {})
                          delete all[u.emailKey]
                          if (u.email !== u.emailKey) delete all[u.email]
                          saveJson(USER_META_KEY, all)
                          setUserDirVersion(x => x + 1)
                          showToast('User removed from directory.')
                        }}
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Bookings' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <p className={styles.sectionIntro} style={{ margin: 0, flex: 1 }}>
                All guest checkouts recorded on this device ({bookings.length}).
              </p>
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '12px' }}
                disabled={!bookings.length}
                onClick={() => {
                  const cols = [
                    'reference',
                    'guestEmail',
                    'property',
                    'checkIn',
                    'checkOut',
                    'total',
                    'status',
                    'settlementStatus',
                  ]
                  const lines = [cols.join(',')]
                  bookings.forEach(b => {
                    lines.push(cols.map(c => csvEscape(b[c])).join(','))
                  })
                  downloadCsv(`nammastays-bookings-${Date.now()}.csv`, lines)
                  showToast('Bookings exported.')
                }}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '12px' }}
                disabled={!registeredUserRows.length}
                onClick={() => {
                  const cols = ['email', 'name', 'role', 'kycTier', 'suspended', 'bookings', 'joined']
                  const lines = [cols.join(',')]
                  registeredUserRows.forEach(u => {
                    lines.push(
                      cols
                        .map(c =>
                          csvEscape(
                            c === 'suspended' ? (u.suspended ? 'yes' : 'no') : u[c]
                          )
                        )
                        .join(',')
                    )
                  })
                  downloadCsv(`nammastays-users-${Date.now()}.csv`, lines)
                  showToast('Users exported.')
                }}
              >
                Export users CSV
              </button>
            </div>
            {bookings.length === 0 ? (
              <p className={styles.empty}>No bookings in the ledger. Complete a stay from the guest payment flow to see rows here.</p>
            ) : (
              <div className={styles.tableWrap}>
                <div className={`${styles.tableHeadBookings} ${styles.tableHeadBookingsWide}`}>
                  <span>Reference</span>
                  <span>Guest</span>
                  <span>Property</span>
                  <span>Check-in</span>
                  <span>Check-out</span>
                  <span>Total</span>
                  <span>Settlement</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {bookings.map(b => (
                  <div key={b.id} className={`${styles.tableRowBookings} ${styles.tableRowBookingsWide}`}>
                    <span className={styles.mono}>{b.reference || '—'}</span>
                    <span className={styles.dimText}>{b.guestEmail || '—'}</span>
                    <span className={styles.dimText}>{b.property}</span>
                    <span>{b.checkIn}</span>
                    <span>{b.checkOut}</span>
                    <span>₹{Number(b.total).toLocaleString('en-IN')}</span>
                    <span className={styles.dimText}>{b.settlementStatus || '—'}</span>
                    <span className={styles.completedTag}>{b.status || 'confirmed'}</span>
                    <span className={styles.adminBookingActions}>
                      {b.refundRequest?.status === 'pending' && b.status !== 'refunded' && (
                        <button
                          type="button"
                          className={styles.inlineLinkish}
                          onClick={() => {
                            const refundId = `rfnd_${Date.now().toString(36)}`
                            patchBooking(b.id, {
                              status: 'refunded',
                              refundedAt: new Date().toISOString(),
                              refundAmount: b.total,
                              refundRequest: { ...b.refundRequest, status: 'approved', approvedBy: 'platform' },
                              paymentRefundId: refundId,
                            })
                            try {
                              pushInAppNotification({
                                title: 'Refund completed',
                                body: `${b.property || 'Stay'} · ₹${Number(b.total || 0).toLocaleString('en-IN')} returned to your payment method.`,
                                href: '/bookings',
                                recipientEmail: b.guestEmail,
                              })
                              window.dispatchEvent(new Event('ns-notifications'))
                            } catch {
                              /* ignore */
                            }
                            showToast('Refund approved — booking marked refunded.')
                          }}
                        >
                          Approve refund
                        </button>
                      )}
                      {b.refundRequest?.status !== 'pending' &&
                      (b.settlementStatus || 'pending_settlement') !== 'paid' &&
                      b.status !== 'refunded' ? (
                        <button
                          type="button"
                          className={styles.inlineLinkish}
                          onClick={() => {
                            patchBooking(b.id, { settlementStatus: 'paid' })
                            showToast(`Marked ${b.reference || 'booking'} as paid out to host.`)
                          }}
                        >
                          Mark paid
                        </button>
                      ) : b.refundRequest?.status === 'pending' ? null : (
                        <span className={styles.dimText}>—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Moderation' && (
          <div>
            <p className={styles.sectionIntro}>
              Guest reviews enter as <strong>pending</strong> until approved. Only approved posts affect public ratings.
            </p>
            {pendingReviews.length === 0 ? (
              <p className={styles.empty}>Nothing in the queue.</p>
            ) : (
              <div className={styles.tableWrap}>
                {pendingReviews.map(r => (
                  <div key={r.id} className={styles.pipelineRow}>
                    <div>
                      <strong>Property {r.propertyId}</strong> · booking {r.bookingId}
                      <div className={styles.dimText}>{r.guestEmail}</div>
                      <div style={{ marginTop: 8 }}>{'★'.repeat(r.rating)} — {r.comment || 'No comment'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn-gold"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                        onClick={() => {
                          moderatePropertyReview(r.id, 'approved')
                          showToast('Review approved.')
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ padding: '8px 16px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => {
                          moderatePropertyReview(r.id, 'rejected')
                          showToast('Review rejected.')
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'Disputes' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <p className={styles.sectionIntro} style={{ margin: 0, flex: 1 }}>
                Ledger of guest / host disputes opened from My account.
              </p>
              <button
                type="button"
                className="btn-outline"
                style={{ fontSize: '12px' }}
                disabled={!disputeRows.length}
                onClick={() => {
                  const cols = ['id', 'createdAt', 'status', 'bookingId', 'openedByEmail', 'reason']
                  const lines = [cols.join(',')]
                  disputeRows.forEach(d => {
                    lines.push(cols.map(c => csvEscape(d[c])).join(','))
                  })
                  downloadCsv(`nammastays-disputes-${Date.now()}.csv`, lines)
                  showToast('Disputes exported.')
                }}
              >
                Export disputes CSV
              </button>
            </div>
            {disputeRows.length === 0 ? (
              <p className={styles.empty}>No open disputes.</p>
            ) : (
              disputeRows.map(d => (
                <div key={d.id} className={styles.pipelineRow}>
                  <div>
                    <strong>Booking {d.bookingId}</strong> · {d.openedByEmail}
                    <div className={styles.dimText}>{new Date(d.createdAt).toLocaleString('en-IN')}</div>
                    <p style={{ marginTop: 8 }}>{d.reason}</p>
                  </div>
                  {d.status === 'open' ? (
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                      onClick={() => {
                        patchDispute(d.id, { status: 'resolved', resolvedAt: new Date().toISOString() })
                        setDisputeRows(loadDisputes())
                        showToast('Marked resolved.')
                      }}
                    >
                      Resolve
                    </button>
                  ) : (
                    <span className={styles.dimText}>Resolved</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'Applications' && (
          <div>
            <p className={styles.sectionIntro}>
              <strong>Onboarding</strong> — submissions from <strong>List a property</strong>, matched to the host&apos;s login email.
              Approve or reject to update their listing status.
            </p>
            {mergedApplications.length === 0 && (
              <p className={styles.empty}>No applications yet. A host can submit from List a property while logged in.</p>
            )}
            {mergedApplications.map(a => {
              const d = a.submissionDetail
              const expanded = openApplicationId === a.id
              return (
                <div key={a.id} className={styles.appCard}>
                  <div className={styles.appCardTop}>
                    <div className={styles.appInfo}>
                      <div className={styles.appName}>{a.property}</div>
                      <div className={styles.appSub}>
                        {a.owner} · {a.location}
                        {a.kind === 'submission' && (
                          <>
                            {' '}
                            · <span className={styles.mono}>{a.ownerEmail}</span>
                            {a.type && ` · ${a.type}`}
                            {a.pricePerNight && ` · ₹${a.pricePerNight}/night`}
                          </>
                        )}
                      </div>
                      <div className={styles.appDate}>Submitted {a.submitted}</div>
                    </div>
                    <div className={styles.appRight}>
                      <div className={`${styles.appStatus} ${styles[a.status]}`}>
                        {a.status === 'pending' && <AlertCircle size={13} />}
                        {a.status === 'approved' && <CheckCircle size={13} />}
                        {a.status === 'rejected' && <XCircle size={13} />}
                        {a.status}
                      </div>
                      {d && (
                        <button
                          type="button"
                          className={styles.detailToggle}
                          onClick={() => setOpenApplicationId(expanded ? null : a.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <>
                              Hide details <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              KYC &amp; full application <ChevronDown size={14} />
                            </>
                          )}
                        </button>
                      )}
                      {a.status === 'pending' && (
                        <div className={styles.appBtns}>
                          <button type="button" className="btn-gold" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={() => updateApplication(a, 'approved')}>
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ padding: '10px 20px', fontSize: '13px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={() => updateApplication(a, 'rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {d && expanded && (
                    <div className={styles.submissionDetail}>
                      <div className={styles.detailGrid}>
                        <div className={styles.detailCol}>
                          <div className={styles.detailHeading}>Owner</div>
                          <p>
                            <strong>{d.ownerName || '—'}</strong>
                          </p>
                          <p className={styles.dimText}>Phone: {d.ownerPhone || '—'}</p>
                          <p className={styles.dimText}>Email: {a.ownerEmail}</p>
                          {d.ownerBio && <p className={styles.detailNote}>{d.ownerBio}</p>}
                        </div>
                        <div className={styles.detailCol}>
                          <div className={styles.detailHeading}>Property</div>
                          <p className={styles.dimText}>{d.description || '—'}</p>
                          <p className={styles.dimText}>
                            Beds {d.bedrooms || '—'} · Baths {d.bathrooms || '—'} · Guests {d.guests || '—'} ·{' '}
                            {d.sqft ? `${d.sqft} sq ft` : '—'}
                          </p>
                          {d.specialFeature && (
                            <p>
                              <em>{d.specialFeature}</em>
                            </p>
                          )}
                          {Array.isArray(d.amenities) && d.amenities.length > 0 && (
                            <p className={styles.amenityLine}>{d.amenities.join(' · ')}</p>
                          )}
                        </div>
                        <div className={styles.detailCol}>
                          <div className={styles.detailHeading}>Payout &amp; tax (sensitive)</div>
                          <p>
                            Holder: <strong>{d.bankAccountHolderName || '—'}</strong>
                          </p>
                          <p className={styles.dimText}>Bank: {d.bankName || '—'}</p>
                          <p className={styles.dimText}>
                            A/c: {maskBankAcct(d.bankAccountNumber)} · IFSC: <span className={styles.mono}>{d.bankIfsc || '—'}</span>
                          </p>
                          <p className={styles.dimText}>
                            PAN: <span className={styles.mono}>{maskPanAdmin(d.panNumber)}</span> · GSTIN:{' '}
                            <span className={styles.mono}>{d.gstin || '—'}</span>
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

        {tab === 'Settings' && (
          <div style={{ maxWidth: 560 }}>
            <div className={styles.panelTitle} style={{ marginBottom: 12 }}>Platform settings</div>
            <p className={styles.sectionIntro} style={{ marginBottom: 28 }}>
              Saved to this browser (<code className={styles.mono}>localStorage</code>). Commission affects estimated platform cut on the Dashboard and
              Properties tables.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="form-group">
                <label className="form-label">Platform name</label>
                <input className="form-input" value={settings.platformName} onChange={e => setSetting('platformName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Maximum live listings (cap)</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={settings.maxProperties}
                  onChange={e => setSetting('maxProperties', Math.max(1, Number(e.target.value) || 50))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Platform commission (%)</label>
                <input
                  className="form-input"
                  type="number"
                  min={0}
                  max={40}
                  value={settings.commissionPct}
                  onChange={e => setSetting('commissionPct', Math.min(40, Math.max(0, Number(e.target.value) || 0)))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Suggested default min. nights</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  value={settings.defaultMinNights}
                  onChange={e => setSetting('defaultMinNights', Math.max(1, Number(e.target.value) || 2))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Default cancellation policy</label>
                <select className="form-input" value={settings.cancellationPolicy} onChange={e => setSetting('cancellationPolicy', e.target.value)}>
                  <option value="30d">30 days free cancellation</option>
                  <option value="14d">14 days free cancellation</option>
                  <option value="none">Non-refundable</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">New property applications</label>
                <select className="form-input" value={settings.applicationsMode} onChange={e => setSetting('applicationsMode', e.target.value)}>
                  <option value="open">Open — accepting applications</option>
                  <option value="closed">Closed — at capacity</option>
                  <option value="invite">Invite only</option>
                </select>
              </div>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={e => setSetting('maintenanceMode', e.target.checked)}
                />
                <span>Maintenance banner on the homepage (guests see a notice; booking still works)</span>
              </label>
              <button type="button" className="btn-gold" style={{ width: 'fit-content' }} onClick={savePlatformSettings}>
                Save settings{settingsDirty ? ' *' : ''}
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
