import { useState, useEffect } from 'react'
import { Table, Skeleton, Empty, Tag, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { FiTrendingDown, FiZap, FiAlertCircle } from 'react-icons/fi'
import {
  getSimilarListings,
  type SimilarListing,
} from '../../server/get-similar-listings'
import { getFreshnessLabel, RISK_COLOR, RISK_LABEL_TH } from '../../lib/gemini-food-analyzer'
import type { FoodCategory, RiskLevel } from '../../lib/gemini-food-analyzer'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface MarketComparisonProps {
  foodCategory: FoodCategory
  aiSuggestedMin: number
  aiSuggestedMax: number
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function MarketComparison({
  foodCategory,
  aiSuggestedMin,
  aiSuggestedMax,
}: MarketComparisonProps) {
  const [listings, setListings] = useState<SimilarListing[]>([])
  const [thaiCategory, setThaiCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(false)

    getSimilarListings(foodCategory)
      .then(({ listings: l, thaiCategory: c }) => {
        if (cancelled) return
        setListings(l)
        setThaiCategory(c)
      })
      .catch(() => { if (!cancelled) setFetchError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [foodCategory])

  const hasSuggestedPrice = aiSuggestedMax > 0

  const columns: ColumnsType<SimilarListing> = [
    {
      title: 'สินค้า',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: SimilarListing) => (
        <div className="space-y-1">
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{name}</p>
          {row.ai_verified && (
            <Tag color="green" className="text-[10px]">
              <FiZap className="inline mr-0.5 text-[10px]" />
              AI ✓
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'ราคา',
      dataIndex: 'price',
      key: 'price',
      sorter: (a, b) => a.price - b.price,
      render: (price: number) => {
        const isCheaper = hasSuggestedPrice && price < aiSuggestedMax
        return (
          <Tooltip
            title={isCheaper ? `ถูกกว่า AI แนะนำ ฿${aiSuggestedMax} อยู่ ฿${aiSuggestedMax - price}` : undefined}
          >
            <span
              className={`font-bold text-sm ${isCheaper ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}
            >
              ฿{price}
              {isCheaper && <FiTrendingDown className="inline ml-1 text-green-500" />}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: 'ความสด',
      dataIndex: 'freshness_score',
      key: 'freshness_score',
      sorter: (a, b) => (a.freshness_score ?? 0) - (b.freshness_score ?? 0),
      render: (score?: number, row?: SimilarListing) => {
        if (!score) return <span className="text-gray-400 text-xs">—</span>
        const { label, color } = getFreshnessLabel(score)
        const riskColor = row?.risk_level ? RISK_COLOR[row.risk_level as RiskLevel] : undefined
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${score}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
            </div>
            {row?.risk_level && riskColor && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: riskColor + '20', color: riskColor }}
              >
                {RISK_LABEL_TH[row.risk_level as RiskLevel]}
              </span>
            )}
          </div>
        )
      },
    },
    {
      title: 'ร้านค้า',
      key: 'seller',
      render: (_: unknown, row: SimilarListing) => (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {row.seller && <p>{row.seller}</p>}
          {row.location && <p className="text-gray-400">📍 {row.location}</p>}
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          เปรียบเทียบกับสินค้าในตลาด
        </h2>
        {thaiCategory && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
            หมวด: {thaiCategory}
          </span>
        )}
      </div>

      {/* ── Price reference bar ─────────────────────────────────── */}
      {hasSuggestedPrice && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FiZap className="text-green-500 shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">
              AI แนะนำราคา:
              <span className="font-bold text-green-700 dark:text-green-400 ml-1">
                ฿{aiSuggestedMin}–฿{aiSuggestedMax}
              </span>
            </span>
          </div>
          <span className="text-xs text-gray-400">
            <FiTrendingDown className="inline mr-1 text-green-500" />
            ไฮไลต์สีเขียว = ราคาถูกกว่า AI แนะนำ
          </span>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : fetchError ? (
        <div className="flex items-center gap-2 text-orange-500 text-sm py-4">
          <FiAlertCircle />
          <span>โหลดข้อมูลไม่สำเร็จ — แสดงข้อมูลตัวอย่าง</span>
        </div>
      ) : listings.length === 0 ? (
        <Empty description="ไม่มีสินค้าหมวดนี้ในตลาดขณะนี้" className="py-8" />
      ) : (
        <Table<SimilarListing>
          dataSource={listings}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 500 }}
          rowClassName={(row) =>
            hasSuggestedPrice && row.price < aiSuggestedMax
              ? 'bg-green-50 dark:bg-green-900/10'
              : ''
          }
        />
      )}
    </div>
  )
}
