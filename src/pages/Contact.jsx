import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import Footer from '../components/Footer'
import styles from './Help.module.css'

export default function Contact() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Company</div>
        <h1 className={styles.title}>Contact</h1>
        <p className={styles.sub}>
          Guest concierge, host partnerships, or press — reach the right team. We read every message.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.card}>
          <Mail size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Email</h2>
          <ul className={styles.list} style={{ listStyle: 'none', paddingLeft: 0 }}>
            <li>
              <strong>Guests &amp; bookings:</strong>{' '}
              <a href="mailto:hello@nammastays.com" className={styles.mailLink}>
                hello@nammastays.com
              </a>
            </li>
            <li>
              <strong>Hosts &amp; listings:</strong>{' '}
              <a href="mailto:hosts@nammastays.com" className={styles.mailLink}>
                hosts@nammastays.com
              </a>
            </li>
            <li>
              <strong>Privacy &amp; legal:</strong>{' '}
              <a href="mailto:privacy@nammastays.com" className={styles.mailLink}>
                privacy@nammastays.com
              </a>
            </li>
          </ul>
        </section>

        <section className={styles.card}>
          <Phone size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Phone</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, paddingLeft: 0, listStyle: 'none' }}>
            Concierge line (IST, weekdays): <strong>+91 80 0000 0000</strong>
            <br />
            For stays already booked, include your reference from <Link to="/bookings">My account</Link>.
          </p>
        </section>

        <section className={styles.card} style={{ gridColumn: '1 / -1' }}>
          <MapPin size={22} className={styles.icon} aria-hidden />
          <h2 className={styles.cardTitle}>Studio</h2>
          <p className={styles.list} style={{ lineHeight: 1.75, margin: 0 }}>
            NammaStays HQ — Bengaluru, India. By appointment only for host meetings.
          </p>
        </section>
      </div>

      <div className={styles.cta}>
        <Link to="/help" className="btn-outline">
          Help centre
        </Link>
      </div>

      <Footer />
    </div>
  )
}
