import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Careers() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Company</div>
        <h1 className={styles.title}>Careers</h1>
        <p className={styles.sub}>
          We&apos;re building the calmest way to book India&apos;s best private stays. Small team, high craft — if that sounds good,
          say hello.
        </p>
      </header>

      <div className={styles.layout} style={{ gridTemplateColumns: '1fr' }}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Open conversations</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            We hire for product, design, operations, and field curation on a rolling basis. Send your CV or portfolio and a
            short note on why NammaStays to{' '}
            <a href="mailto:careers@nammastays.com" className={styles.mailLink}>
              careers@nammastays.com
            </a>
            . We&apos;ll reply if there&apos;s a fit.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Working here</h2>
          <ul className={styles.list}>
            <li>Hybrid-friendly; core hours in IST.</li>
            <li>Field visits are part of curation — expect travel.</li>
            <li>Fair pay, health coverage where applicable, and quiet respect for weekends.</li>
          </ul>
        </section>
      </div>

      <div className={styles.cta}>
        <Link to="/about" className="btn-outline">
          About us
        </Link>
      </div>

      <Footer />
    </div>
  )
}
