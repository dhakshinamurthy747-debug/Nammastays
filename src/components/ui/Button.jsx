import React from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

const VARIANTS = {
  gold: styles.gold,
  outline: styles.outline,
  ghost: styles.ghost,
}

export function Button({
  variant = 'gold',
  type = 'button',
  fullWidth,
  size,
  className = '',
  disabled,
  children,
  ...rest
}) {
  const v = VARIANTS[variant] || VARIANTS.gold
  const cls = [v, fullWidth && styles.fullWidth, size === 'sm' && styles.sm, className].filter(Boolean).join(' ')
  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}

export function LinkButton({ variant = 'outline', to, href, className = '', children, ...rest }) {
  const v = VARIANTS[variant] || VARIANTS.outline
  const cls = [v, className].filter(Boolean).join(' ')
  if (to != null) {
    return (
      <Link className={cls} to={to} {...rest}>
        {children}
      </Link>
    )
  }
  return (
    <a className={cls} href={href || '#'} {...rest}>
      {children}
    </a>
  )
}
