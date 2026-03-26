/** Escape text for iCalendar */
function esc(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function foldLine(line) {
  if (line.length <= 72) return line
  let out = ''
  let i = 0
  while (i < line.length) {
    const chunk = i === 0 ? line.slice(i, i + 75) : ' ' + line.slice(i, i + 74)
    out += (out ? '\r\n' : '') + chunk
    i += i === 0 ? 75 : 74
  }
  return out
}

/** @param {Array<{ property?: string, checkIn: string, checkOut: string, reference?: string }>} stays */
export function buildIcsForStays(stays, calendarName = 'NammaStays') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NammaStays//Host calendar//EN',
    `X-WR-CALNAME:${esc(calendarName)}`,
    'CALSCALE:GREGORIAN',
  ]
  for (const s of stays) {
    const uid = `${s.reference || s.checkIn}-${String(s.checkIn).replace(/-/g, '')}@nammastays`
    const dtStart = String(s.checkIn || '').replace(/-/g, '')
    const dtEnd = String(s.checkOut || '').replace(/-/g, '')
    if (!dtStart || !dtEnd) continue
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${formatStamp(new Date())}`, `DTSTART;VALUE=DATE:${dtStart}`, `DTEND;VALUE=DATE:${dtEnd}`, `SUMMARY:${esc(s.property || 'Stay')}`, `DESCRIPTION:${esc(`Ref ${s.reference || ''}`)}`, 'END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n')
}

function formatStamp(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
