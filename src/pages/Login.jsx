import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Phone } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { resolveRoleFromEmail, displayNameFromEmail } from '../api/authApi'
import styles from './Auth.module.css'

export default function Login() {
  const { login, showToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', phone: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    if (!form.email || !form.phone || !form.password) {
      showToast('Please fill in all fields.')
      return
    }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      showToast('Enter a valid mobile number (10–15 digits).')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))

    const email = form.email.trim().toLowerCase()
    const name = displayNameFromEmail(form.email.trim())
    const role = resolveRoleFromEmail(email)
    login({ name, email: form.email.trim(), phone: form.phone.trim(), role })
    showToast(`Welcome back, ${name}.`)
    const dest = location.state?.from || '/'
    navigate(dest, { replace: true, state: { bookingDraft: location.state?.bookingDraft } })
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>NammaStays</Link>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Sign in to access your stays and preferences.</p>

        <form className={styles.form} onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Mobile number</label>
            <div className={styles.phoneWrap}>
              <Phone size={18} className={styles.phoneIcon} aria-hidden />
              <input
                className={`form-input ${styles.phoneInput}`}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className={styles.passwordWrap}>
              <input className="form-input" type={show ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} style={{ paddingRight: 48 }} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShow(s => !s)}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-gold w-full" style={{ justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={14} /></>}
          </button>
        </form>

        <p className={styles.switch}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" state={location.state} className={styles.switchLink}>
            Join NammaStays
          </Link>
        </p>
      </div>
    </div>
  )
}

