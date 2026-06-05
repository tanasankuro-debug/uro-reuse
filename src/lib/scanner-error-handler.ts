/**
 * scanner-error-handler.ts
 * Unified error types, classifiers, localStorage fallback, and utilities
 * for the FoodRescue scanner system.
 */

import type { FoodAnalysisResult } from './gemini-food-analyzer'

// ═══════════════════════════════════════════════════════════════
// CAMERA ERRORS
// ═══════════════════════════════════════════════════════════════

export type CameraErrorType =
  | 'permission_denied'
  | 'not_found'
  | 'camera_busy'
  | 'https_required'
  | 'unsupported_browser'
  | 'unknown'

export interface CameraErrorInfo {
  type: CameraErrorType
  originalName: string
  message: string
  recoverable: boolean
}

/** Map a getUserMedia DOMException → CameraErrorType */
export function classifyCameraError(err: unknown): CameraErrorInfo {
  const isHttp =
    typeof location !== 'undefined' &&
    location.protocol === 'http:' &&
    location.hostname !== 'localhost' &&
    location.hostname !== '127.0.0.1'

  if (isHttp) {
    return {
      type: 'https_required',
      originalName: 'http',
      message: 'getUserMedia ต้องใช้งานบน HTTPS เท่านั้น',
      recoverable: false,
    }
  }

  if (!(err instanceof Error)) {
    return { type: 'unknown', originalName: 'unknown', message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', recoverable: true }
  }

  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return { type: 'permission_denied', originalName: err.name, message: err.message, recoverable: true }

    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return { type: 'not_found', originalName: err.name, message: err.message, recoverable: false }

    case 'NotReadableError':
    case 'TrackStartError':
      return { type: 'camera_busy', originalName: err.name, message: err.message, recoverable: true }

    case 'SecurityError':
      return {
        type: isHttp ? 'https_required' : 'permission_denied',
        originalName: err.name,
        message: err.message,
        recoverable: false,
      }

    case 'AbortError':
    case 'OverconstrainedError':
      return { type: 'unknown', originalName: err.name, message: err.message, recoverable: true }

    default:
      // Detect browser support — no getUserMedia at all
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return { type: 'unsupported_browser', originalName: 'unsupported', message: 'Browser ไม่รองรับ', recoverable: false }
      }
      return { type: 'unknown', originalName: err.name, message: err.message, recoverable: true }
  }
}

// ═══════════════════════════════════════════════════════════════
// AI / GEMINI ERRORS
// ═══════════════════════════════════════════════════════════════

export type AIErrorType =
  | 'no_food'
  | 'low_confidence'
  | 'rate_limit'
  | 'timeout'
  | 'invalid_json'
  | 'network'
  | 'unknown'

export interface AIErrorInfo {
  type: AIErrorType
  message: string
  resetInMs?: number   // only for rate_limit
  retriable: boolean
}

/** Map AnalyzeError.errorType string → AIErrorType */
export function classifyAIError(errorType: string): AIErrorType {
  switch (errorType) {
    case 'no_food':    return 'no_food'
    case 'rate_limit': return 'rate_limit'
    case 'parse':      return 'invalid_json'
    case 'network':    return 'network'
    case 'timeout':    return 'timeout'
    case 'size':       return 'unknown'
    default:           return 'unknown'
  }
}

/** Detect low AI confidence (< 0.4) from a successful result */
export function isLowConfidence(result: FoodAnalysisResult): boolean {
  return result.ai_confidence < 0.4
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE / SAVE ERRORS
// ═══════════════════════════════════════════════════════════════

export type SupabaseErrorType = 'save_failed' | 'upload_failed'

// ═══════════════════════════════════════════════════════════════
// PLATFORM DETECTION
// ═══════════════════════════════════════════════════════════════

export type Platform =
  | 'ios_safari'
  | 'ios_chrome'
  | 'android_chrome'
  | 'desktop_chrome'
  | 'desktop_safari'
  | 'desktop_firefox'
  | 'other'

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent

  const isIOS     = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)
  const isChrome  = /CriOS|Chrome/.test(ua) && !/Edge/.test(ua)
  const isSafari  = /Safari/.test(ua) && !/Chrome|CriOS/.test(ua)
  const isFirefox = /Firefox/.test(ua)

  if (isIOS && isChrome)  return 'ios_chrome'
  if (isIOS)              return 'ios_safari'   // all iOS WKWebView
  if (isAndroid && isChrome) return 'android_chrome'
  if (!isIOS && !isAndroid && isChrome)  return 'desktop_chrome'
  if (!isIOS && !isAndroid && isSafari)  return 'desktop_safari'
  if (!isIOS && !isAndroid && isFirefox) return 'desktop_firefox'
  return 'other'
}

// ═══════════════════════════════════════════════════════════════
// LOCALSTORAGE PENDING SAVES
// Saves failed scan results locally so they can be retried later.
// ═══════════════════════════════════════════════════════════════

const LS_PENDING_KEY  = 'ff_pending_scans'
const MAX_PENDING     = 10

export interface PendingScanEntry {
  result: FoodAnalysisResult
  userId: string
  savedAt: number
  retries: number
}

export function saveScanResultLocally(result: FoodAnalysisResult, userId: string): void {
  try {
    const existing = getPendingLocalResults()
    const entry: PendingScanEntry = { result, userId, savedAt: Date.now(), retries: 0 }
    const updated = [entry, ...existing].slice(0, MAX_PENDING)
    localStorage.setItem(LS_PENDING_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable (private mode, storage full, etc.)
  }
}

export function getPendingLocalResults(): PendingScanEntry[] {
  try {
    const raw = localStorage.getItem(LS_PENDING_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingScanEntry[]
  } catch {
    return []
  }
}

export function removePendingLocalResult(savedAt: number): void {
  try {
    const updated = getPendingLocalResults().filter((e) => e.savedAt !== savedAt)
    localStorage.setItem(LS_PENDING_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function clearPendingLocalResults(): void {
  try { localStorage.removeItem(LS_PENDING_KEY) } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// NETWORK STATUS
// ═══════════════════════════════════════════════════════════════

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/** Register callbacks for online/offline events. Returns cleanup fn. */
export function watchNetwork(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMATTING UTILS
// ═══════════════════════════════════════════════════════════════

/** Format milliseconds → human-readable countdown string (Thai) */
export function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min > 0) return `${min}:${sec.toString().padStart(2, '0')} นาที`
  return `${sec} วินาที`
}
