import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Check, Mail } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { parseLoginIdentifier, displayNameForLogin } from '../api/authApi'
import styles from './Auth.module.css'

export default function Signup() {
  const { login, showToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', identifier: '', password: '', role: 'guest' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.identifier.trim() || !form.password) {
      showToast('Enter your name, email or mobile, and password.')
      return
    }
    const parsed = parseLoginIdentifier(form.identifier)
    if (!parsed) {
      showToast('Use a valid email or a mobile number (10–15 digits).')
      return
    }
    if (form.password.length < 6) {
      showToast('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    const joinedAt = new Date().toISOString()
    const email = parsed.kind === 'email' ? form.identifier.trim() : parsed.emailRef
    login({
      name: form.name.trim(),
      email,
      phone: parsed.kind === 'phone' ? parsed.phone : '',
      role: form.role,
      joinedAt,
    })
    const welcomeName = form.name.trim() || displayNameForLogin(parsed)
    showToast(`Welcome to NammaStays, ${welcomeName}.`)
    const dest = location.state?.from || '/'
    navigate(dest, { replace: true, state: { bookingDraft: location.state?.bookingDraft } })
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>NammaStays</Link>
        <h1 className={styles.title}>Join NammaStays</h1>
        <p className={styles.sub}>Access India&apos;s most exclusive curated private properties.</p>

        <form className={styles.form} onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Email / mobile</label>
            <div className={styles.identifierWrap}>
              <Mail size={18} className={styles.identifierIcon} aria-hidden />
              <input
                className={`form-input ${styles.identifierInput}`}
                type="text"
                name="username"
                autoComplete="username"
                placeholder="you@example.com or +91 98765 43210"
                value={form.identifier}
                onChange={e => set('identifier', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              autoComplete="new-password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">I am joining as</label>
            <div className={styles.roleRow}>
              {[
                { val: 'guest', label: 'Guest', desc: 'I want to book stays' },
                { val: 'owner', label: 'Property Owner', desc: 'I want to list a property' },
              ].map(r => (
                <div
                  key={r.val}
                  className={`${styles.roleCard} ${form.role === r.val ? styles.roleActive : ''}`}
                  onClick={() => set('role', r.val)}
                >
                  <div className={styles.roleCheck}>{form.role === r.val && <Check size={12} />}</div>
                  <div className={styles.roleLabel}>{r.label}</div>
                  <div className={styles.roleDesc}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-gold w-full"
            style={{ justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : (
              <>
                <span>Create Account</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <p className={styles.switch}>
          Already a member?{' '}
          <Link to="/login" state={location.state} className={styles.switchLink}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
