import { useEffect, useState } from 'react'
import { Input, Select, Slider, Tag, Empty, Spin, Card } from 'antd'
import { FiSearch, FiFilter, FiShoppingCart, FiClock } from 'react-icons/fi'
import { FOOD_CATEGORIES, RISK_COLOR, RISK_LABEL_TH, FRESHNESS_LABEL } from '../constants'
import { useApp } from '../store/useAppStore'

// ── Mock products for dev ─────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: 1, name: 'มะเขือเทศสด', category: 'ผักและผลไม้', price: 25, original_price: 45, freshness_score: 72, risk_level: 'LOW', expires_label: '2 วัน', image: null, seller: 'ร้านผักสด', location: 'กรุงเทพ' },
  { id: 2, name: 'นมสดพาสเจอร์ไรซ์', category: 'ผลิตภัณฑ์นม', price: 35, original_price: 48, freshness_score: 55, risk_level: 'MEDIUM', expires_label: '18 ชั่วโมง', image: null, seller: 'ฟาร์มสด', location: 'เชียงใหม่' },
  { id: 3, name: 'ขนมปังโฮลวีต', category: 'เบเกอรี่', price: 20, original_price: 35, freshness_score: 40, risk_level: 'MEDIUM', expires_label: '1 วัน', image: null, seller: 'เบเกอรี่ใจดี', location: 'กรุงเทพ' },
  { id: 4, name: 'กุ้งสดแช่เย็น', category: 'อาหารทะเล', price: 120, original_price: 200, freshness_score: 85, risk_level: 'LOW', expires_label: '3 วัน', image: null, seller: 'อาหารทะเลสด', location: 'ชลบุรี' },
  { id: 5, name: 'ส้มนาเวล', category: 'ผักและผลไม้', price: 30, original_price: 50, freshness_score: 68, risk_level: 'LOW', expires_label: '4 วัน', image: null, seller: 'สวนผลไม้', location: 'เชียงใหม่' },
  { id: 6, name: 'ไก่สดทั้งตัว', category: 'เนื้อสัตว์และสัตว์ปีก', price: 85, original_price: 130, freshness_score: 60, risk_level: 'MEDIUM', expires_label: '1 วัน', image: null, seller: 'ฟาร์มไก่', location: 'กรุงเทพ' },
]

function ProductCard({ product }) {
  const { actions } = useApp()
  const { label, color } = FRESHNESS_LABEL(product.freshness_score)
  const riskColor = RISK_COLOR[product.risk_level]
  const discount = Math.round((1 - product.price / product.original_price) * 100)

  const emoji = {
    'ผักและผลไม้': '🥦',
    'เนื้อสัตว์และสัตว์ปีก': '🍖',
    'อาหารทะเล': '🦐',
    'ผลิตภัณฑ์นม': '🥛',
    'เบเกอรี่': '🍞',
    'อาหารปรุงสำเร็จ': '🍱',
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-1">
      {/* Image placeholder */}
      <div className="h-40 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center relative">
        <span className="text-5xl">{emoji[product.category] || '🍽️'}</span>
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
        )}
        <div
          className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: riskColor + '20', color: riskColor, border: `1px solid ${riskColor}40` }}
        >
          {RISK_LABEL_TH[product.risk_level]}
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{product.category}</p>
        <h3 className="font-bold text-gray-900 mb-1 truncate">{product.name}</h3>

        {/* Freshness bar */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${product.freshness_score}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-medium" style={{ color }}>
            {product.freshness_score}
          </span>
        </div>

        {/* Expires */}
        <div className="flex items-center gap-1 text-xs text-orange-500 mb-3">
          <FiClock className="text-xs" />
          <span>เสียใน {product.expires_label}</span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-bold text-green-600">฿{product.price}</p>
            <p className="text-xs text-gray-400 line-through">฿{product.original_price}</p>
          </div>
          <button
            onClick={() => actions.addToCart(product)}
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
          >
            <FiShoppingCart className="text-sm" />
            ใส่ตะกร้า
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MarketplacePage() {
  const [products] = useState(MOCK_PRODUCTS)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [riskLevel, setRiskLevel] = useState(null)
  const [loading] = useState(false)

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (category && p.category !== category) return false
    if (riskLevel && p.risk_level !== riskLevel) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ตลาดอาหาร</h1>
          <p className="text-gray-500 text-sm">{filtered.length} รายการ</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-green-100 mb-6">
        <div className="flex flex-wrap gap-3">
          <Input
            prefix={<FiSearch className="text-gray-400" />}
            placeholder="ค้นหาอาหาร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select
            placeholder="หมวดหมู่"
            value={category}
            onChange={setCategory}
            allowClear
            className="w-44"
            options={FOOD_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <Select
            placeholder="ระดับความเสี่ยง"
            value={riskLevel}
            onChange={setRiskLevel}
            allowClear
            className="w-44"
            options={[
              { value: 'LOW', label: '🟢 ความเสี่ยงต่ำ' },
              { value: 'MEDIUM', label: '🟡 ความเสี่ยงปานกลาง' },
              { value: 'HIGH', label: '🔴 ความเสี่ยงสูง' },
            ]}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty description="ไม่พบสินค้า" className="py-20" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
