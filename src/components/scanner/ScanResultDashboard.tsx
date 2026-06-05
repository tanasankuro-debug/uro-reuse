/**
 * ScanResultDashboard.tsx
 * ─────────────────────────────────────────────────────────────────
 * Full-featured result dashboard สำหรับแสดงผลการวิเคราะห์อาหาร
 *
 * Sections:
 *  1.  Freshness Score (animated counter + gradient bar)
 *  2.  Expiry Countdown (estimated date/time)
 *  3.  Visual Signs (mold / bruising / discoloration badges)
 *  4.  Nutrition Table (macro bar chart)
 *  5.  Storage Guide (expandable tips)
 *  6.  Price Suggestion (min-max + reasoning)
 *  7.  Cooking Suggestions (expandable per dish)
 *  8.  AI Confidence Badge
 *  9.  Action Buttons (sell / save / share / rescan)
 *  10. Scan History Strip (last 5)
 *
 *  States: Loading Skeleton | Empty | Error | Result
 *  Responsive: 1-col mobile → 2-col on sm+
 *  Dark mode: Tailwind dark: variants throughout
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { Skeleton, message as antMessage } from 'antd'
import {
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiAlertOctagon,
  FiThermometer,
  FiBox,
  FiDollarSign,
  FiBookOpen,
  FiSave,
  FiShare2,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiCamera,
} from 'react-icons/fi'
import { MdOutlineFoodBank } from 'react-icons/md'
import dayjs from 'dayjs'
import type { FoodAnalysisResult } from '../../lib/gemini-food-analyzer'
import {
  RISK_COLOR,
  RISK_LABEL_TH,
  CATEGORY_EMOJI,
  URGENCY_LABEL_TH,
  URGENCY_COLOR,
  DIFFICULTY_LABEL_TH,
  getFreshnessLabel,
  formatExpiryLabel,
} from '../../lib/gemini-food-analyzer'
import type { ScanHistoryItem } from '../../hooks/useFoodScanner'
import FreshnessGauge from './FreshnessGauge'

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface ScanResultDashboardProps {
  result: FoodAnalysisResult | null
  isLoading: boolean
  error: string | null
  scanHistory?: ScanHistoryItem[]
  onPostSell?: (result: FoodAnalysisResult) => void
  onSave?: (result: FoodAnalysisResult) => void
  onShare?: (result: FoodAnalysisResult) => void
  onRescan?: () => void
  onSelectHistory?: (item: ScanHistoryItem) => void
  onUsePriceSuggestion?: (min: number, max: number) => void
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

function useCountUp(target: number, duration = 900) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let raf: number
    let startTime: number | null = null

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    setCurrent(0)
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return current
}

// ═══════════════════════════════════════════════════════════════
// PRIMITIVE WRAPPERS
// ═══════════════════════════════════════════════════════════════

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

function SectionTitle({
  icon,
  title,
  iconClass = 'text-green-500',
}: {
  icon: ReactNode
  title: string
  iconClass?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`text-base ${iconClass}`}>{icon}</span>
      <h3 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{title}</h3>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Score card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="w-28 h-28 bg-gray-100 dark:bg-gray-700 rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5 pt-2">
            <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-lg w-3/4" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded-lg w-1/2" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-full mt-4" />
          </div>
        </div>
      </div>

      {/* Two-col */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((n) => (
          <div
            key={n}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-2"
          >
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-full" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-4/5" />
          </div>
        ))}
      </div>

      {/* AI indicator */}
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 dark:text-gray-500 text-sm">Gemini AI กำลังวิเคราะห์...</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function EmptyState({ onRescan }: { onRescan?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
        <FiCamera className="text-4xl text-green-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">
        ยังไม่มีผลการสแกน
      </h3>
      <p className="text-gray-400 dark:text-gray-500 text-sm mb-6 max-w-xs leading-relaxed">
        เปิดกล้องแล้วกด "สแกนอัตโนมัติ" เพื่อวิเคราะห์
        ความสดของอาหารแบบ Real-Time
      </p>
      {onRescan && (
        <button
          onClick={onRescan}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm shadow-md shadow-green-200 dark:shadow-none transition-all active:scale-95"
        >
          <FiCamera /> เริ่มสแกน
        </button>
      )}

      <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-xs">
        {[
          { icon: '🔍', text: 'วิเคราะห์ความสด' },
          { icon: '💰', text: 'ประเมินราคา' },
          { icon: '🍳', text: 'แนะนำเมนู' },
        ].map(({ icon, text }) => (
          <div
            key={text}
            className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700"
          >
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════

function ErrorState({ error, onRescan }: { error: string; onRescan?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
        <FiAlertTriangle className="text-3xl text-red-400" />
      </div>
      <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-2">
        วิเคราะห์ไม่สำเร็จ
      </h3>
      <p className="text-red-500 dark:text-red-400 text-sm mb-5 max-w-xs leading-relaxed">
        {error}
      </p>
      {onRescan && (
        <button
          onClick={onRescan}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors active:scale-95"
        >
          <FiRefreshCw /> ลองใหม่
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — FRESHNESS SCORE
// ═══════════════════════════════════════════════════════════════

function FreshnessScoreSection({ result }: { result: FoodAnalysisResult }) {
  const animatedScore = useCountUp(result.freshness_score)
  const { label: freshnessLabel, color: freshnessColor } = getFreshnessLabel(result.freshness_score)
  const riskColor = RISK_COLOR[result.risk_level]
  const riskLabel = RISK_LABEL_TH[result.risk_level]

  return (
    <Card className="p-5">
      {/* Food name row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-3xl shrink-0">{CATEGORY_EMOJI[result.food_category] || '🍽️'}</span>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight truncate">
              {result.food_type}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">{result.food_type_en}</p>
          </div>
        </div>
        {/* Risk badge */}
        <span
          className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-sm"
          style={{ backgroundColor: riskColor }}
        >
          {riskLabel}
        </span>
      </div>

      {/* Score gauge + number */}
      <div className="flex items-center gap-5">
        <FreshnessGauge score={result.freshness_score} size={112} />

        <div className="flex-1 min-w-0">
          {/* Animated number */}
          <div className="flex items-baseline gap-1 mb-1.5">
            <span
              className="text-6xl font-black tabular-nums leading-none"
              style={{ color: freshnessColor }}
            >
              {animatedScore}
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-2xl font-light">/100</span>
          </div>

          {/* Freshness label pill */}
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-3"
            style={{ backgroundColor: freshnessColor }}
          >
            {freshnessLabel}
          </span>

          {/* Gradient progress bar */}
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${result.freshness_score}%`,
                background: `linear-gradient(
                  to right,
                  #ef4444 0%,
                  #f97316 25%,
                  #eab308 50%,
                  #84cc16 75%,
                  #22c55e 100%
                )`,
                backgroundSize: '400px 100%',
                backgroundPositionX: `${-(100 - result.freshness_score) * 2}px`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 px-0.5">
            <span>0</span>
            <span>เสีย</span>
            <span>ปานกลาง</span>
            <span>สด</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {result.freshness_description && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-gray-700/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-gray-700 leading-relaxed">
          "{result.freshness_description}"
        </p>
      )}

      {/* Risk reasons */}
      {result.risk_reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.risk_reasons.map((r, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full border font-medium"
              style={{
                color: riskColor,
                borderColor: riskColor + '50',
                backgroundColor: riskColor + '12',
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — EXPIRY COUNTDOWN
// ═══════════════════════════════════════════════════════════════

const CONDITION_INFO = {
  room_temp: { label: 'อุณหภูมิห้อง', icon: '🌡️', color: '#f97316' },
  refrigerated: { label: 'เก็บตู้เย็น', icon: '❄️', color: '#3b82f6' },
  frozen: { label: 'ช่องแช่แข็ง', icon: '🧊', color: '#8b5cf6' },
} as const

function ExpiryCard({ result }: { result: FoodAnalysisResult }) {
  const { expiry_hours, expiry_condition } = result
  const expiryDate = dayjs().add(expiry_hours, 'hour')
  const expiryLabel = formatExpiryLabel(expiry_hours)
  const condInfo = CONDITION_INFO[expiry_condition] ?? CONDITION_INFO.refrigerated

  const urgencyColor =
    expiry_hours < 6 ? '#ef4444'
    : expiry_hours < 24 ? '#f97316'
    : expiry_hours < 72 ? '#eab308'
    : '#22c55e'

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiClock />} title="อายุที่เหลือ" iconClass="text-orange-500" />

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: urgencyColor + '18' }}
        >
          ⏰
        </div>
        <div>
          <p className="text-xl font-black leading-tight" style={{ color: urgencyColor }}>
            {expiryLabel}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            ≈ {expiryDate.format('DD/MM/YY HH:mm')} น.
          </p>
        </div>
      </div>

      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
        style={{ backgroundColor: condInfo.color + '15', color: condInfo.color }}
      >
        <span className="text-base">{condInfo.icon}</span>
        <span>{condInfo.label}</span>
        <span className="opacity-60 ml-auto">{result.storage_guide.temperature}</span>
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — VISUAL SIGNS
// ═══════════════════════════════════════════════════════════════

function VisualSignsCard({ result }: { result: FoodAnalysisResult }) {
  const { visual_signs: vs } = result

  const boolSigns = [
    { label: 'เชื้อรา', detected: vs.mold_detected, icon: '🔬', safe: 'ไม่พบเชื้อรา', danger: 'พบเชื้อรา' },
    { label: 'รอยช้ำ', detected: vs.bruising_detected, icon: '🫐', safe: 'ไม่มีรอยช้ำ', danger: 'พบรอยช้ำ' },
    { label: 'สีผิดปกติ', detected: vs.discoloration, icon: '🎨', safe: 'สีปกติ', danger: 'สีผิดปกติ' },
  ]

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiInfo />} title="ลักษณะที่สังเกตได้" iconClass="text-blue-500" />

      <div className="space-y-1.5 mb-3">
        <Row label="สี" value={vs.color} />
        <Row label="เนื้อสัมผัส" value={vs.texture} />
      </div>

      <div className="space-y-1.5">
        {boolSigns.map(({ label: _, detected, icon, safe, danger }) => (
          <div
            key={icon}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              detected
                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            }`}
          >
            <span>{icon}</span>
            {detected ? <><FiAlertTriangle /> {danger}</> : <><FiCheckCircle /> {safe}</>}
          </div>
        ))}
      </div>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-400 dark:text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — NUTRITION TABLE
// ═══════════════════════════════════════════════════════════════

function NutritionCard({ result }: { result: FoodAnalysisResult }) {
  const n = result.nutrition_estimate
  const total = n.protein_g + n.carbohydrates_g + n.fat_g || 1

  const macros = [
    { label: 'โปรตีน', val: n.protein_g, color: '#3b82f6' },
    { label: 'คาร์บ', val: n.carbohydrates_g, color: '#eab308' },
    { label: 'ไขมัน', val: n.fat_g, color: '#ef4444' },
  ]

  const rows = [
    { label: 'แคลอรี่', value: `${n.calories_per_100g} kcal`, color: '#f97316' },
    { label: 'โปรตีน', value: `${n.protein_g}g`, color: '#3b82f6' },
    { label: 'คาร์โบไฮเดรต', value: `${n.carbohydrates_g}g`, color: '#eab308' },
    { label: 'ไขมัน', value: `${n.fat_g}g`, color: '#ef4444' },
    { label: 'ใยอาหาร', value: `${n.fiber_g}g`, color: '#22c55e' },
  ]

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiThermometer />} title="โภชนาการ / 100g" iconClass="text-orange-500" />

      {/* Calorie big number */}
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-3xl font-black text-orange-500">{n.calories_per_100g}</span>
        <span className="text-gray-400 dark:text-gray-500 text-sm">kcal</span>
        <span className="text-gray-300 dark:text-gray-600 text-xs ml-auto">ต่อ 100g</span>
      </div>

      {/* Macro stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px mb-2">
        {macros.map(({ label, val, color }) => {
          const pct = (val / total) * 100
          return (
            <div
              key={label}
              className="h-full transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%`, backgroundColor: color }}
              title={`${label}: ${val}g (${pct.toFixed(0)}%)`}
            />
          )
        })}
      </div>

      {/* Macro legend row */}
      <div className="flex gap-3 mb-3">
        {macros.map(({ label, val, color }) => (
          <div key={label} className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-500 dark:text-gray-400">{label} {val}g</span>
          </div>
        ))}
      </div>

      {/* Full table */}
      <div className="space-y-1.5 border-t border-gray-100 dark:border-gray-700 pt-2.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-xs font-bold" style={{ color }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-2.5 italic">
        * ค่าประมาณการจาก AI อาจคลาดเคลื่อนได้
      </p>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — STORAGE GUIDE
// ═══════════════════════════════════════════════════════════════

function StorageCard({ result }: { result: FoodAnalysisResult }) {
  const [expanded, setExpanded] = useState(false)
  const s = result.storage_guide

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiBox />} title="วิธีเก็บรักษา" iconClass="text-green-500" />

      <div className="space-y-2 text-sm">
        {[
          { emoji: '📦', text: s.method },
          { emoji: '🌡️', text: s.temperature },
          { emoji: '🫙', text: s.container },
        ].map(({ emoji, text }) => (
          <div key={emoji} className="flex items-start gap-2 text-gray-700 dark:text-gray-200">
            <span className="text-base shrink-0 mt-0.5">{emoji}</span>
            <span className="text-sm leading-tight">{text}</span>
          </div>
        ))}
      </div>

      {s.tips.length > 0 && (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold mt-3 hover:text-green-700 transition-colors"
          >
            {expanded ? <FiChevronUp className="text-sm" /> : <FiChevronDown className="text-sm" />}
            {expanded ? 'ซ่อนเคล็ดลับ' : `เคล็ดลับเพิ่มเติม (${s.tips.length})`}
          </button>

          {expanded && (
            <ul className="mt-2 space-y-1.5 fade-in-up">
              {s.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300"
                >
                  <FiCheckCircle className="text-green-400 shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — PRICE SUGGESTION
// ═══════════════════════════════════════════════════════════════

function PriceCard({
  result,
  onUsePriceSuggestion,
}: {
  result: FoodAnalysisResult
  onUsePriceSuggestion?: (min: number, max: number) => void
}) {
  const p = result.suggested_price_thb
  const mid = Math.round((p.min + p.max) / 2)

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiDollarSign />} title="ราคาแนะนำ" iconClass="text-blue-500" />

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-blue-600 dark:text-blue-400">฿{mid}</span>
            <span className="text-gray-400 text-xs">/100g</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            ช่วง ฿{p.min} – ฿{p.max}
          </p>
        </div>

        {onUsePriceSuggestion && (
          <button
            onClick={() => onUsePriceSuggestion(p.min, p.max)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-colors active:scale-95"
          >
            ใช้ราคานี้ →
          </button>
        )}
      </div>

      {p.reasoning && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            💡 {p.reasoning}
          </p>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — COOKING SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

function CookingCard({ result }: { result: FoodAnalysisResult }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  if (!result.cooking_suggestions.length) return null

  return (
    <Card className="p-4">
      <SectionTitle icon={<FiBookOpen />} title="สูตรอาหารแนะนำ" iconClass="text-purple-500" />

      <div className="space-y-2">
        {result.cooking_suggestions.map((s, i) => {
          const isOpen = openIdx === i
          return (
            <div
              key={i}
              className="rounded-xl border border-purple-100 dark:border-purple-900 overflow-hidden"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left"
              >
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-tight">
                  {s.dish_name}
                </span>
                <div className="flex items-center gap-1.5 ml-2 shrink-0">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: URGENCY_COLOR[s.urgency] }}
                  >
                    {URGENCY_LABEL_TH[s.urgency]}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      s.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : s.difficulty === 'hard'
                        ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                        : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                    }`}
                  >
                    {DIFFICULTY_LABEL_TH[s.difficulty]}
                  </span>
                  {isOpen ? (
                    <FiChevronUp className="text-gray-400 text-xs" />
                  ) : (
                    <FiChevronDown className="text-gray-400 text-xs" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-3 py-3 bg-white dark:bg-gray-800 fade-in-up border-t border-purple-100 dark:border-purple-900">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {s.description || 'ไม่มีรายละเอียดเพิ่มเติม'}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — AI CONFIDENCE BADGE
// ═══════════════════════════════════════════════════════════════

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const low = pct < 60

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        low
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      }`}
    >
      <span className="text-2xl">{low ? '⚠️' : '🤖'}</span>

      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-bold ${
            low
              ? 'text-yellow-700 dark:text-yellow-400'
              : 'text-green-700 dark:text-green-400'
          }`}
        >
          ความมั่นใจ AI: {pct}%
        </p>
        {low && (
          <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-0.5">
            ผลลัพธ์อาจไม่แม่นยำ — ควรตรวจสอบเพิ่มเติมก่อนตัดสินใจ
          </p>
        )}
      </div>

      {/* Mini bar */}
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shrink-0">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: low ? '#eab308' : '#22c55e',
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════

function ActionButtons({
  result,
  onPostSell,
  onSave,
  onShare,
  onRescan,
}: {
  result: FoodAnalysisResult
  onPostSell?: (r: FoodAnalysisResult) => void
  onSave?: (r: FoodAnalysisResult) => void
  onShare?: (r: FoodAnalysisResult) => void
  onRescan?: () => void
}) {
  const handleShare = useCallback(async () => {
    const text =
      `🌿 Fresh Futures — ผลสแกนอาหาร\n` +
      `${result.food_type} (${result.food_type_en})\n` +
      `ความสด: ${result.freshness_score}/100 | ${RISK_LABEL_TH[result.risk_level]}\n` +
      `ราคาแนะนำ: ฿${result.suggested_price_thb.min}–฿${result.suggested_price_thb.max}/100g`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Fresh Futures', text })
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text)
      void antMessage.success('คัดลอกผลลัพธ์แล้ว!')
    }
    onShare?.(result)
  }, [result, onShare])

  const buttons = [
    {
      key: 'sell',
      label: 'โพสต์ขาย',
      icon: <MdOutlineFoodBank className="text-xl" />,
      onClick: () => onPostSell?.(result),
      cls: 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-none',
      show: !!onPostSell,
    },
    {
      key: 'save',
      label: 'บันทึก',
      icon: <FiSave className="text-xl" />,
      onClick: () => onSave?.(result),
      cls: 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-100',
      show: !!onSave,
    },
    {
      key: 'share',
      label: 'แชร์',
      icon: <FiShare2 className="text-xl" />,
      onClick: handleShare,
      cls: 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100',
      show: true,
    },
    {
      key: 'rescan',
      label: 'สแกนใหม่',
      icon: <FiRefreshCw className="text-xl" />,
      onClick: onRescan,
      cls: 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600',
      show: !!onRescan,
    },
  ].filter((b) => b.show)

  return (
    <div className={`grid gap-2 ${buttons.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {buttons.map(({ key, label, icon, onClick, cls }) => (
        <button
          key={key}
          onClick={onClick}
          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${cls}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — SCAN HISTORY STRIP
// ═══════════════════════════════════════════════════════════════

function HistoryStrip({
  history,
  onSelect,
}: {
  history: ScanHistoryItem[]
  onSelect?: (item: ScanHistoryItem) => void
}) {
  if (!history.length) return null

  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
        ประวัติการสแกน ({history.length})
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
        {history.slice(0, 5).map((item) => {
          const { color } = getFreshnessLabel(item.freshness_score)
          return (
            <button
              key={item.id}
              onClick={() => onSelect?.(item)}
              className="shrink-0 snap-start flex flex-col items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 rounded-xl p-2.5 min-w-[68px] transition-all active:scale-95"
            >
              <span className="text-xl">{CATEGORY_EMOJI[item.food_category] || '🍽️'}</span>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 font-medium text-center leading-tight max-w-[56px] truncate">
                {item.food_type}
              </p>
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {item.freshness_score}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════

export default function ScanResultDashboard({
  result,
  isLoading,
  error,
  scanHistory = [],
  onPostSell,
  onSave,
  onShare,
  onRescan,
  onSelectHistory,
  onUsePriceSuggestion,
}: ScanResultDashboardProps) {
  if (isLoading) return <LoadingSkeleton />
  if (error && !result) return <ErrorState error={error} onRescan={onRescan} />
  if (!result) return <EmptyState onRescan={onRescan} />

  return (
    <div className="space-y-3 fade-in-up">
      {/* 1. Score — full width */}
      <FreshnessScoreSection result={result} />

      {/* 2 + 3. Expiry + Visual Signs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ExpiryCard result={result} />
        <VisualSignsCard result={result} />
      </div>

      {/* 8. AI Confidence */}
      <ConfidenceBadge confidence={result.ai_confidence} />

      {/* 4. Nutrition */}
      <NutritionCard result={result} />

      {/* 5 + 6. Storage + Price */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StorageCard result={result} />
        <PriceCard result={result} onUsePriceSuggestion={onUsePriceSuggestion} />
      </div>

      {/* 7. Cooking */}
      <CookingCard result={result} />

      {/* Error inline (soft error while result still shown) */}
      {error && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-2.5">
          <FiAlertOctagon className="text-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-300">{error}</p>
        </div>
      )}

      {/* 9. Actions */}
      <ActionButtons
        result={result}
        onPostSell={onPostSell}
        onSave={onSave}
        onShare={onShare}
        onRescan={onRescan}
      />

      {/* 10. History */}
      <HistoryStrip history={scanHistory} onSelect={onSelectHistory} />
    </div>
  )
}
