import React from 'react'
import { Link } from 'react-router-dom'
import { LinkButton } from '../components/ui/Button'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.code} aria-hidden>
        404
      </div>
      <p className={styles.text}>This page does not exist.</p>
      <LinkButton variant="outline" to="/">
        Return home
      </LinkButton>
      <Link to="/properties" className={styles.link}>
        Browse properties
      </Link>
      <Link to="/help" className={styles.link}>
        Help centre
      </Link>
      <Link to="/sitemap" className={styles.link}>
        Sitemap
      </Link>
    </div>
  )
}
