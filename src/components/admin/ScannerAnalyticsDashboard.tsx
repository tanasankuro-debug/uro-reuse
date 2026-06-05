import { useState, useEffect, useCallback } from 'react'
import { Button, Statistic, Table, Progress, Empty, Tag } from 'antd'
import { FiRefreshCw, FiDownload, FiTrash2, FiZap, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi'
import { getStats, clearStats, exportStats, type ScannerStats, type HourlyCount } from '../../lib/scanner-analytics'

// ═══════════════════════════════════════════════════════════════
// HOURLY CHART (pure CSS — no chart library needed)
// ═══════════════════════════════════════════════════════════════

function HourlyBar({ data }: { data: HourlyCount[] }) {
  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map(({ hour, count }, i) => (
        <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
          <div
            className="w-full bg-green-400 dark:bg-green-600 rounded-t transition-all duration-300"
            style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? '2px' : 0 }}
            title={`${hour}:00 — ${count} ครั้ง`}
          />
          {i % 4 === 0 && (
            <span className="text-[9px] text-gray-400 tabular-nums">{String(hour).padStart(2, '0')}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

export default function ScannerAnalyticsDashboard() {
  const [stats, setStats]     = useState<ScannerStats | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    setLoading(true)
    // getStats() is synchronous (reads localStorage)
    setStats(getStats())
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleClear = () => {
    clearStats()
    refresh()
  }

  const handleExport = () => {
    const json = exportStats()
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `scanner-analytics-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!stats) return null

  // ── Error breakdown table columns ──────────────────────────
  const errorColumns = [
    { title: 'ประเภท Error', dataIndex: 'type', key: 'type', render: (t: string) => <Tag color="red">{t}</Tag> },
    { title: 'จำนวน', dataIndex: 'count', key: 'count', sorter: (a: { count: number }, b: { count: number }) => b.count - a.count },
    {
      title: 'สัดส่วน',
      dataIndex: 'count',
      key: 'pct',
      render: (count: number) => {
        const pct = stats.totalCalls > 0 ? (count / stats.totalCalls) * 100 : 0
        return <Progress percent={Math.round(pct)} size="small" status="exception" style={{ width: 120 }} />
      },
    },
  ]

  const errorData = Object.entries(stats.errorsByType).map(([type, count]) => ({ type, count, key: type }))

  // ── Food type table columns ─────────────────────────────────
  const foodColumns = [
    { title: 'อาหาร', dataIndex: 'type', key: 'type' },
    { title: 'ครั้ง', dataIndex: 'count', key: 'count', sorter: (a: { count: number }, b: { count: number }) => b.count - a.count },
    {
      title: 'สัดส่วน',
      dataIndex: 'count',
      key: 'pct',
      render: (count: number) => {
        const total = stats.totalSuccesses
        const pct = total > 0 ? (count / total) * 100 : 0
        return <Progress percent={Math.round(pct)} size="small" strokeColor="#22c55e" style={{ width: 120 }} />
      },
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            📊 Scanner Analytics
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            ข้อมูลจาก localStorage — รีเฟรชเพื่อดูข้อมูลล่าสุด
          </p>
        </div>
        <div className="flex gap-2">
          <Button icon={<FiRefreshCw />} onClick={refresh} loading={loading}>รีเฟรช</Button>
          <Button icon={<FiDownload />} onClick={handleExport}>Export JSON</Button>
          <Button icon={<FiTrash2 />} danger onClick={handleClear}>ล้างข้อมูล</Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            icon: <FiZap className="text-green-500" />,
            title: 'สแกนทั้งหมด',
            value: stats.totalCalls,
            suffix: 'ครั้ง',
          },
          {
            icon: <FiCheckCircle className="text-green-500" />,
            title: 'สำเร็จ',
            value: `${Math.round(stats.successRate * 100)}%`,
            suffix: `(${stats.totalSuccesses})`,
          },
          {
            icon: <FiZap className="text-blue-500" />,
            title: 'ความมั่นใจ AI',
            value: `${Math.round(stats.avgConfidence * 100)}%`,
            suffix: 'เฉลี่ย',
          },
          {
            icon: <FiClock className="text-orange-500" />,
            title: 'เวลา/ครั้ง',
            value: stats.avgDurationMs > 0 ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : '—',
            suffix: 'เฉลี่ย',
          },
          {
            icon: <FiAlertCircle className="text-red-500" />,
            title: 'Error',
            value: stats.totalCalls > 0
              ? `${Math.round((1 - stats.successRate) * 100)}%`
              : '—',
            suffix: 'rate',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-1"
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              {card.icon} {card.title}
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{card.value}</p>
            <p className="text-xs text-gray-400">{card.suffix}</p>
          </div>
        ))}
      </div>

      {/* ── Today / This Week ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm text-center">
          <Statistic title="วันนี้" value={stats.callsToday} suffix="ครั้ง" valueStyle={{ color: '#22c55e' }} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm text-center">
          <Statistic title="สัปดาห์นี้" value={stats.callsThisWeek} suffix="ครั้ง" valueStyle={{ color: '#3b82f6' }} />
        </div>
      </div>

      {/* ── Hourly chart ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
          จำนวน API calls ใน 24 ชั่วโมงที่ผ่านมา
          {stats.peakHour !== null && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              (ชั่วโมงที่คึกคักสุด: {String(stats.peakHour).padStart(2, '0')}:00 น.)
            </span>
          )}
        </h2>
        {stats.totalCalls === 0 ? (
          <Empty description="ยังไม่มีข้อมูล" className="py-4" />
        ) : (
          <HourlyBar data={stats.callsPerHour} />
        )}
      </div>

      {/* ── Top food types ──────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
          อาหารที่สแกนบ่อยที่สุด
        </h2>
        {stats.topFoodTypes.length === 0 ? (
          <Empty description="ยังไม่มีข้อมูล" />
        ) : (
          <Table
            dataSource={stats.topFoodTypes.map((r) => ({ ...r, key: r.type }))}
            columns={foodColumns}
            size="small"
            pagination={false}
          />
        )}
      </div>

      {/* ── Error breakdown ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">
          Error breakdown
        </h2>
        {errorData.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm py-4">
            <FiCheckCircle />
            <span>ยังไม่มี error — ระบบทำงานปกติ!</span>
          </div>
        ) : (
          <Table
            dataSource={errorData}
            columns={errorColumns}
            size="small"
            pagination={false}
          />
        )}
      </div>

    </div>
  )
}
