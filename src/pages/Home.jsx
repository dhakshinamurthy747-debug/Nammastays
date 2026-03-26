import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, Gem, Clock, MapPin, Calendar, Users, Baby } from 'lucide-react'
import { useApp } from '../context/AppContext'
import PropertyCard from '../components/PropertyCard'
import Footer from '../components/Footer'
import { LocationSearchField } from '../components/LocationSearchField'
import styles from './Home.module.css'
import { STORAGE_KEYS } from '../utils/constants'
import { loadJson } from '../utils/storage'

const LOCATION_MIN_LEN = 2

function stayNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  return Math.max(
    0,
    Math.round((new Date(`${checkOut}T12:00:00`) - new Date(`${checkIn}T12:00:00`)) / 86400000)
  )
}

export default function Home() {
  const { showToast, mergedCatalogProperties } = useApp()
  const [maintenanceOn, setMaintenanceOn] = useState(
    () => !!loadJson(STORAGE_KEYS.ADMIN_PLATFORM_SETTINGS, {}).maintenanceMode
  )
  useEffect(() => {
    const read = () => setMaintenanceOn(!!loadJson(STORAGE_KEYS.ADMIN_PLATFORM_SETTINGS, {}).maintenanceMode)
    window.addEventListener('ns-platform-settings', read)
    return () => window.removeEventListener('ns-platform-settings', read)
  }, [])
  const homeFeatured = useMemo(() => {
    const all = mergedCatalogProperties
    const fresh = all.filter(p => p.newListing)
    const rest = all.filter(p => !p.newListing)
    const combined = [...fresh.slice(0, 3), ...rest]
    const seen = new Set()
    return combined.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    }).slice(0, 6)
  }, [mergedCatalogProperties])
  const navigate = useNavigate()
  const [browseQ, setBrowseQ] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)

  const todayYmd = new Date().toISOString().split('T')[0]

  const locationOk = browseQ.trim().length >= LOCATION_MIN_LEN
  const nights = useMemo(() => stayNights(checkIn, checkOut), [checkIn, checkOut])
  const datesOk = locationOk && Boolean(checkIn && checkOut && nights >= 1)

  const submitBrowse = e => {
    e.preventDefault()
    const q = browseQ.trim()
    if (!locationOk) {
      showToast('Enter a destination first.')
      return
    }
    if (!checkIn || !checkOut) {
      showToast('Select both check-in and check-out.')
      return
    }
    if (nights < 1) {
      showToast('Check-out must be at least one night after check-in.')
      return
    }
    const totalGuests = adults + children
    if (totalGuests < 1) {
      showToast('Add at least one guest.')
      return
    }
    const params = new URLSearchParams()
    params.set('q', q)
    params.set('checkIn', checkIn)
    params.set('checkOut', checkOut)
    params.set('guests', String(totalGuests))
    if (children > 0) params.set('children', String(children))
    navigate(`/properties?${params.toString()}`)
  }

  return (
    <div className={styles.page}>
      {maintenanceOn && (
        <div className={styles.maintenanceBanner} role="status">
          <strong>Scheduled maintenance</strong> — We&apos;re polishing a few things behind the scenes. You can still browse
          and book; if anything looks off, try again shortly or reach us at{' '}
          <a href="mailto:hello@nammastays.com">hello@nammastays.com</a>.
        </div>
      )}

      {/* ── HERO ── */}
      <section className={styles.hero}>

        {/* Left: content */}
        <div className={styles.heroLeft}>
          <div className={styles.heroLeftDecor} />
          <div className={styles.heroContent}>

            <div className={`${styles.heroEyebrow} animate-fade-up`}>
              <div className={styles.heroDot} />
              <span>India's most curated private stays</span>
            </div>

            <h1 className={`${styles.heroTitle} animate-fade-up-delay-1`}>
              Private stays so selective,<br />
              we personally approve<br />
              <em>every single one.</em>
            </h1>

            <p className={`${styles.heroSub} animate-fade-up-delay-2`}>
              Every property on NammaStays is personally inspected by us — for quality, comfort, and everything in between — before it's approved. Our promise to you: check in, and everything just works.
            </p>

            <form
              className={`${styles.heroBrowse} ${styles.heroSearchCard} animate-fade-up-delay-3`}
              onSubmit={submitBrowse}
              role="search"
              aria-label="Find a stay"
              title="Location first, then dates and guests. Search unlocks when all are valid."
            >
              <p className={styles.heroFlowIntro}>
                <span className={styles.heroFlowSteps}>1 Location</span>
                <span className={styles.heroFlowSep} aria-hidden>→</span>
                <span className={styles.heroFlowSteps}>2 Dates</span>
                <span className={styles.heroFlowSep} aria-hidden>→</span>
                <span className={styles.heroFlowSteps}>3 Guests</span>
                <span className={styles.heroFlowSepDot} aria-hidden>·</span>
                <span className={styles.heroFlowStepsMuted}>then search</span>
              </p>

              <div className={styles.heroSearchRow1}>
                <label htmlFor="hero-location" className={styles.srOnly}>
                  Destination or area
                </label>
                <div className={styles.heroLocationRow}>
                  <MapPin size={16} className={styles.heroLocationIcon} aria-hidden />
                  <LocationSearchField
                    id="hero-location"
                    className={styles.heroLocationField}
                    value={browseQ}
                    onChange={setBrowseQ}
                    minChars={1}
                    maxSuggestions={8}
                    placeholder="Where? Try Delhi, Goa, Kerala…"
                    inputClassName={styles.heroLocationInput}
                    aria-label="Destination or area"
                  />
                </div>
                {!locationOk && (
                  <span className={styles.heroFlowHintInline}>Suggestions appear as you type; dates unlock after 2+ characters or a full pick.</span>
                )}
              </div>

              <div className={styles.heroSearchRow2}>
                <fieldset className={styles.heroFieldsetCompact} disabled={!locationOk}>
                  <legend className={styles.srOnly}>Check-in and check-out</legend>
                  <div className={styles.heroPair}>
                    <div className={styles.heroField}>
                      <label htmlFor="hero-checkin">
                        <Calendar size={11} aria-hidden /> In
                      </label>
                      <input
                        id="hero-checkin"
                        type="date"
                        className={styles.heroDateInput}
                        value={checkIn}
                        min={todayYmd}
                        onChange={e => setCheckIn(e.target.value)}
                      />
                    </div>
                    <div className={styles.heroField}>
                      <label htmlFor="hero-checkout">
                        <Calendar size={11} aria-hidden /> Out
                      </label>
                      <input
                        id="hero-checkout"
                        type="date"
                        className={styles.heroDateInput}
                        value={checkOut}
                        min={checkIn || todayYmd}
                        onChange={e => setCheckOut(e.target.value)}
                      />
                    </div>
                  </div>
                  {locationOk && checkIn && checkOut && nights < 1 && (
                    <span className={styles.heroFlowHintInline}>Min 1 night.</span>
                  )}
                </fieldset>

                <fieldset className={styles.heroFieldsetCompact} disabled={!datesOk}>
                  <legend className={styles.srOnly}>Adults and children</legend>
                  <div className={styles.heroPair}>
                    <div className={styles.heroField}>
                      <label htmlFor="hero-adults">
                        <Users size={11} aria-hidden /> Adults
                      </label>
                      <select
                        id="hero-adults"
                        className={styles.heroSelect}
                        value={adults}
                        onChange={e => setAdults(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.heroField}>
                      <label htmlFor="hero-children">
                        <Baby size={11} aria-hidden /> Kids
                      </label>
                      <select
                        id="hero-children"
                        className={styles.heroSelect}
                        value={children}
                        onChange={e => setChildren(Number(e.target.value))}
                      >
                        {Array.from({ length: 9 }, (_, i) => i).map(n => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </fieldset>

                <div className={styles.heroSubmitWrap}>
                  <span className={styles.srOnly}>Submit search</span>
                  <button
                    type="submit"
                    className={styles.heroSearchSubmit}
                    disabled={!datesOk || adults + children < 1}
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            <div className={`${styles.heroCtas} animate-fade-up-delay-4`}>
              <Link to="/properties" className="btn-gold">
                Browse all filters <ArrowRight size={14} aria-hidden />
              </Link>
            </div>

            <div className={`${styles.heroStats} animate-fade-up-delay-5`}>
            {[
              { n: '47', l: 'Properties' },
              { n: '18', l: 'States' },
              { n: '4.97', l: 'Avg Rating' },
            ].map(s => (
                <div key={s.l} className={styles.heroStat}>
                  <div className={styles.heroStatNum}>{s.n}</div>
                  <div className={styles.heroStatLabel}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PHILOSOPHY STRIP ── */}
      <section className={styles.philosophy} aria-label="Our standards">
        {[
          { num: '01', icon: <Gem size={18} strokeWidth={1.75} aria-hidden />, title: 'Every Property Inspected', text: 'Before any property goes live, we visit it personally — checking quality, interiors, cleanliness, staff, and every detail. No shortcuts.' },
          { num: '02', icon: <Shield size={18} strokeWidth={1.75} aria-hidden />, title: 'Zero Issues, Guaranteed', text: 'Our simple aim: whoever books a stay should face no issues. If something is off, we make it right before you ever arrive.' },
          { num: '03', icon: <Clock size={18} strokeWidth={1.75} aria-hidden />, title: 'The Finest Stay, Every Time', text: 'We only approve properties that we\'d be proud to send our own family to. That\'s the standard. That\'s the promise.' },
        ].map((item, i) => (
          <div key={i} className={styles.philItem}>
            <div className={styles.philTop}>
              <span className={styles.philIcon}>{item.icon}</span>
              <div className={styles.philNum}>{item.num}</div>
            </div>
            <h3 className={styles.philTitle}>{item.title}</h3>
            <p className={styles.philText}>{item.text}</p>
          </div>
        ))}
      </section>

      {/* ── FEATURED PROPERTIES ── */}
      <section className={styles.featured}>
        <div className={styles.featuredInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionLine} />
            <div className="section-label">Current Collection</div>
            <h2 className={`${styles.sectionTitle} ${styles.featuredTitle}`}>
              The properties we have<br />chosen this season
            </h2>
            <p className={styles.sectionSub}>
              Each property is personally inspected and approved by us. What you see is exactly what you get.
            </p>
          </div>

          <div className={styles.grid}>
            {homeFeatured.map((p, i) => (
              <PropertyCard key={p.id} property={p} index={i} imageLoading={i < 2 ? 'eager' : 'lazy'} />
            ))}
          </div>

          <div className={styles.featuredCta}>
            <Link to="/properties" className="btn-outline">
              View All Properties <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL QUOTE (dark band) ── */}
      <section className={styles.quote}>
        <div className={styles.quoteLine} aria-hidden />
        <blockquote className={styles.quoteText}>
          &ldquo;We believe a great stay shouldn&apos;t come with surprises. Every property is personally verified — so you don&apos;t just stay, you <em>experience the best.</em>&rdquo;
        </blockquote>
        <div className={styles.quoteAttr}>— Founder, NammaStays</div>
        <div className={styles.quoteLine} aria-hidden />
      </section>

      {/* ── OWNER CTA ── */}
      <section className={styles.ownerCta}>
        <div className={styles.ownerCtaInner}>
          <div className={`${styles.ownerEyebrow} section-label`}>For Property Owners</div>
          <h2 className={styles.ownerTitle}>Your property<br />belongs here</h2>
          <p className={styles.ownerText}>
            We only list properties that we've personally visited and approved. If your property meets our quality standards, we'd like to hear from you. Every submission is reviewed by our team — not an algorithm.
          </p>
          <Link to="/list" className="btn-gold">
            Submit Your Property <ArrowRight size={14} aria-hidden />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
