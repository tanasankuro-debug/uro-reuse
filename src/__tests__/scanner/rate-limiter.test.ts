import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimiter } from '../../lib/scanner-optimizer'

describe('RateLimiter', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts full and allows consuming tokens', () => {
    const rl = new RateLimiter(10, 60_000)
    expect(rl.consume()).toBe(true)
    expect(rl.consume()).toBe(true)
  })

  it('returns false when quota exhausted', () => {
    const rl = new RateLimiter(3, 60_000)
    expect(rl.consume()).toBe(true)
    expect(rl.consume()).toBe(true)
    expect(rl.consume()).toBe(true)
    expect(rl.consume()).toBe(false)
  })

  it('refills tokens over time', () => {
    const rl = new RateLimiter(10, 10_000)  // 1 token/s
    // drain all 10 tokens
    for (let i = 0; i < 10; i++) rl.consume()
    expect(rl.consume()).toBe(false)

    vi.advanceTimersByTime(3_000)  // +3 seconds → +3 tokens
    expect(rl.consume()).toBe(true)
  })

  it('does not refill beyond maxTokens', () => {
    const rl = new RateLimiter(10, 10_000)
    vi.advanceTimersByTime(100_000)  // way more time than needed
    const status = rl.getStatus()
    expect(status.tokens).toBe(10)
  })

  it('peek does not consume tokens', () => {
    const rl = new RateLimiter(1, 60_000)
    expect(rl.peek()).toBe(true)
    expect(rl.peek()).toBe(true)
    expect(rl.consume()).toBe(true)  // still 1 token available
    expect(rl.consume()).toBe(false)
  })

  it('getStatus returns correct maxTokens', () => {
    const rl = new RateLimiter(30, 60_000)
    expect(rl.getStatus().maxTokens).toBe(30)
  })

  it('getStatus.tokens equals floor of current tokens', () => {
    const rl = new RateLimiter(10, 10_000)  // 1 token/s
    for (let i = 0; i < 10; i++) rl.consume()  // drain
    vi.advanceTimersByTime(1_500)  // +1.5 tokens
    const { tokens } = rl.getStatus()
    expect(tokens).toBe(1)  // floor(1.5) = 1
  })

  it('reset restores full tokens immediately', () => {
    const rl = new RateLimiter(5, 60_000)
    for (let i = 0; i < 5; i++) rl.consume()
    expect(rl.consume()).toBe(false)
    rl.reset()
    expect(rl.consume()).toBe(true)
  })

  it('consume with amount > 1 deducts multiple tokens', () => {
    const rl = new RateLimiter(10, 60_000)
    expect(rl.consume(5)).toBe(true)
    expect(rl.getStatus().tokens).toBe(5)
  })

  it('consume fails when amount exceeds remaining tokens', () => {
    const rl = new RateLimiter(3, 60_000)
    expect(rl.consume(5)).toBe(false)
    // tokens should be unchanged
    expect(rl.getStatus().tokens).toBe(3)
  })

  it('fullyRefillsInMs is 0 when already full', () => {
    const rl = new RateLimiter(10, 60_000)
    expect(rl.getStatus().fullyRefillsInMs).toBe(0)
  })

  it('nextTokenInMs is 0 when already full', () => {
    const rl = new RateLimiter(10, 60_000)
    expect(rl.getStatus().nextTokenInMs).toBe(0)
  })
})
