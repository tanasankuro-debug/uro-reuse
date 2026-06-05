import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImageCompressor } from '../../lib/scanner-optimizer'

// setup.ts already stubs canvas; these tests exercise the pure helper methods
// and the async compress path via the mocked canvas.

const FAKE_JPEG = 'data:image/jpeg;base64,/9j/fakedata=='
// ~18 bytes decoded → well under 100 KB limit
const SMALL_DATA_URL = 'data:image/jpeg;base64,' + 'A'.repeat(100)
// ~75 KB decoded → over the default 100 KB limit
const LARGE_DATA_URL = 'data:image/jpeg;base64,' + 'A'.repeat(140_000)

describe('ImageCompressor.getByteSize', () => {
  it('returns 0 for empty base64', () => {
    expect(ImageCompressor.getByteSize('data:image/jpeg;base64,')).toBe(0)
  })

  it('estimates byte size from base64 length', () => {
    // 4 base64 chars → 3 bytes
    const dataUrl = 'data:image/jpeg;base64,' + 'AAAA' // 4 chars
    expect(ImageCompressor.getByteSize(dataUrl)).toBe(3)
  })

  it('handles data URLs without explicit mime prefix', () => {
    const raw = 'A'.repeat(400)
    const size = ImageCompressor.getByteSize('data:image/jpeg;base64,' + raw)
    expect(size).toBeGreaterThan(0)
  })
})

describe('ImageCompressor.needsCompression', () => {
  it('returns false for data below threshold', () => {
    expect(ImageCompressor.needsCompression(SMALL_DATA_URL)).toBe(false)
  })

  it('returns true for data above threshold', () => {
    expect(ImageCompressor.needsCompression(LARGE_DATA_URL)).toBe(true)
  })

  it('respects custom maxBytes', () => {
    // 100 base64 A chars ≈ 75 bytes — above a 50-byte threshold
    expect(ImageCompressor.needsCompression(SMALL_DATA_URL, 50)).toBe(true)
  })
})

describe('ImageCompressor.scaleDimensions', () => {
  it('returns original dimensions when both fit in max', () => {
    expect(ImageCompressor.scaleDimensions(400, 300, 512)).toEqual({ width: 400, height: 300 })
  })

  it('scales down landscape image proportionally', () => {
    const { width, height } = ImageCompressor.scaleDimensions(1024, 512, 512)
    expect(width).toBe(512)
    expect(height).toBe(256)
  })

  it('scales down portrait image proportionally', () => {
    const { width, height } = ImageCompressor.scaleDimensions(512, 1024, 512)
    expect(width).toBe(256)
    expect(height).toBe(512)
  })

  it('scales down square image', () => {
    const { width, height } = ImageCompressor.scaleDimensions(1024, 1024, 512)
    expect(width).toBe(512)
    expect(height).toBe(512)
  })

  it('does not upscale small images', () => {
    expect(ImageCompressor.scaleDimensions(100, 100, 512)).toEqual({ width: 100, height: 100 })
  })
})

describe('ImageCompressor.compress', () => {
  beforeEach(() => {
    // Restore the global Image mock for each test
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width  = 800
      height = 600
      set src(_: string) {
        // Simulate async image load
        setTimeout(() => this.onload?.(), 0)
      }
    })
  })

  it('returns a data URL string', async () => {
    const result = await ImageCompressor.compress(FAKE_JPEG)
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('uses DEFAULTS when no options provided', () => {
    expect(ImageCompressor.DEFAULTS.maxDimension).toBe(512)
    expect(ImageCompressor.DEFAULTS.quality).toBe(0.7)
    expect(ImageCompressor.DEFAULTS.maxBytes).toBe(100 * 1024)
  })

  it('rejects when image fails to load', async () => {
    vi.stubGlobal('Image', class {
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      set src(_: string) {
        setTimeout(() => this.onerror?.(), 0)
      }
    })
    await expect(ImageCompressor.compress(FAKE_JPEG)).rejects.toThrow('Failed to decode image')
  })
})
