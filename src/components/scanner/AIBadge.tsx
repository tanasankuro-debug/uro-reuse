/**
 * AIBadge.tsx
 * Badge "✓ ผ่านการตรวจ AI" — คลิกเพื่อดู scan summary
 * ใช้บน listing card และใน SellPage form
 */

import { Popover } from 'antd'
import { FiCheck, FiZap } from 'react-icons/fi'
import dayjs from 'dayjs'
import {
  RISK_COLOR,
  RISK_LABEL_TH,
  getFreshnessLabel,
} from '../../lib/gemini-food-analyzer'
import type { ScanRiskLevel } from '../../types/database.types'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AIBadgeData {
  freshnessScore: number
  riskLevel:      ScanRiskLevel
  scannedAt:      string
  foodType?:      string
}

export interface AIBadgeProps extends AIBadgeData {
  size?:      'sm' | 'md'
  className?: string
}

// ═══════════════════════════════════════════════════════════════
// POPOVER CONTENT
// ═══════════════════════════════════════════════════════════════

function ScanSummaryPopover({ freshnessScore, riskLevel, scannedAt, foodType }: AIBadgeData) {
  const { label: freshnessLabel, color: freshnessColor } = getFreshnessLabel(freshnessScore)
  const riskColor = RISK_COLOR[riskLevel]
  const riskLabel = RISK_LABEL_TH[riskLevel]

  return (
    <div className="w-52 space-y-2.5">
      {/* Title */}
      {foodType && (
        <p className="font-bold text-gray-800 dark:text-gray-100 text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
          {foodType}
        </p>
      )}

      {/* Freshness score */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">คะแนนความสด</span>
        <span className="font-bold text-sm" style={{ color: freshnessColor }}>
          {freshnessScore}/100
        </span>
      </div>

      {/* Freshness bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${freshnessScore}%`,
            background: `linear-gradient(to right, #ef4444, #eab308, #22c55e)`,
            backgroundSize: '400px 100%',
            backgroundPositionX: `${-(100 - freshnessScore) * 2}px`,
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: freshnessColor }}>{freshnessLabel}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: riskColor }}
        >
          {riskLabel}
        </span>
      </div>

      {/* Scan date */}
      <p className="text-[11px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
        🤖 สแกนเมื่อ {dayjs(scannedAt).format('DD/MM/YY เวลา HH:mm น.')}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AIBadge({
  freshnessScore,
  riskLevel,
  scannedAt,
  foodType,
  size = 'sm',
  className = '',
}: AIBadgeProps) {
  return (
    <Popover
      content={
        <ScanSummaryPopover
          freshnessScore={freshnessScore}
          riskLevel={riskLevel}
          scannedAt={scannedAt}
          foodType={foodType}
        />
      }
      title={
        <span className="flex items-center gap-1.5 text-green-600">
          <FiZap className="text-sm" />
          ผลการตรวจสอบ AI
        </span>
      }
      trigger="click"
      placement="bottom"
    >
      <button
        className={`inline-flex items-center gap-1 rounded-full font-bold border cursor-pointer
          bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700
          text-green-700 dark:text-green-400
          hover:bg-green-100 dark:hover:bg-green-900/50
          transition-colors active:scale-95
          ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}
          ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <FiCheck className={size === 'sm' ? 'text-[10px]' : 'text-xs'} />
        ผ่านการตรวจ AI
      </button>
    </Popover>
  )
}
