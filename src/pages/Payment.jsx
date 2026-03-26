import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, CreditCard, Check, ArrowLeft, Star, MapPin, Shield, Calendar, FileText } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { STORAGE_KEYS } from '../utils/constants'
import { computeGuestBookingBreakdown, sumGuestLifetimeSpend } from '../utils/guestPricing'
import { getPlatformCommissionRate } from '../utils/platformSettings'
import { buildNightlyPricesForStay, validateStayAvailability } from '../utils/hostCatalogMerge'
import { findActivePromo } from '../utils/promoResolve'
import {
  isRazorpayConfigured,
  getRazorpayKeyId,
  getCreateOrderUrl,
  loadRazorpayScript,
  rupeesToPaise,
} from '../utils/razorpayClient'
import { buildBookingInvoiceHtml, downloadInvoiceHtml } from '../utils/bookingInvoice'
import styles from './Payment.module.css'

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()
  const { addBooking, showToast, user, bookings, mergedCatalogProperties, hostPromotions } = useApp()

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
  const [razorpayReceipt, setRazorpayReceipt] = useState(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [successBookingSnapshot, setSuccessBookingSnapshot] = useState(null)

  const razorpayEnabled = isRazorpayConfigured()
  const razorpayKeyId = getRazorpayKeyId()

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
    const life = user ? sumGuestLifetimeSpend(bookings, user.email) : 0
    const resProp =
      mergedCatalogProperties.find(p => p.id === bookingState.property.id) || bookingState.property
    const cr = getPlatformCommissionRate()
    const promoPct = promoApplied?.discountPct || 0
    const p =
      n < 1 || !stay.checkIn || !stay.checkOut
        ? computeGuestBookingBreakdown({
            nightlyPrice: resProp.price,
            nights: 0,
            lifetimeSpendBefore: life,
            platformCommissionRate: cr,
            promoDiscountPct: promoPct,
          })
        : computeGuestBookingBreakdown({
            nightlyPrices: buildNightlyPricesForStay(resProp, stay.checkIn, stay.checkOut).nightlyPrices,
            lifetimeSpendBefore: life,
            platformCommissionRate: cr,
            promoDiscountPct: promoPct,
          })
    try {
      sessionStorage.setItem(
        STORAGE_KEYS.PAYMENT_RESUME,
        JSON.stringify({
          ...bookingState,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guests: stay.guests,
          nights: n,
          total: p.grandTotal,
          pricing: p,
          promoCode: promoApplied?.code || '',
          promoDiscountPct: promoApplied?.discountPct || 0,
        })
      )
    } catch {
      /* ignore */
    }
  }, [bookingState, stay, user, bookings, mergedCatalogProperties, promoApplied])

  useEffect(() => {
    if (!bookingState?.property?.id) return
    const c = String(bookingState.promoCode || '').trim()
    const pct = Number(bookingState.promoDiscountPct) || 0
    setPromoCodeInput(c)
    if (c && pct) {
      const hit = findActivePromo(hostPromotions, bookingState.property.id, c)
      setPromoApplied(hit && hit.discountPct === pct ? hit : null)
    } else {
      setPromoApplied(null)
    }
  }, [bookingState?.property?.id, bookingState?.promoCode, bookingState?.promoDiscountPct, hostPromotions])

  const rawProperty = bookingState?.property
  const property = useMemo(
    () =>
      rawProperty?.id
        ? mergedCatalogProperties.find(p => p.id === rawProperty.id) || rawProperty
        : rawProperty ?? null,
    [mergedCatalogProperties, rawProperty]
  )

  const nights =
    stay.checkIn && stay.checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(`${stay.checkOut}T12:00:00`) - new Date(`${stay.checkIn}T12:00:00`)) / 86400000
          )
        )
      : 0

  const lifetimeSpendBefore = useMemo(
    () => sumGuestLifetimeSpend(bookings, user?.email),
    [bookings, user?.email]
  )

  const commissionRate = getPlatformCommissionRate()

  const promoDiscountPct = promoApplied?.discountPct || 0

  const pricing = useMemo(() => {
    if (!property) {
      return computeGuestBookingBreakdown({
        nightlyPrice: 0,
        nights: 0,
        lifetimeSpendBefore,
        platformCommissionRate: commissionRate,
        promoDiscountPct,
      })
    }
    if (!stay.checkIn || !stay.checkOut || nights < 1) {
      return computeGuestBookingBreakdown({
        nightlyPrice: property.price,
        nights: 0,
        lifetimeSpendBefore,
        platformCommissionRate: commissionRate,
        promoDiscountPct,
      })
    }
    const { nightlyPrices } = buildNightlyPricesForStay(property, stay.checkIn, stay.checkOut)
    return computeGuestBookingBreakdown({
      nightlyPrices,
      lifetimeSpendBefore,
      platformCommissionRate: commissionRate,
      promoDiscountPct,
    })
  }, [
    property,
    stay.checkIn,
    stay.checkOut,
    nights,
    lifetimeSpendBefore,
    commissionRate,
    promoDiscountPct,
  ])

  const total = pricing.grandTotal

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
    const { stayMinNights } = buildNightlyPricesForStay(property, stay.checkIn, stay.checkOut)
    if (nights < stayMinNights) {
      showToast(`Minimum stay is ${stayMinNights} night${stayMinNights === 1 ? '' : 's'} for these dates.`)
      return false
    }
    const avail = validateStayAvailability(property, stay.checkIn, stay.checkOut, bookings)
    if (!avail.ok) {
      showToast(avail.message)
      return false
    }
    return true
  }

  const finalizeBooking = rzpResponse => {
    const reference = `NS-${Date.now().toString(36).toUpperCase().slice(-10)}`
    addBooking({
      propertyId: property.id,
      property: property.name,
      location: property.location,
      type: property.type,
      gradient: property.gradient,
      hostOwnerEmail: property.hostOwnerEmail || null,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      guests: stay.guests,
      total,
      nights,
      guestEmail: user.email,
      roomSubtotal: pricing.roomSubtotal,
      gstAmount: pricing.gstAmount,
      gstPercentLabel: pricing.gstPercentLabel,
      serviceFeeAmount: pricing.serviceFeeAmount,
      serviceFeePercentLabel: pricing.serviceFeePercentLabel,
      hostCommission: pricing.hostCommissionAmount,
      hostNetOnRoom: pricing.hostNetOnRoom,
      hostPayoutAmount: pricing.hostNetOnRoom,
      platformFeeAmount: pricing.hostCommissionAmount,
      platformCommissionRate: pricing.platformCommissionRate,
      nightlyPrices: pricing.nightlyPrices,
      roomSubtotalBeforePromo: pricing.roomSubtotalBeforePromo,
      promoDiscountAmount: pricing.promoDiscountAmount,
      promoCode: promoApplied?.code || '',
      promoDiscountPct: promoApplied?.discountPct || 0,
      settlementStatus: 'pending_settlement',
      specialRequests: form.specialRequests || '',
      reference,
      razorpayPaymentId: rzpResponse?.razorpay_payment_id || '',
      razorpayOrderId: rzpResponse?.razorpay_order_id || '',
    })
    setSuccessBookingSnapshot({
      reference,
      guestEmail: user.email,
      property: property.name,
      location: property.location,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights,
      guests: stay.guests,
      total,
      roomSubtotal: pricing.roomSubtotal,
      gstAmount: pricing.gstAmount,
      gstPercentLabel: pricing.gstPercentLabel,
      serviceFeeAmount: pricing.serviceFeeAmount,
      serviceFeePercentLabel: pricing.serviceFeePercentLabel,
      status: 'confirmed',
      razorpayPaymentId: rzpResponse?.razorpay_payment_id || '',
    })
    setConfirmationRef(reference)
    setRazorpayReceipt(rzpResponse || null)
    try {
      sessionStorage.removeItem(STORAGE_KEYS.PAYMENT_RESUME)
    } catch {
      /* ignore */
    }
    setLoading(false)
    setStep(3)
  }

  const handleContinue = () => {
    if (!validateStay()) return
    if (!razorpayEnabled && !validate()) return
    setStep(2)
  }

  const openRazorpayCheckout = async () => {
    if (!validateStay()) return
    setLoading(true)
    setRazorpayReceipt(null)
    try {
      await loadRazorpayScript()
      const amountPaise = rupeesToPaise(total)
      const res = await fetch(getCreateOrderUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `ns_${property.id}_${Date.now()}`.slice(0, 40),
          notes: {
            propertyId: String(property.id),
            nights: String(nights),
            guestEmail: String(user.email || ''),
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(data.error || 'Could not start Razorpay checkout. Check API keys and /api route.')
        setLoading(false)
        return
      }
      const prefillEmail =
        user.email && !String(user.email).endsWith('@guest.nammastays.local') ? user.email : ''
      const contactDigits = String(user.phone || '').replace(/\D/g, '')
      const options = {
        key: razorpayKeyId,
        amount: data.amount,
        currency: data.currency || 'INR',
        order_id: data.id,
        name: 'NammaStays',
        description: `${property.name} · ${nights} night(s)`,
        image: `${window.location.origin}/favicon.svg`,
        handler(response) {
          finalizeBooking(response)
        },
        prefill: {
          name: user.name || '',
          email: prefillEmail,
          contact: contactDigits.length >= 10 ? contactDigits.slice(-10) : undefined,
        },
        theme: { color: '#6b1d2e' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      }
      const Rzp = window.Razorpay
      if (typeof Rzp !== 'function') {
        throw new Error('Razorpay SDK missing')
      }
      const rzp = new Rzp(options)
      rzp.on('payment.failed', e => {
        showToast(e.error?.description || 'Payment failed.')
        setLoading(false)
      })
      rzp.open()
    } catch (e) {
      console.error(e)
      showToast('Could not open Razorpay. Check VITE_RAZORPAY_KEY_ID, deploy the create-order API route, or complete pay without Razorpay in settings.')
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!validateStay()) return
    if (razorpayEnabled) {
      await openRazorpayCheckout()
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    finalizeBooking(null)
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
        {razorpayReceipt?.razorpay_payment_id && (
          <p className={styles.referenceLine}>
            Razorpay payment id: <strong>{razorpayReceipt.razorpay_payment_id}</strong>
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
            ₹{total.toLocaleString('en-IN')} paid · {nights} nights · {stay.guests} guests
          </div>
          <div className={styles.successPricingMini}>
            <span>Room ₹{pricing.roomSubtotal.toLocaleString('en-IN')}</span>
            <span>GST ({pricing.gstPercentLabel}%) ₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
            <span>
              Service fee ({pricing.serviceFeePercentLabel}%) ₹{pricing.serviceFeeAmount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          {successBookingSnapshot && (
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                const html = buildBookingInvoiceHtml(successBookingSnapshot)
                const name = String(successBookingSnapshot.reference || 'booking').replace(/\W+/g, '_')
                downloadInvoiceHtml(`nammastays-receipt-${name}.html`, html)
                showToast('Receipt downloaded.')
              }}
            >
              <FileText size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} aria-hidden />
              Download receipt
            </button>
          )}
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
                <div className={styles.stayField} style={{ marginTop: 16, gridColumn: '1 / -1' }}>
                  <label className={styles.stayLabel} htmlFor="pay-promo">
                    Promo code
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                      id="pay-promo"
                      type="text"
                      className={styles.stayInput}
                      style={{ flex: '1 1 140px', maxWidth: 220 }}
                      value={promoCodeInput}
                      onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                      placeholder="Optional"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ padding: '10px 16px', fontSize: '12px' }}
                      onClick={() => {
                        const hit = findActivePromo(hostPromotions, property.id, promoCodeInput)
                        if (!hit) {
                          setPromoApplied(null)
                          showToast('Invalid or inactive code for this listing.')
                          return
                        }
                        setPromoApplied(hit)
                        showToast(`${hit.discountPct}% off room subtotal applied.`)
                      }}
                    >
                      Apply
                    </button>
                    {promoApplied && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: '12px' }}
                        onClick={() => {
                          setPromoApplied(null)
                          setPromoCodeInput('')
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {(property.cancellationPolicyText ||
                property.houseRulesText ||
                (Array.isArray(property.policyAttachments) && property.policyAttachments.length > 0)) && (
                <div className={styles.policyCheckout}>
                  <div className={styles.policyCheckoutTitle}>
                    <Shield size={16} color="var(--sage)" aria-hidden /> Host policies for this listing
                  </div>
                  {property.cancellationPolicyText && (
                    <p className={styles.policyCheckoutP}>
                      <strong>Cancellation.</strong> {property.cancellationPolicyText}
                    </p>
                  )}
                  {property.houseRulesText && (
                    <p className={styles.policyCheckoutP}>
                      <strong>House rules.</strong> {property.houseRulesText}
                    </p>
                  )}
                  {Array.isArray(property.policyAttachments) && property.policyAttachments.length > 0 && (
                    <ul className={styles.policyCheckoutLinks}>
                      {property.policyAttachments.map((a, i) => (
                        <li key={i}>
                          <a href={a.url} target="_blank" rel="noopener noreferrer">
                            {a.label || 'Policy document'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className={styles.policyCheckoutNote}>By paying, you agree to these terms for this stay.</p>
                </div>
              )}

              {razorpayEnabled ? (
                <>
                  <div className={styles.cardHeader}>
                    <CreditCard size={16} color="var(--gold)" />
                    <span>Secure checkout</span>
                    <div className={styles.cardBrands}>
                      <span className={styles.brand}>Razorpay</span>
                      <span className={styles.brand}>UPI</span>
                      <span className={styles.brand}>CARDS</span>
                    </div>
                  </div>
                  <p className={styles.razorpayNote}>
                    Next step opens Razorpay to pay <strong>₹{total.toLocaleString('en-IN')}</strong> (includes GST &amp;
                    service fee). Use test mode keys while developing.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}

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
              <p className={styles.confirmNote}>
                {razorpayEnabled
                  ? 'Review details, then pay securely with Razorpay (UPI, cards, netbanking per your Razorpay settings).'
                  : 'Please review all details before confirming. Your card will be charged immediately upon confirmation.'}
              </p>

              <div className={styles.confirmGrid}>
                <div className={styles.confirmRow}><span>Property</span><strong>{property.name}</strong></div>
                <div className={styles.confirmRow}><span>Location</span><strong>{property.location}</strong></div>
                <div className={styles.confirmRow}><span>Check In</span><strong>{stay.checkIn}</strong></div>
                <div className={styles.confirmRow}><span>Check Out</span><strong>{stay.checkOut}</strong></div>
                <div className={styles.confirmRow}><span>Duration</span><strong>{nights} nights</strong></div>
                <div className={styles.confirmRow}><span>Guests</span><strong>{stay.guests}</strong></div>
                {razorpayEnabled ? (
                  <div className={styles.confirmRow}>
                    <span>Payment</span>
                    <strong>Razorpay secure checkout</strong>
                  </div>
                ) : (
                  <div className={styles.confirmRow}>
                    <span>Card</span>
                    <strong>•••• {form.cardNumber.replace(/\s/g, '').slice(-4)}</strong>
                  </div>
                )}
                {form.specialRequests && <div className={styles.confirmRow}><span>Requests</span><strong>{form.specialRequests}</strong></div>}
                <div className={styles.confirmRow}>
                  <span>Room subtotal</span>
                  <strong>₹{pricing.roomSubtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>GST ({pricing.gstPercentLabel}%)</span>
                  <strong>₹{pricing.gstAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Service fee ({pricing.serviceFeePercentLabel}%)</span>
                  <strong>₹{pricing.serviceFeeAmount.toLocaleString('en-IN')}</strong>
                </div>
                <div className={styles.confirmRowMuted}>{pricing.serviceFeeTierNote}</div>
                <div className={`${styles.confirmRow} ${styles.totalConfirmRow}`}>
                  <span>Total charged</span><strong>₹{total.toLocaleString('en-IN')}</strong>
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
                {loading
                  ? razorpayEnabled
                    ? 'Opening Razorpay...'
                    : 'Processing...'
                  : razorpayEnabled
                    ? `Pay ₹${total.toLocaleString('en-IN')} with Razorpay`
                    : `Confirm & Pay ₹${total.toLocaleString('en-IN')}`}
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

              {pricing.promoDiscountAmount > 0 ? (
                <>
                  <div className={styles.summaryRow}>
                    <span>Room {nights > 0 ? `(${nights} nights)` : ''}</span>
                    <span>₹{pricing.roomSubtotalBeforePromo.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Promo ({promoApplied?.code})</span>
                    <span>−₹{pricing.promoDiscountAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Room (after promo)</span>
                    <span>₹{pricing.roomSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                </>
              ) : (
                <div className={styles.summaryRow}>
                  <span>Room subtotal{nights > 0 ? ` · ${nights} nights` : ''}</span>
                  <span>₹{pricing.roomSubtotal.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>GST ({pricing.gstPercentLabel}%)</span>
                <span>₹{pricing.gstAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className={styles.summaryRow}>
                <span title={pricing.serviceFeeTierNote}>Service fee ({pricing.serviceFeePercentLabel}%)</span>
                <span>₹{pricing.serviceFeeAmount.toLocaleString('en-IN')}</span>
              </div>
              <p className={styles.summaryTierHint}>{pricing.serviceFeeTierNote}</p>
              <div className={`${styles.summaryRow} ${styles.summaryRowStack}`}>
                <span>
                  Host platform fee ({Math.round((pricing.platformCommissionRate ?? commissionRate) * 100)}%)
                </span>
                <span className={styles.summaryMuted}>Deducted from host room share · not added to your total</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>You pay</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
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
