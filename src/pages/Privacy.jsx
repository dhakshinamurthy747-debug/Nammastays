import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Privacy() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Legal</div>
        <h1 className={styles.title}>Privacy policy</h1>
        <p className={styles.sub}>
          How NammaStays handles personal information. If you operate this product for end users, align this policy with the
          Digital Personal Data Protection Act, 2023 and your own legal review.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>1. What we process</h2>
          <ul className={styles.list}>
            <li>
              <strong>Account:</strong> name, email or phone-derived identifier, and role — used for sign-in and dashboards.
            </li>
            <li>
              <strong>Bookings:</strong> stay dates, party size, amounts, payment references when you use Razorpay or card
              capture.
            </li>
            <li>
              <strong>Host applications:</strong> property descriptions, photos, payout and tax fields from List a property.
            </li>
            <li>
              <strong>Reviews &amp; in-app messages:</strong> ratings, comments, and notification history for the signed-in user.
            </li>
          </ul>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>2. Purpose &amp; retention</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            We use this data to run reservations, pay hosts per platform rules, and improve the product. Retention depends on
            your hosting setup: in a browser-only deployment, clearing site data removes local copies; with a backend, apply
            your statutory and contractual retention schedules.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>3. Third parties</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Payment processors (e.g. Razorpay) process payment data under their terms. Fonts or assets may load from CDNs —
            review your deployment configuration.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>4. Your rights</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Depending on applicable law, you may have rights to access, correction, and deletion. Contact us using the details
            below; we respond within reasonable timelines once identity is verified.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>5. Contact</h2>
          <p className={styles.list} style={{ lineHeight: 1.65 }}>
            Privacy questions:{' '}
            <a href="mailto:privacy@nammastays.com" className={styles.mailLink}>
              privacy@nammastays.com
            </a>
            . Related: <Link to="/terms">Terms</Link>, <Link to="/cookies">Cookies</Link>.
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
