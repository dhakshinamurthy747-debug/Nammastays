import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Terms() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Legal</div>
        <h1 className={styles.title}>Terms of service</h1>
        <p className={styles.sub}>
          Rules for using NammaStays. Have counsel review before you launch a public marketplace; this is a practical baseline
          aligned with common Indian marketplace expectations.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>1. The platform</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            NammaStays connects guests with curated stays. Listings, calendars, and pricing are supplied by hosts or the
            platform. A confirmed booking forms an agreement primarily between guest and host, subject to these terms and the
            cancellation terms shown at checkout.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>2. Bookings &amp; cancellations</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Guests may cancel or request changes where the listing policy and product UI allow. Refunds are processed according
            to that policy and the rules of your payment provider. Hosts must honour confirmed reservations except where law or
            platform policy requires otherwise.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>3. Host obligations</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Hosts are responsible for accurate listings, compliance with local laws (including registration and tax), safety,
            and honoured reservations. Platform fees and settlement timing are as set in the host agreement and Admin settings.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>4. Reviews</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Guest reviews must be truthful and respectful. The platform may remove content that violates law or community
            standards and should offer a fair process for disputes in production deployments.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>5. Contact</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Questions:{' '}
            <a href="mailto:hello@nammastays.com" className={styles.mailLink}>
              hello@nammastays.com
            </a>
            . See also <Link to="/privacy">Privacy</Link> and <Link to="/cookies">Cookies</Link>.
          </p>
        </section>
      </div>

      <div className={styles.cta}>
        <Link to="/" className="btn-outline">
          Back home
        </Link>
      </div>

      <Footer />
    </div>
  )
}
