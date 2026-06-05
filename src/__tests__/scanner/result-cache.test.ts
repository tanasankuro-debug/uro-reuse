import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ResultCache } from '../../lib/scanner-optimizer'

describe('ResultCache', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('stores and retrieves a value', () => {
    const cache = new ResultCache<string>(10_000)
    cache.set('key1', 'hello')
    expect(cache.get('key1')).toBe('hello')
  })

  it('returns null for unknown key', () => {
    const cache = new ResultCache<number>(10_000)
    expect(cache.get('missing')).toBeNull()
  })

  it('expires entries after TTL', () => {
    const cache = new ResultCache<string>(5_000)
    cache.set('key', 'value')
    vi.advanceTimersByTime(5_001)
    expect(cache.get('key')).toBeNull()
  })

  it('does not expire before TTL', () => {
    const cache = new ResultCache<string>(5_000)
    cache.set('key', 'value')
    vi.advanceTimersByTime(4_999)
    expect(cache.get('key')).toBe('value')
  })

  it('has() returns true for live entries', () => {
    const cache = new ResultCache<number>(10_000)
    cache.set('k', 42)
    expect(cache.has('k')).toBe(true)
  })

  it('has() returns false after expiry', () => {
    const cache = new ResultCache<number>(1_000)
    cache.set('k', 42)
    vi.advanceTimersByTime(1_001)
    expect(cache.has('k')).toBe(false)
  })

  it('size reflects only live entries', () => {
    const cache = new ResultCache<string>(1_000)
    cache.set('a', '1')
    cache.set('b', '2')
    expect(cache.size).toBe(2)
    vi.advanceTimersByTime(1_001)
    expect(cache.size).toBe(0)
  })

  it('clear removes all entries', () => {
    const cache = new ResultCache<string>(30_000)
    cache.set('a', '1')
    cache.set('b', '2')
    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.get('a')).toBeNull()
  })

  it('prune removes only expired entries', () => {
    const cache = new ResultCache<string>(5_000)
    cache.set('a', 'live')
    cache.set('b', 'expire')

    // Expire 'b' by manipulating time after it's set
    vi.advanceTimersByTime(5_001)
    cache.set('c', 'new')  // set after advance — TTL resets from now

    cache.prune()
    // 'a' and 'b' are expired, 'c' is still fresh but size uses prune internally
    expect(cache.get('a')).toBeNull()
    expect(cache.get('b')).toBeNull()
    expect(cache.get('c')).toBe('new')
  })

  it('overwrites existing key with new value', () => {
    const cache = new ResultCache<string>(10_000)
    cache.set('k', 'first')
    cache.set('k', 'second')
    expect(cache.get('k')).toBe('second')
  })

  it('works with object values', () => {
    const cache = new ResultCache<{ score: number }>(10_000)
    cache.set('food', { score: 85 })
    expect(cache.get('food')).toEqual({ score: 85 })
  })

  it('TTL defaults to 30 seconds', () => {
    const cache = new ResultCache()
    cache.set('k', 'v')
    vi.advanceTimersByTime(29_999)
    expect(cache.get('k')).toBe('v')
    vi.advanceTimersByTime(2)
    expect(cache.get('k')).toBeNull()
  })
})
