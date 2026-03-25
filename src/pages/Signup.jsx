import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight, Check, Phone } from 'lucide-react'
import { useApp } from '../context/AppContext'
import styles from './Auth.module.css'

export default function Signup() {
  const { login, showToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'guest' })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.password) {
      showToast('Please fill in all fields.')
      return
    }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      showToast('Enter a valid mobile number (10–15 digits).')
      return
    }
    if (form.password.length < 6) { showToast('Password must be at least 6 characters.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    const joinedAt = new Date().toISOString()
    login({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role, joinedAt })
    showToast(`Welcome to NammaStays, ${form.name}.`)
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
        <p className={styles.sub}>Access India's most exclusive curated private properties.</p>

        <form className={styles.form} onSubmit={handle}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
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
            <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} />
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

          <button type="submit" className="btn-gold w-full" style={{ justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? 'Creating account...' : <><span>Create Account</span><ArrowRight size={14} /></>}
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

