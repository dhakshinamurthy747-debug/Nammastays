import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, Star, Users, BedDouble, Bath, Maximize, Check, ArrowLeft, ArrowRight, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Footer from '../components/Footer'
import styles from './PropertyDetail.module.css'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, showToast, mergedCatalogProperties } = useApp()
  const pid = Number(id)
  const property = mergedCatalogProperties.find(p => p.id === pid)
  const ratingHero =
    property && property.newListing && !(property.reviews > 0)
      ? 'New listing'
      : property
        ? `${property.rating} (${property.reviews} reviews)`
        : ''
  const ratingSidebar =
    property && property.newListing && !(property.reviews > 0)
      ? 'New listing · be the first to stay'
      : property
        ? `${property.rating} · ${property.reviews} reviews`
        : ''

  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(2)

  useEffect(() => {
    const draft = location.state?.bookingDraft
    if (!draft || !property || Number(draft.propertyId) !== property.id) return
    if (draft.checkIn) setCheckIn(draft.checkIn)
    if (draft.checkOut) setCheckOut(draft.checkOut)
    if (draft.guests) setGuests(Number(draft.guests))
    navigate(location.pathname, { replace: true, state: {} })
  }, [property, location.pathname, location.state, navigate])

  if (!property)
    return (
      <div className={styles.missing}>
        <div className={styles.missingCode} aria-hidden>
          —
        </div>
        <p className={styles.missingText}>This property isn&apos;t in our collection. It may have been removed or the link is wrong.</p>
        <div className={styles.missingLinks}>
          <Link to="/properties" className="btn-gold" style={{ textDecoration: 'none' }}>
            Browse all properties
          </Link>
          <Link to="/help" className={styles.missingHome}>
            Help centre
          </Link>
          <Link to="/" className={styles.missingHome}>
            Return home
          </Link>
        </div>
      </div>
    )

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0
  const total = nights * property.price

  const handleBook = () => {
    if (!checkIn || !checkOut) { showToast('Please select your dates.'); return }
    if (nights < 1) { showToast('Check-out must be after check-in.'); return }
    if (!user) {
      showToast('Sign in to continue to payment.')
      navigate('/login', {
        state: {
          from: location.pathname,
          bookingDraft: { propertyId: property.id, checkIn, checkOut, guests },
        },
      })
      return
    }
    navigate('/payment', { state: { property, checkIn, checkOut, guests, nights, total } })
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero} style={{ background: property.gradient }}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <button type="button" className={styles.back} onClick={() => navigate('/properties')}>
            <ArrowLeft size={14} /> Back to Collection
          </button>
          <div className={styles.heroType}>{property.type}</div>
          <h1 className={styles.heroTitle}>{property.name}</h1>
          <p className={styles.heroTagline}>{property.tagline}</p>
          <div className={styles.heroMeta}>
            <div className={styles.metaItem}><MapPin size={13} />{property.location}</div>
            <div className={styles.metaItem}><Star size={13} fill="var(--gold)" color="var(--gold)" />{ratingHero}</div>
            <div className={styles.metaItem}><Users size={13} />Up to {property.guests} guests</div>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left: Details */}
        <div className={styles.main}>
          {/* Stats */}
          <div className={styles.statsRow}>
            {[
              { icon: <BedDouble size={16} />, val: property.bedrooms, label: 'Bedrooms' },
              { icon: <Bath size={16} />, val: property.baths, label: 'Bathrooms' },
              { icon: <Users size={16} />, val: property.guests, label: 'Max Guests' },
              { icon: <Maximize size={16} />, val: `${property.sqft.toLocaleString()} ft²`, label: 'Living Space' },
            ].map((s, i) => (
              <div key={i} className={styles.statCard}>
                <div className={styles.statIcon}>{s.icon}</div>
                <div className={styles.statVal}>{s.val}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className={styles.section}>
            <div className="section-label">About This Property</div>
            <div className="gold-line" style={{ margin: '14px 0 20px' }} />
            <p className={styles.description}>{property.description}</p>
          </div>

          {/* Amenities */}
          <div className={styles.section}>
            <div className="section-label">Included Amenities</div>
            <div className="gold-line" style={{ margin: '14px 0 24px' }} />
            <div className={styles.amenitiesGrid}>
              {property.amenities.map(a => (
                <div key={a} className={styles.amenityItem}>
                  <Check size={12} color="var(--gold)" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Owner */}
          <div className={styles.section}>
            <div className="section-label">Your Host</div>
            <div className="gold-line" style={{ margin: '14px 0 20px' }} />
            <div className={styles.ownerCard}>
              <div className={styles.ownerAvatar}>{property.owner.name[0]}</div>
              <div>
                <div className={styles.ownerName}>{property.owner.name}</div>
                <div className={styles.ownerSince}>NammaStays Host since {property.owner.since}</div>
                <p className={styles.ownerNote}>Your host speaks English and is available 24/7 via your dedicated concierge line throughout your stay.</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className={styles.section}>
            <div className="section-label">Signature Experiences</div>
            <div className="gold-line" style={{ margin: '14px 0 20px' }} />
            <div className={styles.tagRow}>
              {property.tags.map(t => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Booking Card */}
        <div className={styles.sidebar}>
          <div className={styles.bookingCard}>
            <div className={styles.priceRow}>
              <span className={styles.price}>₹{property.price.toLocaleString('en-IN')}</span>
              <span className={styles.priceLabel}>/ night</span>
            </div>
            <div className={styles.ratingRow}>
              <Star size={12} fill="var(--gold)" color="var(--gold)" />
              <span>{ratingSidebar}</span>
            </div>

            <div className={styles.divider} />

            <div className={styles.dateRow}>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Check In</label>
                <input
                  type="date" className={styles.dateInput}
                  value={checkIn} min={new Date().toISOString().split('T')[0]}
                  onChange={e => setCheckIn(e.target.value)}
                />
              </div>
              <div className={styles.dateField}>
                <label className={styles.dateLabel}>Check Out</label>
                <input
                  type="date" className={styles.dateInput}
                  value={checkOut} min={checkIn || new Date().toISOString().split('T')[0]}
                  onChange={e => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.guestField}>
              <label className={styles.dateLabel}>Guests</label>
              <select
                className={styles.dateInput}
                value={guests}
                onChange={e => setGuests(Number(e.target.value))}
              >
                {Array.from({ length: property.guests }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                ))}
              </select>
            </div>

            {nights > 0 && (
              <div className={styles.breakdown}>
                <div className={styles.breakdownRow}>
                  <span>₹{property.price.toLocaleString('en-IN')} × {nights} nights</span>
                  <span>₹{(property.price * nights).toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.breakdownRow}>
                  <span>NammaStays service</span>
                  <span>Included</span>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Concierge</span>
                  <span>Included</span>
                </div>
                <div className={styles.divider} />
                <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
                  <span>Total</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            <button
              type="button"
              className={`btn-gold w-full ${!property.available ? styles.disabled : ''}`}
              style={{ justifyContent: 'center', marginTop: 20, width: '100%' }}
              onClick={handleBook}
              disabled={!property.available}
            >
              {property.available ? (<>Reserve Now <ArrowRight size={14} /></>) : 'Fully Booked'}
            </button>

            <p className={styles.note}>
              <Calendar size={11} /> Minimum nights and house rules are set by the host · Cancellation at checkout
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

