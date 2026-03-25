import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import styles from './Cookies.module.css'

export default function Cookies() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Legal</div>
        <h1 className={styles.title}>Cookies &amp; local storage</h1>
        <p className={styles.sub}>
          Transparency for this demo app. No tracking cookies are set by NammaStays sample code; your session and data use the
          browser&apos;s storage only.
        </p>
      </header>

      <div className={styles.body}>
        <section className={styles.block}>
          <h2 className={styles.h2}>What we store in your browser</h2>
          <ul className={styles.list}>
            <li>
              <strong>Session:</strong> signed-in user (email, name, role) — key similar to <code>ns_auth_session</code>.
            </li>
            <li>
              <strong>Bookings:</strong> confirmed stays after the simulated payment step.
            </li>
            <li>
              <strong>Host submissions:</strong> list-property applications and admin decisions.
            </li>
            <li>
              <strong>Admin settings:</strong> demo platform toggles (commission, etc.).
            </li>
          </ul>
          <p className={styles.p}>
            Clearing site data or using a private window resets the demo. A production site would publish a full cookie policy
            and consent tools.
          </p>
        </section>

        <section className={styles.block}>
          <h2 className={styles.h2}>Third parties</h2>
          <p className={styles.p}>
            This build does not load analytics or ad pixels. Fonts may load from Google Fonts when enabled in{' '}
            <code>index.html</code> — refer to Google&apos;s privacy policy for those requests.
          </p>
        </section>

        <Link to="/about#privacy" className={styles.privacyLink}>
          Read our privacy overview →
        </Link>
      </div>

      <div className={styles.cta}>
        <Link to="/" className="btn-outline">
          Back home <ArrowRight size={14} />
        </Link>
      </div>

      <Footer />
    </div>
  )
}
