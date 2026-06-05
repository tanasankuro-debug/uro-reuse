/**
 * analyze-food.ts
 * ─────────────────────────────────────────────────────────────────
 * Service layer สำหรับวิเคราะห์อาหาร (client-side, Vite)
 *
 * ฟีเจอร์:
 *   - client-side rate limiting (30 req/min per session)
 *   - base64 size validation
 *   - JSON validation ผ่าน gemini-food-analyzer
 *   - Supabase save ผ่าน scanner-queries (non-blocking)
 *   - error normalization
 * ─────────────────────────────────────────────────────────────────
 */

import {
  analyzeFoodImage,
  mockAnalyzeFoodImage,
  type FoodAnalysisResult,
  GeminiSizeError,
  GeminiNoFoodError,
  GeminiParseError,
} from '../lib/gemini-food-analyzer'
import { saveScanResult } from '../lib/scanner-queries'

// ═══════════════════════════════════════════════════════════════
// RATE LIMITER — 30 requests/minute per session
// ═══════════════════════════════════════════════════════════════

const RATE_LIMIT    = 30
const RATE_WINDOW_MS = 60_000

const requestLog: number[] = []

function checkRateLimit(): void {
  const now    = Date.now()
  const cutoff = now - RATE_WINDOW_MS

  while (requestLog.length > 0 && requestLog[0] < cutoff) {
    requestLog.shift()
  }

  if (requestLog.length >= RATE_LIMIT) {
    const waitSec = Math.ceil((requestLog[0] + RATE_WINDOW_MS - now) / 1000)
    throw new RateLimitError(
      `เกินขีดจำกัดการสแกน (${RATE_LIMIT} ครั้ง/นาที) — รอ ${waitSec} วินาที`
    )
  }

  requestLog.push(now)
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// ═══════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnalyzeResult {
  success:   true
  data:      FoodAnalysisResult
  savedToDb: boolean
}

export interface AnalyzeError {
  success:   false
  error:     string
  errorType: 'rate_limit' | 'size' | 'no_food' | 'parse' | 'network' | 'unknown'
}

export type AnalyzeResponse = AnalyzeResult | AnalyzeError

// ═══════════════════════════════════════════════════════════════
// MAIN SERVICE
// ═══════════════════════════════════════════════════════════════

/**
 * analyzeFoodService — entry point สำหรับทุก scanner component
 *
 * @param base64Image — data URL หรือ raw base64 JPEG
 * @param userId      — Supabase user ID (null = guest, จะไม่ save)
 */
export async function analyzeFoodService(
  base64Image: string,
  userId: string | null = null
): Promise<AnalyzeResponse> {
  const isDev = !import.meta.env.VITE_GEMINI_API_KEY

  try {
    // 1. Rate limit
    checkRateLimit()

    // 2. Size validation — fail fast ก่อน API call
    const rawBase64       = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const estimatedBytes  = (rawBase64.length * 3) / 4
    if (estimatedBytes > 4 * 1024 * 1024) {
      throw new GeminiSizeError(estimatedBytes / 1024)
    }

    // 3. Gemini call (หรือ mock ใน dev)
    const result = isDev
      ? await mockAnalyzeFoodImage()
      : await analyzeFoodImage(base64Image)

    // 4. Save ลง Supabase (non-blocking, ไม่ await เต็ม)
    //    ใช้ saveScanResult จาก scanner-queries ที่ match schema ใหม่
    let savedToDb = false
    if (userId) {
      saveScanResult(result, userId, { scanSource: 'camera' }).then((id) => {
        savedToDb = !!id
      })
    }

    return { success: true, data: result, savedToDb }

  } catch (err) {
    return normalizeError(err)
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR NORMALIZATION
// ═══════════════════════════════════════════════════════════════

function normalizeError(err: unknown): AnalyzeError {
  if (err instanceof RateLimitError) {
    return { success: false, error: err.message, errorType: 'rate_limit' }
  }
  if (err instanceof GeminiSizeError) {
    return { success: false, error: err.message, errorType: 'size' }
  }
  if (err instanceof GeminiNoFoodError) {
    return { success: false, error: err.message, errorType: 'no_food' }
  }
  if (err instanceof GeminiParseError) {
    return {
      success: false,
      error: 'AI ตอบกลับในรูปแบบที่ไม่ถูกต้อง — กำลังลองใหม่...',
      errorType: 'parse',
    }
  }
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return {
      success: false,
      error: 'ไม่สามารถเชื่อมต่อ Gemini API — ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      errorType: 'network',
    }
  }
  return {
    success: false,
    error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    errorType: 'unknown',
  }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT STATUS — สำหรับแสดง UI
// ═══════════════════════════════════════════════════════════════

export function getRateLimitStatus(): { used: number; limit: number; resetInMs: number } {
  const now    = Date.now()
  const cutoff = now - RATE_WINDOW_MS
  const active = requestLog.filter((t) => t >= cutoff)
  const oldest = active[0] ?? now
  return {
    used:      active.length,
    limit:     RATE_LIMIT,
    resetInMs: Math.max(0, oldest + RATE_WINDOW_MS - now),
  }
}
