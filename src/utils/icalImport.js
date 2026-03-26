/** Unfold RFC 5545 line folding */
export function unfoldIcs(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
}

/** Parse YYYYMMDD to Y-M-D */
function toYmd(d8) {
  if (!d8 || d8.length < 8) return null
  return `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}`
}

function stripDateValue(line) {
  const part = line.split(':')[1]
  if (!part) return ''
  return part.trim().replace(/[^0-9]/g, '').slice(0, 8)
}

/**
 * Extract each occupied night (Y-M-D) from all-day VEVENTs in an .ics file.
 * @param {string} text raw .ics
 * @returns {string[]}
 */
export function datesFromIcsAllDay(text) {
  const blocked = new Set()
  const body = unfoldIcs(text)
  const events = body.split(/BEGIN:VEVENT/gi)
  for (let i = 1; i < events.length; i++) {
    const chunk = events[i].split(/END:VEVENT/i)[0]
    const lines = chunk.split(/\n/)
    let start8 = ''
    let end8 = ''
    for (const raw of lines) {
      const line = raw.trim()
      if (/^DTSTART;VALUE=DATE:/i.test(line)) start8 = stripDateValue(line)
      else if (/^DTSTART:/i.test(line) && !start8) start8 = stripDateValue(line)
      if (/^DTEND;VALUE=DATE:/i.test(line)) end8 = stripDateValue(line)
      else if (/^DTEND:/i.test(line) && !end8) end8 = stripDateValue(line)
    }
    const s = toYmd(start8)
    const e = toYmd(end8)
    if (s && e) {
      const d0 = new Date(`${s}T12:00:00`)
      const d1 = new Date(`${e}T12:00:00`)
      for (let d = new Date(d0); d < d1; d.setDate(d.getDate() + 1)) {
        blocked.add(d.toISOString().slice(0, 10))
      }
    } else if (s) {
      blocked.add(s)
    }
  }
  return [...blocked].sort()
}
