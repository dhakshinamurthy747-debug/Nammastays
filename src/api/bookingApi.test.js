import { describe, it, expect } from 'vitest'
import { normalizeBookingRow } from './bookingApi'

describe('normalizeBookingRow', () => {
  it('adds reference and defaults', () => {
    const row = normalizeBookingRow({
      id: 99,
      property: 'Test',
      total: 1000,
    })
    expect(row.id).toBe(99)
    expect(row.status).toBe('confirmed')
    expect(row.settlementStatus).toBe('pending_settlement')
    expect(row.reference).toMatch(/^NS-/)
  })
})
