import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Press() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Company</div>
        <h1 className={styles.title}>Press &amp; media</h1>
        <p className={styles.sub}>
          Fact sheets, logos, and interview requests. We respond to editorial enquiries within two business days where
          possible.
        </p>
      </header>

      <div className={styles.layout} style={{ gridTemplateColumns: '1fr' }}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Contact press</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            Email{' '}
            <a href="mailto:press@nammastays.com" className={styles.mailLink}>
              press@nammastays.com
            </a>{' '}
            with your outlet, deadline, and topic. For guest privacy we do not comment on individual reservations.
          </p>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Boilerplate</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            NammaStays is a curated marketplace for private stays across India. Each property is personally vetted before it
            appears to guests. The platform connects discerning travellers with hosts who meet a high bar for quality and
            service.
          </p>
        </section>
      </div>

      <div className={styles.cta}>
        <Link to="/about" className="btn-outline">
          Our story
        </Link>
      </div>

      <Footer />
    </div>
  )
}
