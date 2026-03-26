import React, { useState, useEffect, useMemo } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { MapPin, Star, Users, BedDouble, Bath, Maximize, Check, ArrowLeft, ArrowRight, Calendar, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { computeGuestBookingBreakdown, sumGuestLifetimeSpend } from '../utils/guestPricing'
import { getPlatformCommissionRate } from '../utils/platformSettings'
import {
  buildNightlyPricesForStay,
  validateStayAvailability,
} from '../utils/hostCatalogMerge'
import { findActivePromo } from '../utils/promoResolve'
import Footer from '../components/Footer'
import styles from './PropertyDetail.module.css'

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, showToast, mergedCatalogProperties, bookings, hostPromotions } = useApp()
  const commissionRate = getPlatformCommissionRate()
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
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)

  useEffect(() => {
    const draft = location.state?.bookingDraft
    if (!draft || !property || Number(draft.propertyId) !== property.id) return
    if (draft.checkIn) setCheckIn(draft.checkIn)
    if (draft.checkOut) setCheckOut(draft.checkOut)
    if (draft.guests) setGuests(Number(draft.guests))
    navigate(location.pathname, { replace: true, state: {} })
  }, [property, location.pathname, location.state, navigate])

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000))
    : 0

  const lifetimeSpendBefore = useMemo(
    () => (user ? sumGuestLifetimeSpend(bookings, user.email) : 0),
    [bookings, user]
  )

  const stayQuote = useMemo(() => {
    if (!property || nights <= 0 || !checkIn || !checkOut) return null
    const { nightlyPrices, stayMinNights } = buildNightlyPricesForStay(property, checkIn, checkOut)
    const pricing = computeGuestBookingBreakdown({
      nightlyPrices,
      lifetimeSpendBefore,
      platformCommissionRate: commissionRate,
      promoDiscountPct: promoApplied?.discountPct || 0,
    })
    return { pricing, stayMinNights, nightlyPrices }
  }, [property, nights, checkIn, checkOut, lifetimeSpendBefore, commissionRate, promoApplied])

  const pricing = stayQuote?.pricing ?? null
  const stayMinNights = stayQuote?.stayMinNights ?? property?.minStayNights ?? 2
  const nightlyPricesForStay = stayQuote?.nightlyPrices ?? []
  const uniformNightly =
    nightlyPricesForStay.length > 0 && nightlyPricesForStay.every(x => x === nightlyPricesForStay[0])

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

  const handleBook = () => {
    if (!checkIn || !checkOut) { showToast('Please select your dates.'); return }
    if (nights < 1) { showToast('Check-out must be after check-in.'); return }
    if (nights < stayMinNights) {
      showToast(`Minimum stay is ${stayMinNights} night${stayMinNights === 1 ? '' : 's'} for these dates.`)
      return
    }
    const avail = validateStayAvailability(property, checkIn, checkOut, bookings)
    if (!avail.ok) {
      showToast(avail.message)
      return
    }
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
    if (!pricing) {
      showToast('Unable to calculate total. Please re-select dates.')
      return
    }
    navigate('/payment', {
      state: {
        property,
        checkIn,
        checkOut,
        guests,
        nights,
        total: pricing.grandTotal,
        pricing,
        promoCode: promoApplied?.code || '',
        promoDiscountPct: promoApplied?.discountPct || 0,
      },
    })
  }

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        {property.image ? (
          <div
            className={styles.heroPhoto}
            style={{ backgroundImage: `url(${property.image})` }}
            aria-hidden
          />
        ) : (
          <div className={styles.heroFallback} style={{ background: property.gradient }} aria-hidden />
        )}
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

          {(property.cancellationPolicyText ||
            property.houseRulesText ||
            (Array.isArray(property.policyAttachments) && property.policyAttachments.length > 0)) && (
            <div className={styles.section}>
              <div className="section-label">Policies & documents</div>
              <div className="gold-line" style={{ margin: '14px 0 20px' }} />
              {property.cancellationPolicyText && (
                <div className={styles.policyBlock}>
                  <div className={styles.policyTitle}>Cancellation</div>
                  <p className={styles.policyText}>{property.cancellationPolicyText}</p>
                </div>
              )}
              {property.houseRulesText && (
                <div className={styles.policyBlock}>
                  <div className={styles.policyTitle}>House rules</div>
                  <p className={styles.policyText}>{property.houseRulesText}</p>
                </div>
              )}
              {Array.isArray(property.policyAttachments) && property.policyAttachments.length > 0 && (
                <div className={styles.policyBlock}>
                  <div className={styles.policyTitle}>Attachments</div>
                  <ul className={styles.policyLinks}>
                    {property.policyAttachments.map((a, i) => (
                      <li key={i}>
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.policyLink}>
                          <FileText size={14} aria-hidden /> {a.label || 'Download'}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

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

            <div className={styles.guestField}>
              <label className={styles.dateLabel}>Promo code (optional)</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  className={styles.dateInput}
                  value={promoInput}
                  onChange={e => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="e.g. EXT12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="btn-outline"
                  style={{ padding: '10px 14px', fontSize: '11px', flexShrink: 0, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    const hit = findActivePromo(hostPromotions, property.id, promoInput)
                    if (!hit) {
                      setPromoApplied(null)
                      showToast('Code not valid for this property or inactive.')
                      return
                    }
                    setPromoApplied({ code: hit.code, discountPct: hit.discountPct })
                    showToast(`${hit.discountPct}% off applied to room total.`)
                  }}
                >
                  Apply
                </button>
              </div>
              {promoApplied && (
                <p className={styles.breakdownHint} style={{ marginTop: 8 }}>
                  {promoApplied.discountPct}% off room · code {promoApplied.code}
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginLeft: 8, padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => { setPromoApplied(null); setPromoInput('') }}
                  >
                    Remove
                  </button>
                </p>
              )}
            </div>

            {nights > 0 && pricing && (
              <div className={styles.breakdown}>
                <div className={styles.breakdownRow}>
                  <span>
                    {uniformNightly
                      ? `₹${(nightlyPricesForStay[0] ?? property.price).toLocaleString('en-IN')} × ${nights} nights`
                      : `Room total (${nights} nights · mixed rates)`}
                  </span>
                  <span>₹{pricing.roomSubtotal.toLocaleString('en-IN')}</span>
                </div>
                {!uniformNightly && nightlyPricesForStay.length > 0 && (
                  <p className={styles.breakdownHint}>Nightly rate follows the host&apos;s calendar and bulk rules.</p>
                )}
                {pricing.promoDiscountAmount > 0 && (
                  <div className={styles.breakdownRow}>
                    <span>Promo · {promoApplied?.code} ({pricing.promoDiscountPct}% off room)</span>
                    <span>−₹{pricing.promoDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className={styles.breakdownRow}>
                  <span>GST ({pricing.gstPercentLabel}%)</span>
                  <span>₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className={styles.breakdownRow}>
                  <span>Service fee ({pricing.serviceFeePercentLabel}%)</span>
                  <span>₹{pricing.serviceFeeAmount.toLocaleString('en-IN')}</span>
                </div>
                <p className={styles.breakdownHint}>{pricing.serviceFeeTierNote}</p>
                <div className={styles.divider} />
                <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
                  <span>Total</span>
                  <span>₹{pricing.grandTotal.toLocaleString('en-IN')}</span>
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
              <Calendar size={11} /> Min {stayMinNights} night{stayMinNights === 1 ? '' : 's'} for selected dates ·
              Cancellation at checkout
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

