/// <reference lib="webworker" />
/**
 * pixel-compare.worker.ts
 * Web Worker for pixel-difference computation.
 *
 * Offloads the comparison to a background thread so the UI stays smooth
 * even when processing large ImageData buffers.
 *
 * Usage (in main thread, Vite):
 *   import PixelWorker from '../workers/pixel-compare.worker?worker'
 *   const worker = new PixelWorker()
 *   worker.postMessage({ type: 'compare', prev, curr, sampleRate: 16, threshold: 0.15 })
 *   worker.onmessage = (e) => console.log(e.data.shouldSend)
 */

// ── Message types (re-exported for use in main thread) ────────

export interface PixelCompareRequest {
  type: 'compare'
  /** Previous frame pixel data */
  prev: Uint8ClampedArray
  /** Current frame pixel data */
  curr: Uint8ClampedArray
  /** Sample every Nth pixel (default 16) */
  sampleRate?: number
  /** Minimum diff fraction to trigger send (default 0.15) */
  threshold?: number
}

export interface PixelCompareResponse {
  type: 'result'
  diffPercentage: number
  shouldSend: boolean
  threshold: number
  durationMs: number
}

// ── Worker handler ─────────────────────────────────────────────

self.onmessage = (e: MessageEvent<PixelCompareRequest>): void => {
  if (e.data.type !== 'compare') return

  const { prev, curr, sampleRate = 16, threshold = 0.15 } = e.data

  const t0 = performance.now()
  const diffPercentage = computePixelDiff(prev, curr, sampleRate)
  const durationMs = performance.now() - t0

  const response: PixelCompareResponse = {
    type: 'result',
    diffPercentage,
    shouldSend: diffPercentage >= threshold,
    threshold,
    durationMs,
  }

  ;(self as unknown as Worker).postMessage(response)
}

// ── Pixel difference algorithm ─────────────────────────────────

function computePixelDiff(
  prev: Uint8ClampedArray,
  curr: Uint8ClampedArray,
  sampleRate: number
): number {
  // Length mismatch means resolution changed — treat as full change
  if (prev.length !== curr.length) return 1

  let total = 0
  let count = 0

  // Each pixel = 4 bytes (R, G, B, A) — skip A channel
  for (let i = 0; i < prev.length; i += sampleRate * 4) {
    const dr = Math.abs(prev[i]     - curr[i])
    const dg = Math.abs(prev[i + 1] - curr[i + 1])
    const db = Math.abs(prev[i + 2] - curr[i + 2])
    total += (dr + dg + db) / 3
    count++
  }

  return count > 0 ? total / (count * 255) : 0
}
