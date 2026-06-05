/**
 * scanner-analytics.ts
 * Lightweight client-side analytics for the Food Scanner.
 * Events are stored in localStorage (max 500 entries, FIFO eviction).
 * No external service required — all computation happens in-browser.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AnalyticsEventType =
  | 'api_call'      // every Gemini request (success or failure)
  | 'api_success'   // successful parse + result
  | 'api_error'     // any error from analyze-food
  | 'scan_save'     // user saved result to Supabase
  | 'scan_share'    // user shared result

export interface AnalyticsEvent {
  type:        AnalyticsEventType
  timestamp:   number
  /** ms from request to response */
  durationMs?: number
  success?:    boolean
  foodType?:   string     // food_type (Thai)
  category?:   string     // food_category enum
  confidence?: number     // ai_confidence 0–1
  errorType?:  string     // AnalyzeError.errorType
  userId?:     string
}

export interface FoodTypeCount {
  type:  string
  count: number
}

export interface HourlyCount {
  hour:  number  // 0–23
  count: number
}

export interface ScannerStats {
  totalCalls:       number
  totalSuccesses:   number
  successRate:      number  // 0–1
  avgConfidence:    number  // 0–1
  avgDurationMs:    number
  topFoodTypes:     FoodTypeCount[]
  errorsByType:     Record<string, number>
  callsPerHour:     HourlyCount[]   // last 24 hours
  callsToday:       number
  callsThisWeek:    number
  peakHour:         number | null   // hour with most calls
}

// ═══════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════

const LS_KEY     = 'ff_scanner_analytics'
const MAX_EVENTS = 500

function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AnalyticsEvent[]
  } catch {
    return []
  }
}

function saveEvents(events: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(events))
  } catch {
    // Storage full — clear half and retry once
    try {
      const trimmed = events.slice(events.length / 2)
      localStorage.setItem(LS_KEY, JSON.stringify(trimmed))
    } catch {
      // Give up gracefully — analytics is non-critical
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TRACK
// ═══════════════════════════════════════════════════════════════

/** Record a new event. Fire-and-forget — never throws. */
export function trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
  try {
    const events = loadEvents()
    const newEntry: AnalyticsEvent = { ...event, timestamp: Date.now() }
    // FIFO eviction when over limit
    const updated = [...events, newEntry].slice(-MAX_EVENTS)
    saveEvents(updated)
  } catch {
    // Never let analytics break the scanner
  }
}

/** Convenience: track a complete API call */
export function trackApiCall(options: {
  success:     boolean
  durationMs:  number
  foodType?:   string
  category?:   string
  confidence?: number
  errorType?:  string
  userId?:     string
}): void {
  trackEvent({ type: 'api_call',   ...options })
  if (options.success) {
    trackEvent({ type: 'api_success', ...options })
  } else {
    trackEvent({ type: 'api_error', ...options })
  }
}

/** Convenience: track a save action */
export function trackSave(userId?: string): void {
  trackEvent({ type: 'scan_save', userId })
}

// ═══════════════════════════════════════════════════════════════
// STATS COMPUTATION
// ═══════════════════════════════════════════════════════════════

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

export function getStats(): ScannerStats {
  const events  = loadEvents()
  const now     = Date.now()
  const DAY_MS  = 86_400_000
  const WEEK_MS = 7 * DAY_MS
  const HOUR_MS = 3_600_000

  const calls     = events.filter((e) => e.type === 'api_call')
  const successes = events.filter((e) => e.type === 'api_success')
  const errors    = events.filter((e) => e.type === 'api_error')

  // Top food types
  const foodCounts: Record<string, number> = {}
  successes.forEach((e) => {
    if (e.foodType) foodCounts[e.foodType] = (foodCounts[e.foodType] ?? 0) + 1
  })
  const topFoodTypes = Object.entries(foodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([type, count]) => ({ type, count }))

  // Error breakdown
  const errorsByType: Record<string, number> = {}
  errors.forEach((e) => {
    const t = e.errorType ?? 'unknown'
    errorsByType[t] = (errorsByType[t] ?? 0) + 1
  })

  // Avg confidence + duration
  const confidences = successes.filter((e) => e.confidence != null).map((e) => e.confidence!)
  const durations   = calls.filter((e) => e.durationMs != null).map((e) => e.durationMs!)

  // Calls per hour (last 24 h)
  const hourBuckets: number[] = Array(24).fill(0)
  calls.forEach((e) => {
    const hoursAgo = Math.floor((now - e.timestamp) / HOUR_MS)
    if (hoursAgo < 24) hourBuckets[23 - hoursAgo]++
  })
  const callsPerHour: HourlyCount[] = hourBuckets.map((count, i) => ({
    hour: (new Date().getHours() - 23 + i + 24) % 24,
    count,
  }))

  const peakBucket = [...hourBuckets]
    .map((count, i) => ({ count, i }))
    .sort((a, b) => b.count - a.count)[0]

  return {
    totalCalls:     calls.length,
    totalSuccesses: successes.length,
    successRate:    calls.length > 0 ? successes.length / calls.length : 0,
    avgConfidence:  avg(confidences),
    avgDurationMs:  avg(durations),
    topFoodTypes,
    errorsByType,
    callsPerHour,
    callsToday:     calls.filter((e) => now - e.timestamp < DAY_MS).length,
    callsThisWeek:  calls.filter((e) => now - e.timestamp < WEEK_MS).length,
    peakHour:       peakBucket?.count > 0 ? callsPerHour[peakBucket.i]?.hour ?? null : null,
  }
}

/** Wipe all analytics data */
export function clearStats(): void {
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

/** Export raw events as JSON string (for admin download) */
export function exportStats(): string {
  return JSON.stringify({ stats: getStats(), events: loadEvents() }, null, 2)
}
