import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Star,
  Calendar,
  ArrowRight,
  Wallet,
  Moon,
  Sparkles,
  User,
  Mail,
  Phone,
  Bell,
  XCircle,
  FileText,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Footer from '../components/Footer'
import {
  loadInAppNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  pushInAppNotification,
} from '../utils/inAppNotifications'
import { appendHostMessage } from '../utils/hostMessagesPersistence'
import { appendDispute } from '../utils/disputesPersistence'
import { buildBookingInvoiceHtml, downloadInvoiceHtml } from '../utils/bookingInvoice'
import { validateStayAvailability } from '../utils/hostCatalogMerge'
import styles from './Bookings.module.css'

function deriveStayStatus(checkOutYmd) {
  const today = new Date().toISOString().slice(0, 10)
  return checkOutYmd > today ? 'upcoming' : 'completed'
}

function bookingLedgerStatus(b) {
  if (b.status === 'cancelled') return 'cancelled'
  if (b.status === 'refunded') return 'refunded'
  return deriveStayStatus(b.checkOut)
}

function formatJoined(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function isInactiveBooking(b) {
  return b.status === 'cancelled' || b.status === 'refunded'
}

export default function Bookings() {
  const navigate = useNavigate()
  const {
    user,
    bookings,
    hostListingsByEmail,
    patchBooking,
    addPropertyReview,
    propertyReviewEntries,
    showToast,
    mergedCatalogProperties,
  } = useApp()
  const hostListingCount = user
    ? hostListingsByEmail[user.email?.toLowerCase?.() || '']?.length || 0
    : 0
  const [dashTab, setDashTab] = useState('overview')
  const [notifications, setNotifications] = useState(loadInAppNotifications)
  const [reviewOpenForId, setReviewOpenForId] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [modifyBooking, setModifyBooking] = useState(null)
  const [modCheckIn, setModCheckIn] = useState('')
  const [modCheckOut, setModCheckOut] = useState('')
  const [debateBooking, setDebateBooking] = useState(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [messageBooking, setMessageBooking] = useState(null)
  const [messageBody, setMessageBody] = useState('')

  const refreshNotifications = useCallback(() => {
    const em = user?.email?.trim().toLowerCase() || ''
    setNotifications(
      loadInAppNotifications().filter(n => !n.recipientEmail || n.recipientEmail === em)
    )
  }, [user?.email])

  useEffect(() => {
    refreshNotifications()
    window.addEventListener('ns-notifications', refreshNotifications)
    return () => window.removeEventListener('ns-notifications', refreshNotifications)
  }, [refreshNotifications])

  const myBookings = useMemo(() => {
    if (!user?.email) return []
    const email = user.email.trim().toLowerCase()
    return bookings.filter(b => String(b.guestEmail || '').trim().toLowerCase() === email)
  }, [bookings, user?.email])

  const myBookingsForStats = useMemo(
    () => myBookings.filter(b => !isInactiveBooking(b)),
    [myBookings]
  )

  const hasReviewForBooking = useCallback(
    bookingId => {
      if (!user?.email) return false
      const key = user.email.trim().toLowerCase()
      return propertyReviewEntries.some(
        r =>
          String(r.bookingId) === String(bookingId) &&
          String(r.guestEmail || '')
            .trim()
            .toLowerCase() === key
      )
    },
    [propertyReviewEntries, user?.email]
  )

  const enriched = useMemo(() => {
    return [...myBookings]
      .map(b => ({
        ...b,
        stayStatus: bookingLedgerStatus(b),
        gradient: b.gradient || 'linear-gradient(160deg, #2d3e35 0%, #1a2420 100%)',
        type: b.type || 'Stay',
      }))
      .sort((a, b) => {
        const aOff = a.stayStatus === 'cancelled' || a.stayStatus === 'refunded'
        const bOff = b.stayStatus === 'cancelled' || b.stayStatus === 'refunded'
        if (aOff !== bOff) return aOff ? 1 : -1
        if (a.stayStatus === 'upcoming' && b.stayStatus !== 'upcoming') return -1
        if (b.stayStatus === 'upcoming' && a.stayStatus !== 'upcoming') return 1
        return (a.checkIn || '').localeCompare(b.checkIn || '')
      })
  }, [myBookings])

  const stats = useMemo(() => {
    const totalSpend = myBookingsForStats.reduce((s, b) => s + (Number(b.total) || 0), 0)
    const nights = myBookingsForStats.reduce((s, b) => s + (Number(b.nights) || 0), 0)
    const upcoming = myBookingsForStats.filter(b => deriveStayStatus(b.checkOut) === 'upcoming')
      .length
    const tier = totalSpend >= 500000 ? 'Gold' : totalSpend >= 150000 ? 'Silver' : 'Member'
    return {
      totalSpend,
      nights,
      upcoming,
      tripCount: myBookingsForStats.length,
      tier,
    }
  }, [myBookingsForStats])

  const todayYmd = new Date().toISOString().slice(0, 10)
  const unreadCount = notifications.filter(n => !n.read).length

  const openReview = b => {
    setReviewOpenForId(b.id)
    setReviewRating(5)
    setReviewComment('')
  }

  const submitReview = b => {
    const res = addPropertyReview({
      propertyId: b.propertyId,
      bookingId: b.id,
      guestEmail: user.email,
      rating: reviewRating,
      comment: reviewComment,
    })
    if (!res?.ok) {
      showToast(res?.reason === 'already_reviewed' ? 'You already reviewed this stay.' : 'Could not save review.')
      return
    }
    showToast('Thanks — your review is on the listing.')
    setReviewOpenForId(null)
    try {
      pushInAppNotification({
        title: 'Review published',
        body: `${b.property || 'Stay'} — thank you for your feedback.`,
        href: b.propertyId ? `/property/${b.propertyId}` : '/properties',
        recipientEmail: user?.email,
      })
      window.dispatchEvent(new Event('ns-notifications'))
    } catch {
      /* ignore */
    }
  }

  const cancelGuestBooking = b => {
    if (!window.confirm('Cancel this reservation? Refunds follow your listing policy and payment provider.')) return
    patchBooking(b.id, { status: 'cancelled' })
    showToast('Booking cancelled.')
    try {
      pushInAppNotification({
        title: 'Booking cancelled',
        body: `${b.property || 'Stay'} — ${b.checkIn} → ${b.checkOut}`,
        href: '/bookings',
        recipientEmail: user?.email,
      })
      window.dispatchEvent(new Event('ns-notifications'))
    } catch {
      /* ignore */
    }
  }

  const canGuestCancel = b => {
    if (isInactiveBooking(b)) return false
    if (deriveStayStatus(b.checkOut) !== 'upcoming') return false
    if (!b.checkIn || b.checkIn <= todayYmd) return false
    return true
  }

  const openModifyModal = b => {
    setModifyBooking(b)
    setModCheckIn(b.checkIn || '')
    setModCheckOut(b.checkOut || '')
  }

  const submitModificationRequest = () => {
    if (!modifyBooking || !modCheckIn || !modCheckOut) {
      showToast('Choose new check-in and check-out.')
      return
    }
    const prop = mergedCatalogProperties.find(p => String(p.id) === String(modifyBooking.propertyId))
    const others = bookings.filter(x => String(x.id) !== String(modifyBooking.id))
    if (prop) {
      const avail = validateStayAvailability(prop, modCheckIn, modCheckOut, others)
      if (!avail.ok) {
        showToast(avail.message)
        return
      }
    }
    patchBooking(modifyBooking.id, {
      modificationRequest: {
        status: 'pending',
        proposedCheckIn: modCheckIn,
        proposedCheckOut: modCheckOut,
        requestedAt: new Date().toISOString(),
      },
    })
    showToast('Date change sent to your host for approval.')
    setModifyBooking(null)
    try {
      window.dispatchEvent(new Event('ns-host-messages'))
    } catch {
      /* ignore */
    }
  }

  const requestRefund = b => {
    if (!window.confirm('Request a full refund for this stay? The host or platform will review.')) return
    patchBooking(b.id, {
      refundRequest: { status: 'pending', requestedAt: new Date().toISOString() },
    })
    showToast('Refund request submitted.')
  }

  const downloadInvoiceFor = b => {
    const html = buildBookingInvoiceHtml(b)
    const name = String(b.reference || b.id).replace(/\W+/g, '_')
    downloadInvoiceHtml(`nammastays-invoice-${name}.html`, html)
    showToast('Invoice downloaded.')
  }

  const sendMessageToHost = () => {
    if (!messageBooking || !messageBody.trim()) return
    const to = String(messageBooking.hostOwnerEmail || 'hosts@nammastays.com')
      .trim()
      .toLowerCase()
    appendHostMessage({
      fromEmail: user.email,
      toEmail: to,
      body: messageBody.trim(),
      bookingId: messageBooking.id,
      propertyId: messageBooking.propertyId,
      propertyName: messageBooking.property,
    })
    showToast('Message sent to host inbox.')
    setMessageBooking(null)
    setMessageBody('')
  }

  const submitDispute = () => {
    if (!debateBooking || !disputeReason.trim()) return
    appendDispute({
      bookingId: debateBooking.id,
      openedByEmail: user.email,
      reason: disputeReason.trim(),
    })
    showToast('Dispute opened — ops will review.')
    setDebateBooking(null)
    setDisputeReason('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="section-label">Guest dashboard</div>
        <h1 className={styles.title}>My account</h1>
        <p className={styles.sub}>From discovery to confirmation — your NammaStays journey</p>
      </div>

      <div className={styles.content}>
        <div className={styles.dashTabs}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'stays', label: `My stays${myBookings.length ? ` (${myBookings.length})` : ''}` },
            {
              id: 'alerts',
              label: `Alerts${unreadCount ? ` (${unreadCount})` : ''}`,
            },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              className={`${styles.dashTab} ${dashTab === t.id ? styles.dashTabActive : ''}`}
              onClick={() => setDashTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {dashTab === 'overview' && (
          <>
            <div className={styles.profileCard}>
              <div className={styles.profileAvatar} aria-hidden>
                <User size={28} />
              </div>
              <div className={styles.profileBody}>
                <h2 className={styles.profileName}>{user.name}</h2>
                <div className={styles.profileRow}>
                  <Mail size={14} className={styles.profileIcon} />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className={styles.profileRow}>
                    <Phone size={14} className={styles.profileIcon} />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className={styles.profileMeta}>
                  <span className={styles.tierBadge}>{stats.tier}</span>
                  <span>Member since {formatJoined(user.joinedAt)}</span>
                  {(user.role === 'owner' || hostListingCount > 0) && (
                    <span className={styles.roleNote}>
                      {user.role === 'owner'
                        ? 'Property owner — use Switch to Hosting in the menu for your listings.'
                        : 'You have submitted listings — use Switch to Hosting in the menu to manage them.'}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className="btn-outline" onClick={() => navigate('/properties')}>
                Book another stay
              </button>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <Wallet size={20} className={styles.statIcon} />
                <div className={styles.statValue}>₹{stats.totalSpend.toLocaleString('en-IN')}</div>
                <div className={styles.statLabel}>Lifetime spend</div>
                <div className={styles.statHint}>
                  Confirmed stays only (cancelled/refunded excluded) · sets your service fee tier
                </div>
              </div>
              <div className={styles.statCard}>
                <Sparkles size={20} className={styles.statIcon} />
                <div className={styles.statValue}>{stats.tripCount}</div>
                <div className={styles.statLabel}>Stays with us</div>
                <div className={styles.statHint}>Every booking is curated</div>
              </div>
              <div className={styles.statCard}>
                <Moon size={20} className={styles.statIcon} />
                <div className={styles.statValue}>{stats.nights}</div>
                <div className={styles.statLabel}>Nights booked</div>
                <div className={styles.statHint}>Across active reservations</div>
              </div>
              <div className={styles.statCard}>
                <Calendar size={20} className={styles.statIcon} />
                <div className={styles.statValue}>{stats.upcoming}</div>
                <div className={styles.statLabel}>Upcoming trips</div>
                <div className={styles.statHint}>Check My stays for details</div>
              </div>
            </div>

            <div className={styles.flowCard}>
              <h3 className={styles.flowTitle}>How your journey works</h3>
              <ol className={styles.flowList}>
                <li>
                  <strong>Browse</strong> — Explore the collection and open any property.
                </li>
                <li>
                  <strong>Reserve</strong> — Pick dates & guests, sign in, then pay securely.
                </li>
                <li>
                  <strong>Confirm</strong> — You get a reference code; it appears under My stays. In-app alerts list
                  confirmations here too.
                </li>
                <li>
                  <strong>Stay</strong> — Your concierge reaches out before check-in with final details.
                </li>
              </ol>
            </div>
          </>
        )}

        {dashTab === 'alerts' && (
          <div className={styles.alertsWrap}>
            <div className={styles.alertsHeader}>
              <Bell size={18} className={styles.alertsBell} aria-hidden />
              <div>
                <h2 className={styles.alertsTitle}>In-app notifications</h2>
                <p className={styles.alertsSub}>
                  Booking confirmations and updates you make in this app appear here on this device. Email and push can be added
                  when you connect your messaging stack.
                </p>
              </div>
              {notifications.length > 0 && (
                <button type="button" className="btn-ghost" onClick={() => markAllNotificationsRead()}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className={styles.empty} style={{ padding: '40px 0' }}>
                <p className={styles.emptySub}>No alerts yet. Complete or change a booking to see entries here.</p>
              </div>
            ) : (
              <ul className={styles.notifList}>
                {notifications.map(n => (
                  <li key={n.id} className={`${styles.notifItem} ${n.read ? styles.notifRead : ''}`}>
                    <button
                      type="button"
                      className={styles.notifBody}
                      onClick={() => {
                        markNotificationRead(n.id)
                        if (n.href) navigate(n.href)
                      }}
                    >
                      <span className={styles.notifTitle}>{n.title}</span>
                      <span className={styles.notifMeta}>{n.body}</span>
                      <span className={styles.notifTime}>
                        {n.at ? new Date(n.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {dashTab === 'stays' && (
          <>
            {enriched.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyGlyph}>◇</span>
                <h2 className={styles.emptyTitle}>No stays yet</h2>
                <p className={styles.emptySub}>
                  When you complete a booking, it shows up here with your reference and dates. Start from the collection.
                </p>
                <button type="button" className="btn-gold" onClick={() => navigate('/properties')}>
                  Explore the collection <ArrowRight size={14} />
                </button>
              </div>
            ) : (
              <div className={styles.list}>
                {enriched.map(b => (
                  <div
                    key={b.id}
                    className={`${styles.stayCard} ${isInactiveBooking(b) ? styles.stayCardMuted : ''}`}
                  >
                    <div className={styles.cardImage} style={{ background: b.gradient }} />
                    <div className={styles.cardBody}>
                      <div className={styles.cardType}>{b.type}</div>
                      <h3 className={styles.cardName}>{b.property}</h3>
                      <div className={styles.cardLoc}>
                        <MapPin size={11} color="var(--sage-mid)" />
                        {b.location}
                      </div>
                      <div className={styles.cardMeta}>
                        <div className={styles.cardMetaItem}>
                          <Calendar size={12} />
                          {b.checkIn} → {b.checkOut}
                        </div>
                        <div className={styles.cardMetaItem}>
                          {b.nights} nights · {b.guests} guests
                        </div>
                        {b.reference && <div className={styles.refLine}>Ref · {b.reference}</div>}
                        {b.modificationRequest?.status === 'pending' && (
                          <div className={styles.pendingBanner}>
                            Date change pending host approval ({b.modificationRequest.proposedCheckIn} →{' '}
                            {b.modificationRequest.proposedCheckOut})
                          </div>
                        )}
                        {b.refundRequest?.status === 'pending' && (
                          <div className={styles.pendingBanner}>Refund request under review</div>
                        )}
                      </div>
                      {reviewOpenForId != null && String(reviewOpenForId) === String(b.id) && (
                        <div className={styles.reviewBox}>
                          <div className={styles.reviewLabel}>Your rating</div>
                          <div className={styles.starRow} role="group" aria-label="Star rating">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                type="button"
                                className={styles.starBtn}
                                aria-pressed={reviewRating >= star}
                                onClick={() => setReviewRating(star)}
                              >
                                <Star
                                  size={20}
                                  fill={reviewRating >= star ? 'var(--gold)' : 'transparent'}
                                  color="var(--gold)"
                                />
                              </button>
                            ))}
                          </div>
                          <label className={styles.reviewLabel} htmlFor={`rv-cmt-${b.id}`}>
                            Comment (optional)
                          </label>
                          <textarea
                            id={`rv-cmt-${b.id}`}
                            className={`form-input ${styles.reviewTextarea}`}
                            rows={3}
                            value={reviewComment}
                            onChange={e => setReviewComment(e.target.value)}
                            placeholder="What stood out about your stay?"
                          />
                          <div className={styles.reviewActions}>
                            <button type="button" className="btn-gold" onClick={() => submitReview(b)}>
                              Submit review
                            </button>
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ fontSize: '12px' }}
                              onClick={() => setReviewOpenForId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.cardRight}>
                      <div
                        className={`${styles.status} ${styles[b.stayStatus] || styles.completed}`}
                      >
                        {b.stayStatus === 'refunded' ? 'refunded' : b.stayStatus}
                      </div>
                      <div className={styles.total}>₹{Number(b.total).toLocaleString('en-IN')}</div>
                      {b.stayStatus === 'completed' && !isInactiveBooking(b) && (
                        <div className={styles.rating}>
                          <Star size={12} fill="var(--gold)" color="var(--gold)" />
                          {hasReviewForBooking(b.id) ? 'Review submitted' : 'How was your stay?'}
                        </div>
                      )}
                      <div className={styles.stayActions}>
                        {canGuestCancel(b) && (
                          <button
                            type="button"
                            className="btn-outline"
                            style={{ padding: '10px 16px', fontSize: '12px' }}
                            onClick={() => cancelGuestBooking(b)}
                          >
                            <XCircle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
                            Cancel booking
                          </button>
                        )}
                        {!isInactiveBooking(b) &&
                          b.stayStatus === 'upcoming' &&
                          canGuestCancel(b) &&
                          !b.modificationRequest?.status && (
                            <button
                              type="button"
                              className="btn-ghost"
                              style={{ fontSize: '12px' }}
                              onClick={() => openModifyModal(b)}
                            >
                              Change dates
                            </button>
                          )}
                        {!isInactiveBooking(b) && b.status !== 'refunded' && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: '12px' }}
                            onClick={() => requestRefund(b)}
                            disabled={b.refundRequest?.status === 'pending'}
                          >
                            Request refund
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '12px' }}
                          onClick={() => downloadInvoiceFor(b)}
                        >
                          <FileText size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
                          Invoice
                        </button>
                        {!isInactiveBooking(b) && (
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: '12px' }}
                            onClick={() => {
                              setMessageBooking(b)
                              setMessageBody('')
                            }}
                          >
                            <MessageSquare size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
                            Message host
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '12px', color: 'var(--danger, #c0392b)' }}
                          onClick={() => {
                            setDebateBooking(b)
                            setDisputeReason('')
                          }}
                        >
                          <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
                          Dispute
                        </button>
                        {b.stayStatus === 'completed' &&
                          !isInactiveBooking(b) &&
                          !hasReviewForBooking(b.id) &&
                          reviewOpenForId == null && (
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '10px 16px', fontSize: '12px' }}
                              onClick={() => openReview(b)}
                            >
                              Leave a review
                            </button>
                          )}
                        <button
                          type="button"
                          className="btn-outline"
                          style={{ padding: '10px 20px', fontSize: '13px' }}
                          onClick={() => navigate(b.propertyId ? `/property/${b.propertyId}` : '/properties')}
                        >
                          View property
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modifyBooking && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="mod-title">
          <div className={styles.modalBox}>
            <h2 id="mod-title" className={styles.modalTitle}>
              Request new dates
            </h2>
            <p className={styles.modalSub}>Host must approve. Your stay: {modifyBooking.property}</p>
            <div className={styles.modalFields}>
              <label className={styles.reviewLabel} htmlFor="mod-in">
                Check-in
              </label>
              <input
                id="mod-in"
                type="date"
                className="form-input"
                value={modCheckIn}
                onChange={e => setModCheckIn(e.target.value)}
              />
              <label className={styles.reviewLabel} htmlFor="mod-out">
                Check-out
              </label>
              <input
                id="mod-out"
                type="date"
                className="form-input"
                value={modCheckOut}
                min={modCheckIn}
                onChange={e => setModCheckOut(e.target.value)}
              />
            </div>
            <div className={styles.reviewActions}>
              <button type="button" className="btn-gold" onClick={submitModificationRequest}>
                Submit request
              </button>
              <button type="button" className="btn-ghost" onClick={() => setModifyBooking(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {messageBooking && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>Message host · {messageBooking.property}</h2>
            <textarea
              className={`form-input ${styles.reviewTextarea}`}
              rows={4}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder="Your message…"
            />
            <div className={styles.reviewActions}>
              <button type="button" className="btn-gold" onClick={sendMessageToHost}>
                Send
              </button>
              <button type="button" className="btn-ghost" onClick={() => setMessageBooking(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {debateBooking && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <h2 className={styles.modalTitle}>Open dispute</h2>
            <p className={styles.modalSub}>Booking {debateBooking.reference || debateBooking.id}</p>
            <textarea
              className={`form-input ${styles.reviewTextarea}`}
              rows={4}
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
              placeholder="Describe the issue…"
            />
            <div className={styles.reviewActions}>
              <button type="button" className="btn-gold" onClick={submitDispute}>
                Submit
              </button>
              <button type="button" className="btn-ghost" onClick={() => setDebateBooking(null)}>
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
