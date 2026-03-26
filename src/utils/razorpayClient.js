/**
 * @returns {string}
 */
export function getRazorpayKeyId() {
  return (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim()
}

export function isRazorpayConfigured() {
  return getRazorpayKeyId().length > 0
}

/**
 * Same-origin `/api/...` on Vercel, or `VITE_API_BASE` when API is on another origin.
 */
export function getCreateOrderUrl() {
  const base = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
  return `${base}/api/create-razorpay-order`
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('No window'))
      return
    }
    if (typeof window.Razorpay === 'function') {
      resolve()
      return
    }
    const existing = document.querySelector('script[data-razorpay-checkout]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.async = true
    s.dataset.razorpayCheckout = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.body.appendChild(s)
  })
}

/**
 * INR rupees (integer/float) → paise for Razorpay
 * @param {number} inrRupees
 */
export function rupeesToPaise(inrRupees) {
  return Math.max(100, Math.round(Number(inrRupees) * 100))
}
