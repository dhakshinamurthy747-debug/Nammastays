import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Mail, BookOpen } from 'lucide-react'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Help() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Support</div>
        <h1 className={styles.title}>Help centre</h1>
        <p className={styles.sub}>
          Quick answers for guests and hosts. This demo mirrors a real help hub — on production, articles and chat would live
          here.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          <BookOpen size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Guests</h2>
          <ul className={styles.list}>
            <li>
              <Link to="/properties">Browse &amp; filter properties</Link> — select dates on each listing, then reserve.
            </li>
            <li>
              Sign in is required before payment. Your booking appears under <Link to="/bookings">My account</Link> after
              checkout.
            </li>
            <li>Cancellations and changes: in a live app, policies are per listing; here everything is simulated.</li>
          </ul>
        </section>

        <section className={styles.card}>
          <Mail size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Hosts</h2>
          <ul className={styles.list}>
            <li>
              Submit a property via <Link to="/list">List a Property</Link> — include photos, payout &amp; tax details for
              review.
            </li>
            <li>
              After approval (demo: Master console), use <Link to="/owner">Owner portal</Link> when logged in as an owner.
            </li>
            <li>
              Questions:{' '}
              <a href="mailto:hello@nammastays.com" className={styles.mailLink}>
                hello@nammastays.com
              </a>
            </li>
          </ul>
        </section>
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
