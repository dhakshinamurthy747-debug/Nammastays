import React from 'react'
import styles from './Loader.module.css'

export function Loader({ label = 'Loading', inline }) {
  return (
    <div className={`${styles.wrap} ${inline ? styles.inline : ''}`.trim()} role="status" aria-live="polite">
      <div className={styles.spinner} aria-hidden />
      {!inline && <span className={styles.label}>{label}</span>}
    </div>
  )
}
