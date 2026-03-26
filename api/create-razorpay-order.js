/**
 * Vercel Serverless — creates a Razorpay Order (amount in paise).
 * Set in project env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (never expose secret to the browser).
 *
 * Production: verify payment signature server-side before fulfilling the booking.
 * @see https://razorpay.com/docs/api/orders/create/
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    res.status(503).json({ error: 'Razorpay server keys are not configured' })
    return
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const amount = Number(body.amount)
  const currency = String(body.currency || 'INR').toUpperCase()
  const receipt = String(body.receipt || `rcpt_${Date.now()}`).slice(0, 40)
  const notes = body.notes && typeof body.notes === 'object' ? body.notes : {}

  if (!Number.isFinite(amount) || amount < 100 || amount > 500_000_000) {
    res.status(400).json({ error: 'Invalid amount (must be 100–500000000 paise)' })
    return
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  try {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes,
      }),
    })

    const data = await r.json()

    if (!r.ok) {
      const msg = data?.error?.description || data?.error?.code || 'Razorpay order failed'
      res.status(r.status >= 400 ? r.status : 502).json({ error: msg })
      return
    }

    res.status(200).json({
      id: data.id,
      amount: data.amount,
      currency: data.currency,
    })
  } catch (e) {
    res.status(502).json({ error: 'Could not reach Razorpay' })
  }
}
