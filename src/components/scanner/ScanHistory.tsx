import { useState, useMemo } from 'react'
import { Segmented, Select, Empty } from 'antd'
import dayjs from 'dayjs'
import type { ScanHistoryItem } from '../../hooks/useFoodScanner'
import {
  getFreshnessLabel,
  RISK_COLOR,
  RISK_LABEL_TH,
} from '../../lib/gemini-food-analyzer'
import type { RiskLevel } from '../../lib/gemini-food-analyzer'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type PeriodFilter = 'today' | 'week' | 'all'
type RiskFilter  = 'all' | RiskLevel

interface ScanHistoryProps {
  history: ScanHistoryItem[]
  isLoggedIn: boolean
}

// ═══════════════════════════════════════════════════════════════
// HISTORY CARD
// ═══════════════════════════════════════════════════════════════

function HistoryCard({ item }: { item: ScanHistoryItem }) {
  const { label, color } = getFreshnessLabel(item.freshness_score)
  const riskColor = RISK_COLOR[item.risk_level as RiskLevel] ?? '#9ca3af'
  const riskLabel = RISK_LABEL_TH[item.risk_level as RiskLevel] ?? item.risk_level

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 space-y-2 hover:shadow-sm transition-shadow">
      {/* Visual area */}
      <div
        className="h-14 rounded-lg flex items-center justify-center"
        style={{ background: `${color}18` }}
      >
        <span className="text-3xl select-none">🍽️</span>
      </div>

      {/* Food name */}
      <p className="font-semibold text-gray-800 dark:text-gray-100 text-xs leading-tight truncate">
        {item.food_type}
      </p>

      {/* Freshness score + label */}
      <div className="flex items-center gap-1">
        <span className="font-black text-sm tabular-nums" style={{ color }}>
          {item.freshness_score}
        </span>
        <span className="text-[10px]" style={{ color }}>• {label}</span>
      </div>

      {/* Freshness bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${item.freshness_score}%`, backgroundColor: color }}
        />
      </div>

      {/* Risk badge */}
      <div
        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-center"
        style={{ backgroundColor: riskColor + '20', color: riskColor }}
      >
        {riskLabel}
      </div>

      {/* Date */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
        {dayjs(item.scannedAt).format('DD/MM/YY HH:mm')}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ScanHistory({ history, isLoggedIn }: ScanHistoryProps) {
  const [period,     setPeriod]     = useState<PeriodFilter>('all')
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all')

  const filtered = useMemo(() => {
    const now = dayjs()

    return history
      .filter((item) => {
        if (period === 'today') return dayjs(item.scannedAt).isAfter(now.startOf('day'))
        if (period === 'week')  return dayjs(item.scannedAt).isAfter(now.subtract(7, 'day'))
        return true
      })
      .filter((item) => riskFilter === 'all' || item.risk_level === riskFilter)
      .slice(0, 30)
  }, [history, period, riskFilter])

  if (!isLoggedIn) return null

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ประวัติการสแกน</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {history.length} รายการในเซสชันนี้
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="small"
            value={period}
            onChange={(v) => setPeriod(v as PeriodFilter)}
            options={[
              { value: 'today', label: 'วันนี้' },
              { value: 'week',  label: 'สัปดาห์นี้' },
              { value: 'all',   label: 'ทั้งหมด' },
            ]}
          />
          <Select
            size="small"
            value={riskFilter}
            onChange={setRiskFilter}
            style={{ width: 130 }}
            options={[
              { value: 'all',       label: 'ทุกระดับ' },
              { value: 'LOW',       label: '🟢 ความเสี่ยงต่ำ' },
              { value: 'MEDIUM',    label: '🟡 ปานกลาง' },
              { value: 'HIGH',      label: '🔴 ความเสี่ยงสูง' },
              { value: 'DANGEROUS', label: '⛔ อันตราย' },
            ]}
          />
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Empty
          description={
            <span className="text-gray-400 text-sm">
              {history.length === 0
                ? 'ยังไม่มีประวัติการสแกน — เริ่มสแกนด้านบนได้เลย'
                : 'ไม่มีผลตรงกับตัวกรองที่เลือก'}
            </span>
          }
          className="py-8"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((item) => (
            <HistoryCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
