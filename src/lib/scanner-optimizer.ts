/**
 * scanner-optimizer.ts
 * API cost + frontend performance utilities for the Real-Time Food Scanner.
 *
 * Exports:
 *   SmartDebouncer  — pixel-diff gating (skip frames that haven't changed)
 *   ImageCompressor — resize + JPEG compress before sending to Gemini
 *   ResultCache     — generic TTL cache (designed for useRef)
 *   RateLimiter     — token bucket (30 tokens / 60 s by default)
 *   BatchProcessor  — runs N frames concurrently, returns highest-confidence result
 */

// ═══════════════════════════════════════════════════════════════
// SMART DEBOUNCER
// Skips API calls when the scene hasn't changed meaningfully.
// ═══════════════════════════════════════════════════════════════

export interface DebouncerOptions {
  /** Fractional pixel change required to trigger a send (0–1, default 0.15) */
  threshold?: number
  /** Sample every Nth pixel — higher = faster but less accurate (default 16) */
  sampleRate?: number
}

export class SmartDebouncer {
  private readonly threshold: number
  private readonly sampleRate: number
  private prevData: Uint8ClampedArray | null = null

  constructor(options?: DebouncerOptions) {
    this.threshold  = options?.threshold  ?? 0.15
    this.sampleRate = options?.sampleRate ?? 16
  }

  /**
   * Returns true if the frame is sufficiently different from the last one
   * to warrant an API call. Advances internal state on every invocation.
   */
  shouldSend(imageData: ImageData): boolean {
    const curr = imageData.data

    if (!this.prevData || this.prevData.length !== curr.length) {
      this.prevData = new Uint8ClampedArray(curr)
      return true
    }

    const diff = this.computeDiff(curr)
    this.prevData.set(curr)
    return diff >= this.threshold
  }

  /** Read-only diff percentage (0–1) without advancing internal state */
  getDiffPercentage(imageData: ImageData): number {
    if (!this.prevData || this.prevData.length !== imageData.data.length) return 1
    return this.computeDiff(imageData.data)
  }

  reset(): void { this.prevData = null }

  private computeDiff(curr: Uint8ClampedArray): number {
    const prev = this.prevData!
    let total = 0
    let count = 0

    for (let i = 0; i < prev.length; i += this.sampleRate * 4) {
      const dr = Math.abs(prev[i]     - curr[i])
      const dg = Math.abs(prev[i + 1] - curr[i + 1])
      const db = Math.abs(prev[i + 2] - curr[i + 2])
      total += (dr + dg + db) / 3
      count++
    }

    return count > 0 ? total / (count * 255) : 0
  }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE COMPRESSOR
// Resizes to ≤ 512px and compresses to ≤ 100 KB.
// Canvas re-encode also strips EXIF data automatically.
// ═══════════════════════════════════════════════════════════════

export interface CompressOptions {
  maxDimension?: number   // default 512
  quality?: number        // 0–1,  default 0.7
  maxBytes?: number       // default 102_400 (100 KB)
}

export class ImageCompressor {
  static readonly DEFAULTS: Required<CompressOptions> = {
    maxDimension: 512,
    quality:      0.7,
    maxBytes:     100 * 1024,
  }

  /** Compress a data-URL. Returns a new data-URL. */
  static async compress(dataUrl: string, options?: CompressOptions): Promise<string> {
    const cfg = { ...ImageCompressor.DEFAULTS, ...options }

    return new Promise<string>((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const { width, height } = ImageCompressor.scaleDimensions(
          img.width, img.height, cfg.maxDimension
        )
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas 2D context unavailable'))

        ctx.drawImage(img, 0, 0, width, height)

        let result = canvas.toDataURL('image/jpeg', cfg.quality)

        if (ImageCompressor.getByteSize(result) > cfg.maxBytes) {
          result = canvas.toDataURL('image/jpeg', 0.5)
        }

        resolve(result)
      }

      img.onerror = () => reject(new Error('Failed to decode image'))
      img.src = dataUrl
    })
  }

  /** Estimated byte size of a data-URL (not exact due to base64 padding) */
  static getByteSize(dataUrl: string): number {
    const raw = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    return Math.round((raw.length * 3) / 4)
  }

