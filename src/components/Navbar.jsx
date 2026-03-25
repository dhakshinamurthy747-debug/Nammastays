import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout, hostListingsByEmail } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  const hostListingCount = user
    ? hostListingsByEmail[user.email?.toLowerCase?.() || '']?.length || 0
    : 0
  const showHostingEntry = Boolean(user && (user.role === 'owner' || hostListingCount > 0))

  const isHomeHero = location.pathname === '/' && !scrolled
  const navMod = scrolled ? styles.scrolled : isHomeHero ? styles.atHero : styles.atPageTop

  return (
    <nav className={`${styles.nav} ${navMod}`} aria-label="Main">
      <div className={styles.bar}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoNamma}>Namma</span>
          <span className={styles.logoStays}>Stays</span>
        </Link>

        <span className={styles.divider} aria-hidden />

        <div className={styles.linkRail}>
          <Link to="/properties" className={`${styles.link} ${isActive('/properties') ? styles.active : ''}`}>Properties</Link>
          <Link to="/list" className={`${styles.link} ${isActive('/list') ? styles.active : ''}`}>List a Property</Link>
          <Link to="/about" className={`${styles.link} ${isActive('/about') ? styles.active : ''}`}>About</Link>
          {showHostingEntry && (
            <Link to="/owner" className={`${styles.link} ${isActive('/owner') ? styles.active : ''}`}>
              Switch to Hosting
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className={`${styles.link} ${isActive('/admin') ? styles.active : ''}`}>Master</Link>
          )}
        </div>

        <span className={styles.divider} aria-hidden />

        <div className={styles.actions}>
          {user ? (
            <div className={styles.userMenu}>
              <span className={styles.userName}>{user.name}</span>
              <Link to="/bookings" className={`btn-ghost ${styles.compactGhost}`}>My account</Link>
              <button type="button" className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
            </div>
          ) : (
            <div className={styles.authBtns}>
              <Link to="/login" className={styles.signIn}>Sign In</Link>
              <Link to="/signup" className={`btn-gold ${styles.joinBtn}`}>Join</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
