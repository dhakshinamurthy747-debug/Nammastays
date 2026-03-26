import { describe, it, expect } from 'vitest'
import { issueLoginOtp, consumeLoginOtp } from './phoneOtpLogin'

describe('phoneOtpLogin', () => {
  it('issues and consumes OTP for same digits', () => {
    const { ok, code } = issueLoginOtp('919876543210')
    expect(ok).toBe(true)
    expect(String(code).length).toBe(6)
    expect(consumeLoginOtp('919876543210', code).ok).toBe(true)
    expect(consumeLoginOtp('919876543210', code).ok).toBe(false)
  })
})
