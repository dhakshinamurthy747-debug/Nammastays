import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, CreditCard, Check, ArrowLeft, Star, MapPin, Shield, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { STORAGE_KEYS } from '../utils/constants'
import styles from './Payment.module.css'

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()
  const { addBooking, showToast, user } = useApp()

  const [bookingState, setBookingState] = useState(null)
  const [step, setStep] = useState(1) // 1: details, 2: confirm, 3: success
  const [confirmationRef, setConfirmationRef] = useState(null)
  const [form, setForm] = useState({
    cardName: '', cardNumber: '', expiry: '', cvv: '',
    billingAddress: '', city: '', country: '', zip: '',
    specialRequests: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [stay, setStay] = useState({ checkIn: '', checkOut: '', guests: 2 })

  useEffect(() => {
    if (location.state?.property?.id) {
      setBookingState(location.state)
      try {
        sessionStorage.setItem(STORAGE_KEYS.PAYMENT_RESUME, JSON.stringify(location.state))
      } catch {
        /* ignore */
      }
      return
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.PAYMENT_RESUME)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.property?.id) setBookingState(parsed)
      }
    } catch {
      /* ignore */
    }
  }, [location.state])

  useEffect(() => {
    if (!bookingState || user) return
    try {
      sessionStorage.setItem(STORAGE_KEYS.PAYMENT_RESUME, JSON.stringify(bookingState))
    } catch {
      /* ignore */
    }
    showToast('Please sign in to complete payment.')
    navigate('/login', { replace: true, state: { from: '/payment' } })
  }, [bookingState, user, navigate, showToast])

  useEffect(() => {
    if (!bookingState?.property) return
    setStay({
      checkIn: bookingState.checkIn || '',
      checkOut: bookingState.checkOut || '',
      guests: Math.min(
        Math.max(1, Number(bookingState.guests) || 1),
        bookingState.property.guests
      ),
    })
  }, [bookingState])

  useEffect(() => {
    if (!bookingState?.property?.id) return
    const n =
      stay.checkIn && stay.checkOut
        ? Math.max(
            0,
            Math.round(
              (new Date(`${stay.checkOut}T12:00:00`) - new Date(`${stay.checkIn}T12:00:00`)) /
                86400000
            )
          )
        : 0
    const t = n * bookingState.property.price
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.PAYMENT_RESUME,
        JSON.stringify({
          ...bookingState,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guests: stay.guests,
          nights: n,
          total: t,
        })
      )
    } catch {
      /* ignore */
    }
  }, [bookingState, stay])

  if (!bookingState) {
    return (
      <div style={{ padding: '200px 60px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--muted)' }}>No booking in progress.</h2>
        <p style={{ color: 'var(--body)', marginTop: 12 }}>Choose a property, select dates, and tap Reserve to start.</p>
        <button type="button" className="btn-outline" onClick={() => navigate('/properties')} style={{ marginTop: 32 }}>Browse properties</button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <p className={styles.waiting}>Redirecting to sign in…</p>
      </div>
    )
  }

  const { property } = bookingState
  const nights =
    stay.checkIn && stay.checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(`${stay.checkOut}T12:00:00`) - new Date(`${stay.checkIn}T12:00:00`)) / 86400000
          )
        )
      : 0
  const total = nights * property.price

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const todayYmd = new Date().toISOString().split('T')[0]

  const formatCard = val => val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  const formatExpiry = val => {
    val = val.replace(/\D/g, '').slice(0, 4)
    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2)
    return val
  }

  const validate = () => {
    const e = {}
    if (!form.cardName.trim()) e.cardName = 'Required'
    if (form.cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Invalid card number'
    if (form.expiry.length < 5) e.expiry = 'Invalid expiry'
    if (form.cvv.length < 3) e.cvv = 'Invalid CVV'
    if (!form.billingAddress.trim()) e.billingAddress = 'Required'
    if (!form.city.trim()) e.city = 'Required'
    if (!form.country.trim()) e.country = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const validateStay = () => {
    if (!stay.checkIn || !stay.checkOut) {
      showToast('Please select check-in and check-out dates.')
      return false
    }
    if (nights < 1) {
      showToast('Check-out must be at least one day after check-in.')
      return false
    }
    if (stay.guests > property.guests) {
      showToast(`This property welcomes up to ${property.guests} guests.`)
      return false
    }
    return true
  }

  const handleContinue = () => {
    if (!validateStay()) return
    if (!validate()) return
    setStep(2)
  }

  const handleConfirm = async () => {
    if (!validateStay()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 2000))
    const reference = `NS-${Date.now().toString(36).toUpperCase().slice(-10)}`
    addBooking({
      propertyId: property.id,
      property: property.name,
      location: property.location,
      type: property.type,
      gradient: property.gradient,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: stay.guests,
      total,
      nights,
      specialRequests: form.specialRequests || '',
      reference,
    })
    setConfirmationRef(reference)
    try {
      sessionStorage.removeItem(STORAGE_KEYS.PAYMENT_RESUME)
    } catch {
      /* ignore */
    }
    setLoading(false)
    setStep(3)
  }

  if (step === 3) return (
    <div className={styles.success}>
      <div className={styles.successInner}>
        <div className={styles.successIcon}><Check size={32} color="var(--dark)" /></div>
        <div className="section-label" style={{ marginBottom: 16 }}>Booking Confirmed</div>
        <h1 className={styles.successTitle}>Your stay is reserved.</h1>
        <p className={styles.successText}>
          A confirmation has been sent to <strong>{user?.email}</strong>. Your dedicated concierge will contact you within 24 hours to arrange all details.
        </p>
        {confirmationRef && (
          <p className={styles.referenceLine}>
            Reference: <strong>{confirmationRef}</strong>
          </p>
        )}
        <div className={styles.successCard}>
          <div className={styles.successProp}>{property.name}</div>
          <div className={styles.successLoc}><MapPin size={11} />{property.location}</div>
          <div className={styles.successDates}>
            <span>{stay.checkIn}</span>
            <span className={styles.arrow}>→</span>
            <span>{stay.checkOut}</span>
          </div>
          <div className={styles.successTotal}>
            ₹{total.toLocaleString('en-IN')} · {nights} nights · {stay.guests} guests
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap' }}>
          <button type="button" className="btn-gold" onClick={() => navigate('/bookings')}>View my dashboard</button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/')}>Back to home</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left: Form */}
        <div className={styles.formSide}>
          <button className={styles.back} onClick={() => step === 1 ? navigate(-1) : setStep(1)}>
            <ArrowLeft size={14} /> {step === 1 ? 'Back to Property' : 'Back to Payment'}
          </button>

          {/* Steps */}
          <div className={styles.steps}>
            {['Payment Details', 'Confirm & Pay'].map((s, i) => (
              <div key={i} className={`${styles.step} ${step > i + 1 ? styles.done : ''} ${step === i + 1 ? styles.active : ''}`}>
                <div className={styles.stepNum}>{step > i + 1 ? <Check size={12} /> : i + 1}</div>
                <span>{s}</span>
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className={styles.formBlock}>
              <h2 className={styles.formTitle}>Payment Details</h2>

              <div className={styles.staySection}>
                <div className={styles.staySectionTitle}>Your stay</div>
                <div className={styles.stayGrid}>
                  <div className={styles.stayField}>
                    <label className={styles.stayLabel} htmlFor="pay-checkin">
                      Check-in
                    </label>
                    <input
                      id="pay-checkin"
                      type="date"
                      className={styles.stayInput}
                      value={stay.checkIn}
                      min={todayYmd}
                      onChange={e => setStay(s => ({ ...s, checkIn: e.target.value }))}
                    />
                  </div>
                  <div className={styles.stayField}>
                    <label className={styles.stayLabel} htmlFor="pay-checkout">
                      Check-out
                    </label>
                    <input
                      id="pay-checkout"
                      type="date"
                      className={styles.stayInput}
                      value={stay.checkOut}
                      min={stay.checkIn || todayYmd}
                      onChange={e => setStay(s => ({ ...s, checkOut: e.target.value }))}
                    />
                  </div>
                  <div className={`${styles.stayField} ${styles.stayFieldGuests}`}>
                    <label className={styles.stayLabel} htmlFor="pay-guests">
                      Guests
                    </label>
                    <select
                      id="pay-guests"
                      className={styles.stayInput}
                      value={stay.guests}
                      onChange={e => setStay(s => ({ ...s, guests: Number(e.target.value) }))}
                    >
                      {Array.from({ length: property.guests }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'guest' : 'guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className={styles.stayHint}>
                  <Calendar size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
                  Adjust dates here if needed — totals update automatically before you pay.
                </p>
              </div>

              <div className={styles.cardHeader}>
                <CreditCard size={16} color="var(--gold)" />
                <span>Credit or Debit Card</span>
                <div className={styles.cardBrands}>
                  <span className={styles.brand}>VISA</span>
                  <span className={styles.brand}>MC</span>
                  <span className={styles.brand}>AMEX</span>
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={`form-group ${styles.fullWidth}`}>
                  <label className="form-label">Cardholder Name</label>
                  <input className={`form-input ${errors.cardName ? styles.inputError : ''}`} placeholder="As on card" value={form.cardName} onChange={e => set('cardName', e.target.value)} />
                  {errors.cardName && <span className={styles.error}>{errors.cardName}</span>}
                </div>
                <div className={`form-group ${styles.fullWidth}`}>
                  <label className="form-label">Card Number</label>
                  <input className={`form-input ${errors.cardNumber ? styles.inputError : ''}`} placeholder="0000 0000 0000 0000" value={form.cardNumber} onChange={e => set('cardNumber', formatCard(e.target.value))} />
                  {errors.cardNumber && <span className={styles.error}>{errors.cardNumber}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Expiry</label>
                  <input className={`form-input ${errors.expiry ? styles.inputError : ''}`} placeholder="MM/YY" value={form.expiry} onChange={e => set('expiry', formatExpiry(e.target.value))} />
                  {errors.expiry && <span className={styles.error}>{errors.expiry}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">CVV</label>
                  <input className={`form-input ${errors.cvv ? styles.inputError : ''}`} placeholder="•••" maxLength={4} value={form.cvv} onChange={e => set('cvv', e.target.value.replace(/\D/g, ''))} />
                  {errors.cvv && <span className={styles.error}>{errors.cvv}</span>}
                </div>
              </div>

              <div className={styles.sectionDivider}>Billing Address</div>

              <div className={styles.grid2}>
                <div className={`form-group ${styles.fullWidth}`}>
                  <label className="form-label">Street Address</label>
                  <input className={`form-input ${errors.billingAddress ? styles.inputError : ''}`} placeholder="123 Main St" value={form.billingAddress} onChange={e => set('billingAddress', e.target.value)} />
                  {errors.billingAddress && <span className={styles.error}>{errors.billingAddress}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className={`form-input ${errors.city ? styles.inputError : ''}`} placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
                  {errors.city && <span className={styles.error}>{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className={`form-input ${errors.country ? styles.inputError : ''}`} placeholder="Country" value={form.country} onChange={e => set('country', e.target.value)} />
                  {errors.country && <span className={styles.error}>{errors.country}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input className="form-input" placeholder="ZIP" value={form.zip} onChange={e => set('zip', e.target.value)} />
                </div>
              </div>

              <div className={styles.sectionDivider}>Special Requests</div>
              <div className="form-group">
                <label className="form-label">Notes for your concierge (optional)</label>
                <textarea className="form-input" rows={3} placeholder="Dietary requirements, celebration arrangements, arrival time..." value={form.specialRequests} onChange={e => set('specialRequests', e.target.value)} style={{ resize: 'vertical' }} />
              </div>

              <button className="btn-gold" style={{ marginTop: 32, width: '100%', justifyContent: 'center' }} onClick={handleContinue}>
                Review Booking <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={styles.formBlock}>
              <h2 className={styles.formTitle}>Confirm Your Booking</h2>
              <p className={styles.confirmNote}>Please review all details before confirming. Your card will be charged immediately upon confirmation.</p>

              <div className={styles.confirmGrid}>
                <div className={styles.confirmRow}><span>Property</span><strong>{property.name}</strong></div>
                <div className={styles.confirmRow}><span>Location</span><strong>{property.location}</strong></div>
                <div className={styles.confirmRow}><span>Check In</span><strong>{stay.checkIn}</strong></div>
                <div className={styles.confirmRow}><span>Check Out</span><strong>{stay.checkOut}</strong></div>
                <div className={styles.confirmRow}><span>Duration</span><strong>{nights} nights</strong></div>
                <div className={styles.confirmRow}><span>Guests</span><strong>{stay.guests}</strong></div>
                <div className={styles.confirmRow}><span>Card</span><strong>•••• {form.cardNumber.slice(-4)}</strong></div>
                {form.specialRequests && <div className={styles.confirmRow}><span>Requests</span><strong>{form.specialRequests}</strong></div>}
                <div className={`${styles.confirmRow} ${styles.totalConfirmRow}`}>
                  <span>Total Charged</span><strong>₹{total.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className={styles.guarantee}>
                <Shield size={16} color="var(--gold)" />
                <div>
                  <div className={styles.guaranteeTitle}>NammaStays Guarantee</div>
                  <div className={styles.guaranteeText}>Free cancellation up to 30 days before check-in. Your payment is held securely and released to the host on check-in day.</div>
                </div>
              </div>

              <button
                className="btn-gold"
                style={{ marginTop: 32, width: '100%', justifyContent: 'center', opacity: loading ? 0.7 : 1 }}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Confirm & Pay ₹${total.toLocaleString('en-IN')}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Summary */}
        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryHero} style={{ background: property.gradient }} />
            <div className={styles.summaryBody}>
              <div className={styles.summaryType}>{property.type}</div>
              <div className={styles.summaryName}>{property.name}</div>
              <div className={styles.summaryLoc}><MapPin size={11} />{property.location}</div>
              <div className={styles.summaryRating}><Star size={11} fill="var(--gold)" color="var(--gold)" />{property.rating} ({property.reviews} reviews)</div>

              <div className={styles.summaryDivider} />

              <div className={styles.summaryRow}><span>Check-in</span><span>{stay.checkIn || '—'}</span></div>
              <div className={styles.summaryRow}><span>Check-out</span><span>{stay.checkOut || '—'}</span></div>
              <div className={styles.summaryRow}><span>Guests</span><span>{stay.guests}</span></div>
              <div className={styles.summaryRow}><span>Duration</span><span>{nights} nights</span></div>

              <div className={styles.summaryDivider} />

              <div className={styles.summaryRow}><span>₹{property.price.toLocaleString('en-IN')} × {nights}</span><span>₹{(property.price * nights).toLocaleString('en-IN')}</span></div>
              <div className={styles.summaryRow}><span>Service & Concierge</span><span className={styles.included}>Included</span></div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
            </div>
          </div>

          <div className={styles.secureBadge}>
            <Lock size={12} color="var(--gold)" />
            <span>256-bit SSL encrypted · PCI DSS compliant</span>
          </div>
        </div>
      </div>
    </div>
  )
}
