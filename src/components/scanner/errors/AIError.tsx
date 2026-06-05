import { useState, useEffect, useRef } from 'react'
import { Alert } from 'antd'
import {
  FiRefreshCw,
  FiClock,
  FiWifiOff,
  FiAlertCircle,
  FiEye,
  FiX,
} from 'react-icons/fi'
import type { AIErrorType } from '../../../lib/scanner-error-handler'
import { formatCountdown } from '../../../lib/scanner-error-handler'
import type { FoodAnalysisResult } from '../../../lib/gemini-food-analyzer'

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface AIErrorProps {
  errorType: AIErrorType
  /** Milliseconds until rate limit resets — for rate_limit errors */
  resetInMs?: number
  onRetry?: () => void
  onDismiss?: () => void
  /** Last successful scan result (shown when offline) */
  cachedResult?: FoodAnalysisResult | null
  /** Network status — shows offline UI when false */
  isOnline?: boolean
  className?: string
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT COUNTDOWN
// ═══════════════════════════════════════════════════════════════

function RateLimitCountdown({
  resetInMs,
  onRetry,
}: {
  resetInMs: number
  onRetry?: () => void
}) {
  const [msLeft, setMsLeft] = useState(resetInMs)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMsLeft(resetInMs)
    timerRef.current = setInterval(() => {
      setMsLeft((prev) => {
        const next = prev - 1000
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return next
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [resetInMs])

  const isDone = msLeft <= 0
  const progressPct = resetInMs > 0 ? Math.max(0, 1 - msLeft / resetInMs) * 100 : 100

  return (
    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <FiClock className="text-4xl text-orange-400" />
        <h3 className="font-bold text-gray-800 dark:text-gray-100">เกินขีดจำกัดการสแกน</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">ใช้ AI ครบ 30 ครั้ง/นาทีแล้ว</p>
      </div>

      {/* Countdown display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center">
        {isDone ? (
          <p className="text-green-600 dark:text-green-400 font-bold text-base">
            ✓ พร้อมใช้งานแล้ว!
          </p>
        ) : (
          <>
            <p className="text-3xl font-black text-orange-500 tabular-nums leading-none">
              {formatCountdown(msLeft)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              อีก... โควต้าจะรีเซ็ต
            </p>
            <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {isDone && onRetry && (
        <button
          onClick={onRetry}
          className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
        >
          <FiRefreshCw className="inline mr-2 text-sm" />
          สแกนใหม่ได้เลย
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// NO FOOD HINT
// ═══════════════════════════════════════════════════════════════

function NoFoodHint({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-5xl select-none">🔍</span>
        <h3 className="font-bold text-gray-800 dark:text-gray-100">ไม่พบอาหารในภาพ</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          AI วิเคราะห์แล้วแต่ไม่พบอาหาร
          <br />
          กรุณาส่องกล้องที่อาหารโดยตรง
        </p>
      </div>

      {/* Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          เคล็ดลับ
        </p>
        {[
          'ให้อาหารอยู่ตรงกลางภาพ ไม่ตัดขอบ',
          'เว้นระยะ 20–40 cm จากกล้อง',
          'ตรวจสอบให้มีแสงเพียงพอ',
          'ลองวางบนพื้นขาว, จาน, หรือผ้า',
          'หลีกเลี่ยงภาพที่มีวัตถุอื่นบดบัง',
        ].map((tip) => (
          <p key={tip} className="text-xs text-gray-500 dark:text-gray-400 flex gap-2 items-start">
            <span className="text-yellow-500 shrink-0">→</span>
            {tip}
          </p>
        ))}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="w-full py-2.5 bg-yellow-400 text-white rounded-xl text-sm font-semibold hover:bg-yellow-500 transition-colors"
        >
          เข้าใจแล้ว — ลองใหม่
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// NETWORK ERROR
// ═══════════════════════════════════════════════════════════════

function NetworkError({
  cachedResult,
  onRetry,
}: {
  cachedResult?: FoodAnalysisResult | null
  onRetry?: () => void
}) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <FiWifiOff className="text-4xl text-red-400" />
        <h3 className="font-bold text-gray-800 dark:text-gray-100">
          ไม่มีการเชื่อมต่ออินเทอร์เน็ต
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ไม่สามารถเชื่อมต่อ Gemini AI ได้
          <br />
          ตรวจสอบ WiFi หรือ Mobile Data
        </p>
      </div>

      {/* Show cached result if available */}
      {cachedResult && (
        <Alert
          type="info"
          showIcon
          message="แสดงผลการสแกนล่าสุด (cache)"
          description={`${cachedResult.food_type} — ความสด ${cachedResult.freshness_score}/100`}
          className="text-sm"
        />
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="w-full py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
        >
          <FiRefreshCw className="inline mr-2 text-sm" />
          ลองเชื่อมต่อใหม่
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// GENERIC AI ERROR
// ═══════════════════════════════════════════════════════════════

interface GenericConfig {
  icon: React.ReactNode
  title: string
  description: string
  detail?: string
}

const GENERIC_CONFIG: Partial<Record<AIErrorType, GenericConfig>> = {
  low_confidence: {
    icon: <FiEye className="text-4xl text-yellow-400" />,
    title: 'ภาพไม่ชัดเจนพอ',
    description: 'AI มีความมั่นใจต่ำกว่า 40% — ผลอาจไม่แม่นยำ',
    detail: 'ถือกล้องให้นิ่ง, เพิ่มแสง หรืออัปโหลดรูปที่ชัดกว่า',
  },
  timeout: {
    icon: <FiClock className="text-4xl text-gray-400" />,
    title: 'ใช้เวลานานเกินไป',
    description: 'Gemini AI ไม่ตอบสนองใน 10 วินาที กำลัง retry อัตโนมัติ...',
    detail: 'ถ้า retry ล้มเหลว 3 ครั้ง กรุณาลองใหม่ด้วยตัวเอง',
  },
  invalid_json: {
    icon: <FiAlertCircle className="text-4xl text-red-400" />,
    title: 'ผลลัพธ์ AI ผิดรูปแบบ',
    description: 'AI ตอบกลับในรูปแบบที่ parse ไม่ได้ กำลัง retry อัตโนมัติ...',
    detail: 'ถ้าเกิดซ้ำหลายครั้ง อาจเป็นปัญหาชั่วคราวของ Gemini API',
  },
  unknown: {
    icon: <FiAlertCircle className="text-4xl text-gray-400" />,
    title: 'เกิดข้อผิดพลาด',
    description: 'ไม่สามารถวิเคราะห์ภาพได้ในขณะนี้',
    detail: 'ลองใหม่ หรือลองอัปโหลดรูปแทน',
  },
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AIError({
  errorType,
  resetInMs = 0,
  onRetry,
  onDismiss,
  cachedResult,
  isOnline = true,
  className = '',
}: AIErrorProps) {
  // ── Specialized renderers ─────────────────────────────────────
  if (errorType === 'no_food') {
    return <NoFoodHint onDismiss={onDismiss} />
  }
  if (errorType === 'rate_limit' && resetInMs > 0) {
    return <RateLimitCountdown resetInMs={resetInMs} onRetry={onRetry} />
  }
  if (errorType === 'network' || !isOnline) {
    return <NetworkError cachedResult={cachedResult} onRetry={onRetry} />
  }

  // ── Generic error ─────────────────────────────────────────────
  const cfg = GENERIC_CONFIG[errorType] ?? GENERIC_CONFIG.unknown!

  return (
    <div
      className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4 ${className}`}
      role="alert"
    >
      {/* Dismiss button */}
      {onDismiss && (
        <div className="flex justify-end -mb-2">
          <button
            onClick={onDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg"
          >
            <FiX />
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 text-center">
        {cfg.icon}
        <h3 className="font-bold text-gray-800 dark:text-gray-100">{cfg.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {cfg.description}
        </p>
        {cfg.detail && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{cfg.detail}</p>
        )}
      </div>

      {/* Low confidence: show warning about partial result */}
      {errorType === 'low_confidence' && (
        <Alert
          type="warning"
          showIcon
          message="ผลเบื้องต้น — ความมั่นใจต่ำ"
          description="ผลที่แสดงอาจไม่ถูกต้อง ไม่ควรนำไปใช้ตัดสินความปลอดภัยของอาหาร"
          className="text-sm"
        />
      )}

      {/* Actions */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
        >
          <FiRefreshCw className="text-sm" />
          ลองใหม่
        </button>
      )}
    </div>
  )
}