  static needsCompression(dataUrl: string, maxBytes = ImageCompressor.DEFAULTS.maxBytes): boolean {
    return ImageCompressor.getByteSize(dataUrl) > maxBytes
  }

  static scaleDimensions(
    w: number,
    h: number,
    max: number
  ): { width: number; height: number } {
    if (w <= max && h <= max) return { width: w, height: h }
    const ratio = Math.min(max / w, max / h)
    return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
  }
}

// ═══════════════════════════════════════════════════════════════
// RESULT CACHE
// Generic TTL cache. Designed to live inside a React useRef so that
// mutations don't trigger re-renders.
// ═══════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  value:     T
  expiresAt: number
}

export class ResultCache<T> {
  private readonly store  = new Map<string, CacheEntry<T>>()
  private readonly ttlMs: number

  constructor(ttlMs = 30_000) { this.ttlMs = ttlMs }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  get(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null }
    return entry.value
  }

  has(key: string): boolean { return this.get(key) !== null }

  /** Remove all expired entries */
  prune(): void {
    const now = Date.now()
    for (const [k, v] of this.store) {
      if (now > v.expiresAt) this.store.delete(k)
    }
  }

  clear(): void { this.store.clear() }

  get size(): number { this.prune(); return this.store.size }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER — Token Bucket
// Refills continuously (not in discrete windows), allowing short
// bursts while still enforcing a long-term rate.
// ═══════════════════════════════════════════════════════════════

export interface RateLimiterStatus {
  tokens:           number  // integer floor of current tokens
  maxTokens:        number
  nextTokenInMs:    number  // ms until 1 more token is available
  fullyRefillsInMs: number  // ms until completely full
}

export class RateLimiter {
  private tokens:              number
  private readonly maxTokens:  number
  private readonly ratePerMs:  number  // tokens / ms
  private lastRefill:          number

  constructor(maxTokens = 30, windowMs = 60_000) {
    this.maxTokens  = maxTokens
    this.tokens     = maxTokens
    this.ratePerMs  = maxTokens / windowMs
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    this.tokens     = Math.min(this.maxTokens, this.tokens + (now - this.lastRefill) * this.ratePerMs)
    this.lastRefill = now
  }

  /** Deduct `amount` tokens. Returns false when quota exceeded. */
  consume(amount = 1): boolean {
    this.refill()
    if (this.tokens >= amount) { this.tokens -= amount; return true }
    return false
  }

  /** Check availability without consuming */
  peek(amount = 1): boolean { this.refill(); return this.tokens >= amount }

  getStatus(): RateLimiterStatus {
    this.refill()
    const floored     = Math.floor(this.tokens)
    const msPerToken  = 1 / this.ratePerMs
    return {
      tokens:           floored,
      maxTokens:        this.maxTokens,
      nextTokenInMs:    floored < this.maxTokens
                          ? Math.ceil((1 - (this.tokens - floored)) * msPerToken)
                          : 0,
      fullyRefillsInMs: Math.ceil((this.maxTokens - this.tokens) * msPerToken),
    }
  }

  reset(): void { this.tokens = this.maxTokens; this.lastRefill = Date.now() }
}

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSOR
// Sends up to N images to the analyzer concurrently and picks the
// result with the highest ai_confidence score.
// ═══════════════════════════════════════════════════════════════

export interface BatchResult<T extends { ai_confidence: number }> {
  best:          T
  allResults:    T[]
  totalAttempts: number
  successCount:  number
}

export class BatchProcessor {
  /**
   * Analyzes `images` (max `maxBatch`) concurrently.
   * Returns the result with the highest ai_confidence, or null if all failed.
   */
  static async processBest<T extends { ai_confidence: number }>(
    images:     string[],
    analyzer:   (img: string) => Promise<T | null>,
    maxBatch = 5
  ): Promise<BatchResult<T> | null> {
    const batch = images.slice(0, maxBatch)

    const settled = await Promise.allSettled(batch.map(analyzer))

    const successful: T[] = []
    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value !== null) {
        successful.push(r.value as T)
      }
    }

    if (!successful.length) return null

    const best = successful.reduce((a, b) => b.ai_confidence > a.ai_confidence ? b : a)

    return {
      best,
      allResults:    successful,
      totalAttempts: batch.length,
      successCount:  successful.length,
    }
  }
}
