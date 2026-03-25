import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Star, Calendar, ArrowRight, Wallet, Moon, Sparkles, User, Mail, Phone } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Footer from '../components/Footer'
import styles from './Bookings.module.css'

function deriveStayStatus(checkOutYmd) {
  const today = new Date().toISOString().slice(0, 10)
  return checkOutYmd > today ? 'upcoming' : 'completed'
}

function formatJoined(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function Bookings() {
  const navigate = useNavigate()
  const { user, bookings, hostListingsByEmail } = useApp()
  const hostListingCount = user
    ? hostListingsByEmail[user.email?.toLowerCase?.() || '']?.length || 0
    : 0
  const [dashTab, setDashTab] = useState('overview')

  const enriched = useMemo(() => {
    return [...bookings]
      .map(b => ({
        ...b,
        stayStatus: deriveStayStatus(b.checkOut),
        gradient: b.gradient || 'linear-gradient(160deg, #2d3e35 0%, #1a2420 100%)',
        type: b.type || 'Stay',
      }))
      .sort((a, b) => {
        if (a.stayStatus !== b.stayStatus) return a.stayStatus === 'upcoming' ? -1 : 1
        return (a.checkIn || '').localeCompare(b.checkIn || '')
      })
  }, [bookings])

  const stats = useMemo(() => {
    const totalSpend = bookings.reduce((s, b) => s + (Number(b.total) || 0), 0)
    const nights = bookings.reduce((s, b) => s + (Number(b.nights) || 0), 0)
    const upcoming = bookings.filter(b => deriveStayStatus(b.checkOut) === 'upcoming').length
    const tier = totalSpend >= 500000 ? 'Gold' : totalSpend >= 150000 ? 'Silver' : 'Member'
    return { totalSpend, nights, upcoming, tripCount: bookings.length, tier }
  }, [bookings])

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
            { id: 'stays', label: `My stays${bookings.length ? ` (${bookings.length})` : ''}` },
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
                <div className={styles.statHint}>On completed & confirmed stays</div>
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
                <div className={styles.statHint}>Across all reservations</div>
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
                <li><strong>Browse</strong> — Explore the collection and open any property.</li>
                <li><strong>Reserve</strong> — Pick dates & guests, sign in, then pay securely.</li>
                <li><strong>Confirm</strong> — You get a reference code and email; it appears here under My stays.</li>
                <li><strong>Stay</strong> — Your concierge reaches out before check-in with final details.</li>
              </ol>
            </div>
          </>
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
                  <div key={b.id} className={styles.stayCard}>
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
                        {b.reference && (
                          <div className={styles.refLine}>Ref · {b.reference}</div>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <div className={`${styles.status} ${styles[b.stayStatus]}`}>{b.stayStatus}</div>
                      <div className={styles.total}>₹{Number(b.total).toLocaleString('en-IN')}</div>
                      {b.stayStatus === 'completed' && (
                        <div className={styles.rating}>
                          <Star size={12} fill="var(--gold)" color="var(--gold)" />
                          Curated stay
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn-outline"
                        style={{ padding: '10px 20px', fontSize: '13px', marginTop: 12 }}
                        onClick={() => navigate(b.propertyId ? `/property/${b.propertyId}` : '/properties')}
                      >
                        View property
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
