/**
 * useScannerQuota.ts
 * Reactive quota state derived from the sliding-window rate limiter
 * in analyze-food.ts. Polls every second so the UI stays in sync.
 */

import { useState, useEffect, useCallback } from 'react'
import { getRateLimitStatus } from '../server/analyze-food'
import { formatCountdown } from '../lib/scanner-error-handler'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ScannerQuota {
  /** Calls made in the current window */
  used: number
  /** Calls still available */
  remaining: number
  /** Hard limit (30) */
  limit: number
  /** ms until the oldest request leaves the window */
  resetInMs: number
  /** 0–100 */
  percentUsed: number
  /** true when used >= limit */
  isLimited: boolean
  /** true when ≥ 80 % of quota is consumed */
  isWarning: boolean
  /** Human-readable countdown, e.g. "45 วินาที" or "—" */
  formattedReset: string
}

// ── Color helpers consumed by quota badge UIs ─────────────────

export function quotaColor(q: ScannerQuota): string {
  if (q.isLimited) return '#ef4444'  // red
  if (q.isWarning) return '#f97316'  // orange
  if (q.percentUsed >= 50) return '#eab308' // yellow
  return '#22c55e'                   // green
}

export function quotaLabel(q: ScannerQuota): string {
  if (q.isLimited) return 'ครบโควต้า'
  if (q.isWarning) return 'ใกล้ครบ'
  return 'ใช้ได้'
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * @param pollIntervalMs How often to re-read the rate limiter state (ms).
 *                       Defaults to 1000 ms (1 second).
 */
export function useScannerQuota(pollIntervalMs = 1_000): ScannerQuota {
  const derive = useCallback((): ScannerQuota => {
    const { used, limit, resetInMs } = getRateLimitStatus()
    const remaining = Math.max(0, limit - used)

    return {
      used,
      remaining,
      limit,
      resetInMs,
      percentUsed:    (used / limit) * 100,
      isLimited:      used >= limit,
      isWarning:      used > 0 && used / limit >= 0.8,
      formattedReset: resetInMs > 0 ? formatCountdown(resetInMs) : '—',
    }
  }, [])

  const [quota, setQuota] = useState<ScannerQuota>(derive)

  useEffect(() => {
    const id = setInterval(() => setQuota(derive()), pollIntervalMs)
    return () => clearInterval(id)
  }, [derive, pollIntervalMs])

  return quota
}
