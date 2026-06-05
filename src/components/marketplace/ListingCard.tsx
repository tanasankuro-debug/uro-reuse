/**
 * ListingCard.tsx
 * Product card สำหรับ Marketplace
 * รองรับ AI badge เมื่อ listing ผ่านการสแกน AI
 */

import { FiClock, FiShoppingCart, FiMapPin } from 'react-icons/fi'
import AIBadge, { type AIBadgeData } from '../scanner/AIBadge'
import { getFreshnessLabel } from '../../lib/gemini-food-analyzer'
import { RISK_COLOR, RISK_LABEL_TH } from '../../lib/gemini-food-analyzer'
import type { ScanRiskLevel } from '../../types/database.types'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ListingProduct {
  id:             string | number
  name:           string
  category:       string
  price:          number
  original_price?: number
  freshness_score?: number
  risk_level?:    string
  expires_label?: string
  image?:         string | null
  seller?:        string
  location?:      string
  /** มี ai_scan แสดงว่าผ่านการตรวจ AI */
  ai_scan?:       AIBadgeData | null
}

interface ListingCardProps {
  product:      ListingProduct
  onAddToCart?: (product: ListingProduct) => void
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY EMOJI
// ═══════════════════════════════════════════════════════════════

const CATEGORY_EMOJI: Record<string, string> = {
  'ผักและผลไม้':          '🥦',
  'เนื้อสัตว์และสัตว์ปีก': '🍖',
  'อาหารทะเล':             '🦐',
  'ผลิตภัณฑ์นม':           '🥛',
  'เบเกอรี่':              '🍞',
  'อาหารปรุงสำเร็จ':       '🍱',
  'เครื่องดื่ม':           '🧃',
  'ขนมและของหวาน':         '🍡',
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ListingCard({ product, onAddToCart }: ListingCardProps) {
  const {
    name, category, price, original_price,
    freshness_score, risk_level, expires_label,
    seller, location, ai_scan,
  } = product

  const discount      = original_price ? Math.round((1 - price / original_price) * 100) : 0
  const riskLevel     = risk_level as ScanRiskLevel | undefined
  const riskColor     = riskLevel ? RISK_COLOR[riskLevel] : undefined
  const riskLabel     = riskLevel ? RISK_LABEL_TH[riskLevel] : undefined

  const { label: freshnessLabel, color: freshnessColor } =
    freshness_score != null ? getFreshnessLabel(freshness_score) : { label: '', color: '#9ca3af' }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all">

      {/* ── Image / Emoji area ─────────────────────────────────── */}
      <div className="h-40 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center relative">
        <span className="text-5xl">{CATEGORY_EMOJI[category] ?? '🍽️'}</span>

        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-sm">
            -{discount}%
          </div>
        )}

        {/* Risk badge */}
        {riskColor && riskLabel && (
          <div
            className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: riskColor + '22', color: riskColor, border: `1px solid ${riskColor}50` }}
          >
            {riskLabel}
          </div>
        )}

        {/* AI Badge — overlaid bottom-left */}
        {ai_scan && (
          <div className="absolute bottom-2 left-2">
            <AIBadge {...ai_scan} size="sm" />
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="p-4 space-y-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">{category}</p>

        <h3 className="font-bold text-gray-900 dark:text-gray-100 leading-tight truncate">{name}</h3>

        {/* Freshness bar */}
        {freshness_score != null && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${freshness_score}%`, backgroundColor: freshnessColor }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums" style={{ color: freshnessColor }}>
              {freshness_score}
            </span>
          </div>
        )}

        {/* Expiry */}
        {expires_label && (
          <div className="flex items-center gap-1 text-xs text-orange-500">
            <FiClock className="shrink-0" />
            <span>เสียใน {expires_label}</span>
          </div>
        )}

        {/* Seller / Location */}
        {(seller || location) && (
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <FiMapPin className="shrink-0 text-[10px]" />
            <span className="truncate">{[seller, location].filter(Boolean).join(' · ')}</span>
          </div>
        )}

        {/* Price + Cart */}
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-xl font-black text-green-600 dark:text-green-400 leading-none">
              ฿{price}
            </p>
            {original_price && (
              <p className="text-xs text-gray-400 line-through">฿{original_price}</p>
            )}
          </div>

          <button
            onClick={() => onAddToCart?.(product)}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 active:scale-95 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
          >
            <FiShoppingCart className="text-sm" />
            ใส่ตะกร้า
          </button>
        </div>
      </div>
    </div>
  )
}
