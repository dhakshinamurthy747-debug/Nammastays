import { describe, it, expect } from 'vitest'
import { unfoldIcs, datesFromIcsAllDay } from './icalImport'

describe('icalImport', () => {
  it('unfolds line continuations', () => {
    const raw = 'DTSTART;VALUE=DATE:2024010\r\n 1'
    expect(unfoldIcs(raw)).toContain('20240101')
    expect(unfoldIcs(raw)).not.toMatch(/\n[ \t]/)
  })

  it('extracts all-day nights from a minimal VEVENT', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20240610',
      'DTEND;VALUE=DATE:20240613',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    expect(datesFromIcsAllDay(ics)).toEqual(['2024-06-10', '2024-06-11', '2024-06-12'])
  })
})
