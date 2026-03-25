import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import styles from './DashboardLayout.module.css'

/** Authenticated-area shell: same chrome as main, distinct background token for future sidebars. */
export function DashboardLayout() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <Outlet />
    </div>
  )
}
