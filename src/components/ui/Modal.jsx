import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './Modal.module.css'

export function Modal({ open, title, children, onClose, ariaLabel }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title || 'Dialog'}
      >
        {(title || onClose) && (
          <div className={styles.header}>
            {title ? <h2 className={styles.title}>{title}</h2> : <span />}
            {onClose && (
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close dialog">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
