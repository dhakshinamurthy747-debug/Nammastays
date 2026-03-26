import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Mail, Smartphone, MessageSquare } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { resolveRoleFromEmail, parseLoginIdentifier, displayNameForLogin } from '../api/authApi'
import { loadJson } from '../utils/storage'
import { STORAGE_KEYS } from '../utils/constants'
import { consumeLoginAttempt, clearLoginAttempts } from '../utils/rateLimitLogin'
import { issueLoginOtp, consumeLoginOtp } from '../utils/phoneOtpLogin'
import styles from './Auth.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, showToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  /** User picks flow first so UI is never “hidden” until digits are typed */
  const [signInChannel, setSignInChannel] = useState('email')
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  /** @type {'password' | 'otp'} */
  const [phoneAuthMode, setPhoneAuthMode] = useState('password')
  const [otpInput, setOtpInput] = useState('')
  const [otpIssued, setOtpIssued] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [resendIn, setResendIn] = useState(0)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const parsed = useMemo(() => {
    const raw = form.identifier.trim()
    if (signInChannel === 'email') {
      if (!raw || !EMAIL_RE.test(raw)) return null
      return { kind: 'email', emailRef: raw.toLowerCase(), phone: '' }
    }
    return parseLoginIdentifier(form.identifier)
  }, [form.identifier, signInChannel])

  const isEmail = signInChannel === 'email'
  const isPhone = signInChannel === 'mobile'

  useEffect(() => {
    if (isEmail) {
      setPhoneAuthMode('password')
      setOtpInput('')
      setOtpIssued(false)
      setResendIn(0)
    }
  }, [isEmail])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendIn])

  const finishLogin = useCallback(
    async parsedArg => {
      const email = parsedArg.kind === 'email' ? form.identifier.trim() : parsedArg.emailRef
      const emailKey =
        parsedArg.kind === 'email' ? form.identifier.trim().toLowerCase() : parsedArg.emailRef
      const meta = loadJson(STORAGE_KEYS.USER_META, {})
      if (meta[emailKey]?.suspended === true) {
        showToast('This account is suspended. Contact hello@nammastays.com.')
        return false
      }

      const rl = consumeLoginAttempt(emailKey)
      if (!rl.ok) {
        showToast(
          `Too many sign-in attempts. Wait ${Math.ceil(rl.retryAfterMs / 60000) || 1} minute(s) and try again.`
        )
        return false
      }

      setLoading(true)
      await new Promise(r => setTimeout(r, 600))

      const name = displayNameForLogin(parsedArg)
      const role = resolveRoleFromEmail(parsedArg.emailRef)
      clearLoginAttempts(emailKey)
      login({
        name,
        email,
        phone: parsedArg.kind === 'phone' ? parsedArg.phone : '',
        role,
      })
      showToast(`Welcome back, ${name}.`)
      const dest = location.state?.from || '/'
      navigate(dest, { replace: true, state: { bookingDraft: location.state?.bookingDraft } })
      setLoading(false)
      return true
    },
    [form.identifier, login, location.state, navigate, showToast]
  )

  const handlePasswordSignIn = async e => {
    e.preventDefault()
    if (isPhone && phoneAuthMode === 'otp') return

    if (!form.identifier.trim()) {
      showToast(isEmail ? 'Enter your email.' : 'Enter your mobile number.')
      return
    }
    if (!parsed) {
      showToast(isEmail ? 'Enter a valid email address.' : 'Use 10–15 digits (with or without +91).')
      return
    }
    if (!form.password) {
      showToast('Enter your password.')
      return
    }

    await finishLogin(parsed)
  }

  const handleSendOtp = async () => {
    if (!parsed || parsed.kind !== 'phone') {
      showToast('Enter a valid 10-digit (or longer) mobile number first.')
      return
    }
    if (otpSending || resendIn > 0) return

    const emailKey = parsed.emailRef
    const meta = loadJson(STORAGE_KEYS.USER_META, {})
    if (meta[emailKey]?.suspended === true) {
      showToast('This account is suspended. Contact hello@nammastays.com.')
      return
    }

    setOtpSending(true)
    await new Promise(r => setTimeout(r, 500))
    const res = issueLoginOtp(parsed.digits)
    setOtpSending(false)
    if (!res.ok) {
      showToast('Could not send verification code. Try again.')
      return
    }
    setOtpIssued(true)
    setResendIn(60)
    showToast(
      `Code sent to ${parsed.phone}. Demo: your OTP is ${res.code} (connect SMS to replace this).`,
      6500
    )
  }

  const handleVerifyOtp = async () => {
    if (!parsed || parsed.kind !== 'phone') {
      showToast('Enter a valid mobile number first.')
      return
    }
    const code = otpInput.replace(/\D/g, '')
    if (code.length !== 6) {
      showToast('Enter the 6-digit code.')
      return
    }
    const check = consumeLoginOtp(parsed.digits, code)
    if (!check.ok) {
      if (check.reason === 'expired') showToast('Code expired. Request a new one.')
      else if (check.reason === 'no_otp') showToast('Request a code first with “Send OTP”.')
      else showToast('Invalid code. Try again.')
      return
    }

    await finishLogin(parsed)
    setOtpInput('')
    setOtpIssued(false)
  }

  const showPasswordBlock = isEmail || (isPhone && phoneAuthMode === 'password')
  const showOtpBlock = isPhone && phoneAuthMode === 'otp'
  const canSubmitPassword = isEmail || (isPhone && phoneAuthMode === 'password')

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <Link to="/" className={styles.logo}>
          NammaStays
        </Link>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Choose how you sign in — email + password, or mobile with password or OTP.</p>

        <div className={styles.channelPicker} role="group" aria-label="Sign-in method">
          <button
            type="button"
            className={`${styles.channelBtn} ${signInChannel === 'email' ? styles.channelBtnActive : ''}`}
            onClick={() => {
              setSignInChannel('email')
              setForm({ identifier: '', password: '' })
              setOtpInput('')
            }}
          >
            <Mail size={18} aria-hidden />
            Email
          </button>
          <button
            type="button"
            className={`${styles.channelBtn} ${signInChannel === 'mobile' ? styles.channelBtnActive : ''}`}
            onClick={() => {
              setSignInChannel('mobile')
              setForm({ identifier: '', password: '' })
              setPhoneAuthMode('password')
              setOtpInput('')
              setOtpIssued(false)
            }}
          >
            <Smartphone size={18} aria-hidden />
            Mobile
          </button>
        </div>

        <form className={styles.form} onSubmit={handlePasswordSignIn}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">
              {isEmail ? 'Email address' : 'Mobile number'}
            </label>
            <div className={styles.identifierWrap}>
              {isPhone ? (
                <Smartphone size={18} className={styles.identifierIcon} aria-hidden />
              ) : (
                <Mail size={18} className={styles.identifierIcon} aria-hidden />
              )}
              <input
                id="login-identifier"
                className={`form-input ${styles.identifierInput}`}
                type={isEmail ? 'email' : 'tel'}
                name="username"
                autoComplete={isEmail ? 'email' : 'tel'}
                placeholder={isEmail ? 'you@example.com' : '+91 98765 43210'}
                value={form.identifier}
                onChange={e => set('identifier', e.target.value)}
              />
            </div>
            {parsed ? (
              <p className={styles.loginHint}>
                {isEmail ? 'Enter the password for this account.' : 'Use password, or switch to OTP — no password needed there.'}
              </p>
            ) : (
              <p className={styles.loginHintMuted}>
                {isEmail ? 'Use the email you registered with.' : '10–15 digits. Then pick Password or OTP below.'}
              </p>
            )}
          </div>

          {isPhone && (
            <div className={styles.loginModeTabs} role="tablist" aria-label="Mobile sign-in method">
              <button
                type="button"
                role="tab"
                aria-selected={phoneAuthMode === 'password'}
                className={`${styles.loginModeTab} ${phoneAuthMode === 'password' ? styles.loginModeTabActive : ''}`}
                onClick={() => {
                  setPhoneAuthMode('password')
                  setOtpInput('')
                }}
              >
                Password
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={phoneAuthMode === 'otp'}
                className={`${styles.loginModeTab} ${phoneAuthMode === 'otp' ? styles.loginModeTabActive : ''}`}
                onClick={() => {
                  setPhoneAuthMode('otp')
                  setForm(f => ({ ...f, password: '' }))
                }}
              >
                <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: '-2px' }} aria-hidden />
                OTP
              </button>
            </div>
          )}

          {showPasswordBlock && (
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className={styles.passwordWrap}>
                <input
                  id="login-password"
                  className="form-input"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  style={{ paddingRight: 48 }}
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {showOtpBlock && (
            <div className={styles.otpPanel}>
              <p className={styles.otpIntro}>We’ll send a one-time code to your number. No password needed for this option.</p>
              <div className={styles.otpRow}>
                <button
                  type="button"
                  className="btn-outline"
                  style={{ flexShrink: 0 }}
                  disabled={otpSending || resendIn > 0}
                  onClick={handleSendOtp}
                >
                  {otpSending ? 'Sending…' : resendIn > 0 ? `Resend in ${resendIn}s` : otpIssued ? 'Resend OTP' : 'Send OTP'}
                </button>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="login-otp">
                  6-digit code
                </label>
                <input
                  id="login-otp"
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={8}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <button type="button" className="btn-gold w-full" style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading} onClick={handleVerifyOtp}>
                {loading ? 'Signing in…' : (
                  <>
                    Verify &amp; sign in
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          )}

          {canSubmitPassword && (
            <button
              type="submit"
              className="btn-gold w-full"
              style={{ justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
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
