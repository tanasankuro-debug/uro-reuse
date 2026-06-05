import { useState } from 'react'
import { Input, Select, Switch, Empty, Spin } from 'antd'
import { FiSearch, FiZap } from 'react-icons/fi'
import { FOOD_CATEGORIES } from '../constants'
import ListingCard from '../components/marketplace/ListingCard'
import { useApp } from '../store/useAppStore'

// ── Mock products ─────────────────────────────────────────────
// ai_scan = null หมายถึงยังไม่ผ่าน AI
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'มะเขือเทศสด',
    category: 'ผักและผลไม้',
    price: 25,
    original_price: 45,
    freshness_score: 72,
    risk_level: 'LOW',
    expires_label: '2 วัน',
    seller: 'ร้านผักสด',
    location: 'กรุงเทพ',
    ai_scan: {
      freshnessScore: 72,
      riskLevel: 'LOW',
      scannedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      foodType: 'มะเขือเทศ',
    },
  },
  {
    id: 2,
    name: 'นมสดพาสเจอร์ไรซ์',
    category: 'ผลิตภัณฑ์นม',
    price: 35,
    original_price: 48,
    freshness_score: 55,
    risk_level: 'MEDIUM',
    expires_label: '18 ชั่วโมง',
    seller: 'ฟาร์มสด',
    location: 'เชียงใหม่',
    ai_scan: null,
  },
  {
    id: 3,
    name: 'ขนมปังโฮลวีต',
    category: 'เบเกอรี่',
    price: 20,
    original_price: 35,
    freshness_score: 40,
    risk_level: 'MEDIUM',
    expires_label: '1 วัน',
    seller: 'เบเกอรี่ใจดี',
    location: 'กรุงเทพ',
    ai_scan: {
      freshnessScore: 40,
      riskLevel: 'MEDIUM',
      scannedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      foodType: 'ขนมปังโฮลวีต',
    },
  },
  {
    id: 4,
    name: 'กุ้งสดแช่เย็น',
    category: 'อาหารทะเล',
    price: 120,
    original_price: 200,
    freshness_score: 85,
    risk_level: 'LOW',
    expires_label: '3 วัน',
    seller: 'อาหารทะเลสด',
    location: 'ชลบุรี',
    ai_scan: {
      freshnessScore: 85,
      riskLevel: 'LOW',
      scannedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      foodType: 'กุ้งขาว',
    },
  },
  {
    id: 5,
    name: 'ส้มนาเวล',
    category: 'ผักและผลไม้',
    price: 30,
    original_price: 50,
    freshness_score: 68,
    risk_level: 'LOW',
    expires_label: '4 วัน',
    seller: 'สวนผลไม้',
    location: 'เชียงใหม่',
    ai_scan: null,
  },
  {
    id: 6,
    name: 'ไก่สดทั้งตัว',
    category: 'เนื้อสัตว์และสัตว์ปีก',
    price: 85,
    original_price: 130,
    freshness_score: 60,
    risk_level: 'MEDIUM',
    expires_label: '1 วัน',
    seller: 'ฟาร์มไก่',
    location: 'กรุงเทพ',
    ai_scan: {
      freshnessScore: 60,
      riskLevel: 'MEDIUM',
      scannedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      foodType: 'ไก่สด',
    },
  },
]

export default function MarketplacePage() {
  const { actions } = useApp()

  const [products]  = useState(MOCK_PRODUCTS)
  const [search,    setSearch]    = useState('')
  const [category,  setCategory]  = useState(null)
  const [riskLevel, setRiskLevel] = useState(null)
  const [aiOnly,    setAiOnly]    = useState(false)
  const [loading]   = useState(false)

  const filtered = products.filter((p) => {
    if (search    && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (category  && p.category !== category)  return false
    if (riskLevel && p.risk_level !== riskLevel) return false
    if (aiOnly    && !p.ai_scan)               return false
    return true
  })

  const aiCount = products.filter((p) => p.ai_scan).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">ตลาดอาหาร</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {filtered.length} รายการ
            {aiOnly && <span className="ml-1 text-green-600 font-semibold">· AI verified</span>}
          </p>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-green-100 dark:border-green-900 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            prefix={<FiSearch className="text-gray-400" />}
            placeholder="ค้นหาอาหาร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
            allowClear
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
              { value: 'LOW',    label: '🟢 ความเสี่ยงต่ำ' },
              { value: 'MEDIUM', label: '🟡 ความเสี่ยงปานกลาง' },
              { value: 'HIGH',   label: '🔴 ความเสี่ยงสูง' },
            ]}
          />

          {/* AI Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <FiZap className={`text-sm ${aiOnly ? 'text-green-500' : 'text-gray-400'}`} />
            <span className={`text-xs font-semibold ${aiOnly ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              AI ตรวจแล้ว ({aiCount})
            </span>
            <Switch
              size="small"
              checked={aiOnly}
              onChange={setAiOnly}
              style={{ backgroundColor: aiOnly ? '#22c55e' : undefined }}
            />
          </div>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty
          description={
            aiOnly
              ? <span className="text-gray-400">ไม่มีสินค้าที่ผ่านการตรวจ AI ในขณะนี้</span>
              : <span className="text-gray-400">ไม่พบสินค้า</span>
          }
          className="py-20"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((p) => (
            <ListingCard
              key={p.id}
              product={p}
              onAddToCart={(product) => actions.addToCart(product)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
