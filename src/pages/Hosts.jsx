import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gem, Shield, TrendingUp } from 'lucide-react'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Hosts() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">For owners</div>
        <h1 className={styles.title}>Host with NammaStays</h1>
        <p className={styles.sub}>
          We onboard a small number of exceptional private stays. If your property meets our bar, we handle discovery,
          payments, and guest experience — you focus on hospitality.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          <Gem size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Curation</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            Every listing is inspected. We look for design, service, and reliability — not just pretty photos.
          </p>
        </section>
        <section className={styles.card}>
          <Shield size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Trust</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            Clear payout rules, transparent commission, and tools to manage rates, calendar, and promotions in one place.
          </p>
        </section>
        <section className={styles.card}>
          <TrendingUp size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Growth</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            Featured placement for new listings, seasonal campaigns, and guests who expect longer, higher-value stays.
          </p>
        </section>
        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <h2 className={styles.cardTitle}>Next steps</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, marginBottom: 20 }}>
            Submit your property for review. Use the same email you&apos;ll use to sign in — our team will reply from{' '}
            <a href="mailto:hosts@nammastays.com" className={styles.mailLink}>
              hosts@nammastays.com
            </a>
            .
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link to="/list" className="btn-gold">
              Start application <ArrowRight size={14} />
            </Link>
            <Link to="/signup" className="btn-outline">
              Create host account
            </Link>
            <Link to="/owner" className="btn-ghost">
              Owner portal
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
