import React from 'react'
import styles from './Input.module.css'

export function Input({
  id,
  label,
  error,
  className = '',
  wrapperClass = '',
  ...rest
}) {
  return (
    <div className={`${styles.wrap} ${wrapperClass}`.trim()}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`${styles.input} ${error ? styles.error : ''} ${className}`.trim()}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <span id={`${id}-err`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
