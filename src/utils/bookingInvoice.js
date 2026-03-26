/** @param {object} booking */
export function buildBookingInvoiceHtml(booking, opts = {}) {
  const b = booking || {}
  const ref = b.reference || String(b.id || '')
  const issued = new Date().toISOString().slice(0, 10)
  const platform = opts.platformName || 'NammaStays'
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${ref}</title>
<style>
body{font-family:system-ui,Segoe UI,sans-serif;max-width:640px;margin:40px auto;padding:0 24px;color:#111}
h1{font-size:1.25rem;border-bottom:1px solid #ccc;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:16px 0}
td{padding:6px 0;border-bottom:1px solid #eee}
td:first-child{color:#555;width:42%}
.muted{color:#666;font-size:12px;margin-top:24px}
</style></head><body>
<h1>Tax invoice / Receipt</h1>
<p><strong>${platform}</strong></p>
<p class="muted">Issued ${issued} · Reference <strong>${ref}</strong></p>
<table>
<tr><td>Guest</td><td>${escapeHtml(b.guestEmail || '—')}</td></tr>
<tr><td>Property</td><td>${escapeHtml(b.property || '—')}</td></tr>
<tr><td>Location</td><td>${escapeHtml(b.location || '—')}</td></tr>
<tr><td>Stay</td><td>${escapeHtml(b.checkIn || '—')} → ${escapeHtml(b.checkOut || '—')} (${b.nights || 0} nights)</td></tr>
<tr><td>Room subtotal</td><td>₹${Number(b.roomSubtotal || 0).toLocaleString('en-IN')}</td></tr>
<tr><td>GST (${escapeHtml(String(b.gstPercentLabel ?? '—'))}%)</td><td>₹${Number(b.gstAmount || 0).toLocaleString('en-IN')}</td></tr>
<tr><td>Service fee</td><td>₹${Number(b.serviceFeeAmount || 0).toLocaleString('en-IN')}</td></tr>
<tr><td><strong>Total paid</strong></td><td><strong>₹${Number(b.total || 0).toLocaleString('en-IN')}</strong></td></tr>
<tr><td>Status</td><td>${escapeHtml(b.status || 'confirmed')}</td></tr>
<tr><td>Payment ref.</td><td>${escapeHtml(b.razorpayPaymentId || '—')}</td></tr>
</table>
<p class="muted">This document is generated from booking data in your account. For GST invoices from the host or platform operator, use your compliance workflow.</p>
</body></html>`
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function downloadInvoiceHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
