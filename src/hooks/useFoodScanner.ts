/**
 * useFoodScanner.ts
 * ─────────────────────────────────────────────────────────────────
 * Custom hook สำหรับจัดการ scan workflow ทั้งหมด
 *
 * ฟีเจอร์:
 *  - state: scanResult, isLoading, error, scanHistory
 *  - analyzeImage(base64) — วิเคราะห์ภาพ พร้อม retry 3 ครั้ง
 *  - clearResult()
 *  - saveToProfile() — บันทึกผลลงประวัติ Supabase
 *  - 30-วินาที cache — ไม่ส่ง API ซ้ำถ้าภาพไม่เปลี่ยน
 *  - rate limit status
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from 'react'
import { analyzeFoodService, getRateLimitStatus, type AnalyzeResponse } from '../server/analyze-food'
import type { FoodAnalysisResult } from '../lib/gemini-food-analyzer'
import { saveScanResult } from '../lib/scanner-queries'
import { useApp } from '../store/useAppStore'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ScanHistoryItem extends FoodAnalysisResult {
  id: string          // unique scan ID
  scannedAt: number   // timestamp ms
  thumbnail: string   // base64 preview (small)
}

export interface RateLimitInfo {
  used: number
  limit: number
  resetInMs: number
}

export interface UseFoodScannerReturn {
  // ── State ─────────────────────────────────────────────────────
  scanResult: FoodAnalysisResult | null
  isLoading: boolean
  error: string | null
  errorType: AnalyzeResponse extends { errorType: infer T } ? T : never
  scanHistory: ScanHistoryItem[]
  scanCount: number
  rateLimit: RateLimitInfo

  // ── Actions ───────────────────────────────────────────────────
  analyzeImage: (base64: string) => Promise<FoodAnalysisResult | null>
  clearResult: () => void
  clearHistory: () => void
  saveToProfile: () => Promise<boolean>
  retryLastScan: () => Promise<FoodAnalysisResult | null>
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_RETRIES = 3
const RETRY_DELAY_MS = [1000, 2000, 3000] // exponential backoff
const CACHE_TTL_MS = 30_000              // 30 วินาที
const HISTORY_MAX = 20                   // เก็บประวัติสูงสุด 20 รายการ

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** hash ภาพแบบ lightweight (ไม่ใช่ cryptographic) */
function quickHash(base64: string): string {
  const sample = base64.slice(22, 222) // ข้ามส่วน header
  let hash = 0
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0
  }
  return hash.toString(36)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function generateId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** ดึง thumbnail ขนาดเล็ก (ใช้ 200 chars แรกของ base64) */
function makeThumbnail(base64: string): string {
  return base64.slice(0, 300)
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useFoodScanner(): UseFoodScannerReturn {
  const { state } = useApp()
  const userId = state.user?.id ?? null

  // ── State ─────────────────────────────────────────────────────
  const [scanResult, setScanResult] = useState<FoodAnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<string>('unknown')
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [scanCount, setScanCount] = useState(0)
  const [rateLimit, setRateLimit] = useState<RateLimitInfo>({
    used: 0,
    limit: 30,
    resetInMs: 0,
  })

  // ── Cache refs ────────────────────────────────────────────────
  const cacheRef = useRef<{
    hash: string
    result: FoodAnalysisResult
    cachedAt: number
  } | null>(null)
  const lastBase64Ref = useRef<string | null>(null)

  // ── Internal: เรียก API พร้อม retry ──────────────────────────
  const callWithRetry = useCallback(
    async (base64: string, attempt = 0): Promise<FoodAnalysisResult | null> => {
      const response = await analyzeFoodService(base64, userId)

      if (response.success) return response.data

      const { error: errMsg, errorType: etype } = response

      // ไม่ retry สำหรับ error ที่ retry ไม่ได้ช่วย
      const noRetryTypes = ['rate_limit', 'size', 'no_food']
      if (noRetryTypes.includes(etype)) {
        throw Object.assign(new Error(errMsg), { errorType: etype })
      }

      // Retry สำหรับ network / parse / unknown
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS[attempt] ?? 3000
        console.warn(`[useFoodScanner] attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
        await sleep(delay)
        return callWithRetry(base64, attempt + 1)
      }

      throw Object.assign(new Error(errMsg), { errorType: etype })
    },
    [userId]
  )

  // ── analyzeImage ──────────────────────────────────────────────
  const analyzeImage = useCallback(
    async (base64: string): Promise<FoodAnalysisResult | null> => {
      if (!base64) return null

      setError(null)
      lastBase64Ref.current = base64

      // ── Cache check ──────────────────────────────────────────
      const hash = quickHash(base64)
      const cached = cacheRef.current
      if (
        cached &&
        cached.hash === hash &&
        Date.now() - cached.cachedAt < CACHE_TTL_MS
      ) {
        setScanResult(cached.result)
        return cached.result
      }

      setIsLoading(true)

      try {
        const result = await callWithRetry(base64)
        if (!result) return null

        // ── Update cache ─────────────────────────────────────
        cacheRef.current = { hash, result, cachedAt: Date.now() }

        // ── Update state ─────────────────────────────────────
        setScanResult(result)
        setScanCount((n) => n + 1)

        // ── Add to history ───────────────────────────────────
        const historyItem: ScanHistoryItem = {
          ...result,
          id: generateId(),
          scannedAt: Date.now(),
          thumbnail: makeThumbnail(base64),
        }
        setScanHistory((prev) => [historyItem, ...prev].slice(0, HISTORY_MAX))

        // ── Update rate limit display ─────────────────────────
        setRateLimit(getRateLimitStatus())

        return result

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาด'
        const etype = (err as { errorType?: string }).errorType ?? 'unknown'
        setError(msg)
        setErrorType(etype)
        setRateLimit(getRateLimitStatus())
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [callWithRetry]
  )

  // ── clearResult ───────────────────────────────────────────────
  const clearResult = useCallback(() => {
    setScanResult(null)
    setError(null)
  }, [])

  // ── clearHistory ──────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setScanHistory([])
  }, [])

  // ── saveToProfile ─────────────────────────────────────────────
  const saveToProfile = useCallback(async (): Promise<boolean> => {
    if (!scanResult || !userId) return false
    const id = await saveScanResult(scanResult, userId, { usedFor: 'personal' })
    return !!id
  }, [scanResult, userId])

  // ── retryLastScan ─────────────────────────────────────────────
  const retryLastScan = useCallback((): Promise<FoodAnalysisResult | null> => {
    const last = lastBase64Ref.current
    if (!last) return Promise.resolve(null)
    // Bust cache ก่อน retry
    cacheRef.current = null
    return analyzeImage(last)
  }, [analyzeImage])

  return {
    scanResult,
    isLoading,
    error,
    errorType: errorType as never,
    scanHistory,
    scanCount,
    rateLimit,
    analyzeImage,
    clearResult,
    clearHistory,
    saveToProfile,
    retryLastScan,
  }
}
