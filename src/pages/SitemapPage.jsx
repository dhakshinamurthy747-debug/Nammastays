import React from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import styles from './Help.module.css'
import sitemapStyles from './SitemapPage.module.css'

const LINKS = [
  { label: 'Home', to: '/' },
  { label: 'All properties', to: '/properties' },
  { label: 'About', to: '/about' },
  { label: 'Help centre', to: '/help' },
  { label: 'Contact', to: '/contact' },
  { label: 'Host with us', to: '/hosts' },
  { label: 'List a property', to: '/list' },
  { label: 'Sign in', to: '/login' },
  { label: 'Join', to: '/signup' },
  { label: 'My account', to: '/bookings' },
  { label: 'Owner portal', to: '/owner' },
  { label: 'Press', to: '/press' },
  { label: 'Careers', to: '/careers' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Cookies', to: '/cookies' },
]

export default function SitemapPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="section-label">Site</div>
        <h1 className={styles.title}>Sitemap</h1>
        <p className={styles.sub}>Every public page in one place. Some links require you to be signed in.</p>
      </header>

      <div className={sitemapStyles.wrap}>
        <ul className={sitemapStyles.list}>
          {LINKS.map(({ label, to }) => (
            <li key={to}>
              <Link to={to} className={sitemapStyles.link}>
                {label}
              </Link>
              <span className={sitemapStyles.path}>{to}</span>
            </li>
          ))}
        </ul>
      </div>

      <Footer />
    </div>
  )
}
