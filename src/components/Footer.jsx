import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <div className={styles.logo}>NammaStays</div>
          <p className={styles.tagline}>India's most curated collection of private stays. Not many. Only the right ones.</p>
        </div>
        <div className={styles.cols}>
          <div className={styles.col}>
            <div className={styles.colTitle}>Discover</div>
            <Link to="/properties" className={styles.colLink}>All Properties</Link>
            <Link to="/about" className={styles.colLink}>Our Philosophy</Link>
            <Link to="/signup" className={styles.colLink}>Become a Member</Link>
          </div>
          <div className={styles.col}>
            <div className={styles.colTitle}>Owners</div>
            <Link to="/owner" className={styles.colLink}>Owner Portal</Link>
            <Link to="/list" className={styles.colLink}>List a Property</Link>
            <Link to="/about" className={styles.colLink}>Our Standards</Link>
          </div>
          <div className={styles.col}>
            <div className={styles.colTitle}>Company</div>
            <Link to="/help" className={styles.colLink}>Help Centre</Link>
            <Link to="/about#privacy" className={styles.colLink}>Privacy</Link>
            <Link to="/about#terms" className={styles.colLink}>Terms</Link>
            <Link to="/cookies" className={styles.colLink}>Cookies</Link>
            <a href="mailto:hello@nammastays.com" className={styles.colLink}>Contact</a>
          </div>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} NammaStays. All rights reserved.</span>
        <span className={styles.note}>Fewer than 50 properties. Chosen by hand.</span>
      </div>
    </footer>
  )
}

