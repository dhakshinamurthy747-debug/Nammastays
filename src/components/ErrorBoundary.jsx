import React from 'react'
import { LinkButton } from './ui/Button'
import styles from './ErrorBoundary.module.css'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.sub}>Please refresh the page or return home.</p>
          <LinkButton variant="gold" to="/">
            Return home
          </LinkButton>
        </div>
      )
    }
    return this.props.children
  }
}
