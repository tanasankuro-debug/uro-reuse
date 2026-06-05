/**
 * SellPage.tsx
 * หน้าลงขายสินค้า — รวม AI Scanner + Auto-fill + AI Badge
 *
 * Flow:
 *  1. กด "สแกนอาหารด้วย AI" → ScannerModal เปิด
 *  2. สแกนสำเร็จ → กด "ใช้ผลนี้" → form ถูกกรอกอัตโนมัติ
 *  3. Seller แก้ไขข้อมูลได้ก่อน submit
 *  4. Submit → scan_result.linked_listing_id ถูกเชื่อมกับ listing
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form, Input, InputNumber, Select, Button, Steps,
  DatePicker, Switch, Tooltip, message as antMessage,
} from 'antd'
import { FiCamera, FiPackage, FiCheck, FiZap, FiInfo } from 'react-icons/fi'
import dayjs, { type Dayjs } from 'dayjs'
import ScannerModal from '../components/scanner/ScannerModal'
import AIBadge, { type AIBadgeData } from '../components/scanner/AIBadge'
import { FOOD_CATEGORIES } from '../constants'
import { linkScanToListing } from '../lib/scanner-queries'
import { CATEGORY_LABEL_TH } from '../lib/gemini-food-analyzer'
import type { FoodAnalysisResult } from '../lib/gemini-food-analyzer'

const { TextArea } = Input

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SellerFormData {
  title:           string
  category:        string
  price:           number
  expiry_date:     Dayjs
  description:     string
  quantity:        number
  unit:            string
  location:        string
  ai_scan_id?:     string       // link กับ scan_results
  ai_verified:     boolean
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Map food_category enum → FOOD_CATEGORIES Thai string */
function mapCategory(geminiCategory: string): string {
  const thLabel = CATEGORY_LABEL_TH[geminiCategory as keyof typeof CATEGORY_LABEL_TH]
  return FOOD_CATEGORIES.includes(thLabel) ? thLabel : 'อื่นๆ'
}

/** สร้าง description จาก AI result */
function buildDescription(result: FoodAnalysisResult): string {
  const parts: string[] = []
  if (result.freshness_description) {
    parts.push(result.freshness_description)
  }
  if (result.storage_guide.method) {
    parts.push(`วิธีเก็บรักษา: ${result.storage_guide.method} (${result.storage_guide.temperature})`)
  }
  if (result.storage_guide.tips.length > 0) {
    parts.push(`เคล็ดลับ: ${result.storage_guide.tips.slice(0, 2).join(' / ')}`)
  }
  return parts.join('\n\n')
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SellPage() {
  const navigate      = useNavigate()
  const [form]        = Form.useForm<SellerFormData>()

  const [step,         setStep]         = useState(0)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [success,      setSuccess]      = useState(false)

  // AI scan state
  const [aiResult,     setAiResult]     = useState<FoodAnalysisResult | null>(null)
  const [aiScanId,     setAiScanId]     = useState<string | null>(null)
  const [aiBadgeData,  setAiBadgeData]  = useState<AIBadgeData | null>(null)
  const [aiVerified,   setAiVerified]   = useState(false)

  // ── รับผลจาก ScannerModal ─────────────────────────────────────
  const handleUseResult = useCallback(
    (result: FoodAnalysisResult, scanId: string | null) => {
      setAiResult(result)
      setAiScanId(scanId)
      setAiVerified(true)

      // badge data
      setAiBadgeData({
        freshnessScore: result.freshness_score,
        riskLevel:      result.risk_level as AIBadgeData['riskLevel'],
        scannedAt:      new Date().toISOString(),
        foodType:       result.food_type,
      })

      // Auto-fill form
      form.setFieldsValue({
        title:       result.food_type,
        category:    mapCategory(result.food_category),
        price:       result.suggested_price_thb.max,
        expiry_date: dayjs().add(result.expiry_hours, 'hour'),
        description: buildDescription(result),
        ai_verified: true,
      })

      setStep(1)
      void antMessage.success(`✓ กรอกข้อมูลจาก AI สำเร็จ — ${result.food_type}`)
    },
    [form]
  )

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (values: SellerFormData) => {
    setSubmitting(true)

    try {
      // TODO: ใส่ Supabase insert จริงตอน Prompt #7
      // const { data: listing } = await supabase.from('listings').insert({
      //   title:           values.title,
      //   category:        values.category,
      //   price:           values.price,
      //   expiry_date:     values.expiry_date.toISOString(),
      //   description:     values.description,
      //   quantity:        values.quantity,
      //   unit:            values.unit,
      //   location:        values.location,
      //   ai_verified:     values.ai_verified,
      //   freshness_score: aiResult?.freshness_score,
      //   risk_level:      aiResult?.risk_level,
      // }).select('id').single()

      // Mock: simulate API delay
      await new Promise((r) => setTimeout(r, 1200))
      const mockListingId = `mock_${Date.now()}`

      // เชื่อม scan_result กับ listing ใหม่
      if (aiScanId && mockListingId) {
        await linkScanToListing(aiScanId, mockListingId)
      }

      setSuccess(true)
      setStep(2)
    } catch (err) {
      void antMessage.error('เกิดข้อผิดพลาด — กรุณาลองใหม่')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }, [aiScanId])

  // ── Reset ─────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setSuccess(false)
    setStep(0)
    setAiResult(null)
    setAiScanId(null)
    setAiBadgeData(null)
    setAiVerified(false)
    form.resetFields()
  }, [form])

  // ═══════════════════════════════════════════════════════════════
  // SUCCESS SCREEN
  // ═══════════════════════════════════════════════════════════════

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
          <FiCheck className="text-green-500 text-4xl" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ลงขายสำเร็จ!</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">สินค้าของคุณถูกโพสต์ในตลาดแล้ว</p>
        {aiVerified && (
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 rounded-xl px-4 py-2 text-sm mb-6">
            <FiZap className="text-green-500" />
            ลงขายพร้อม AI Badge แล้ว — ผู้ซื้อมั่นใจขึ้น
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button size="large" onClick={handleReset}>ลงขายอีกรายการ</Button>
          <Button
            type="primary"
            size="large"
            style={{ backgroundColor: '#22c55e' }}
            onClick={() => navigate('/marketplace')}
          >
            ดูตลาด
          </Button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md shadow-green-200">
            <FiPackage className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">ลงขายสินค้า</h1>
            <p className="text-green-600 dark:text-green-400 text-sm">สแกนอาหารด้วย AI เพื่อกรอกข้อมูลอัตโนมัติ</p>
          </div>
        </div>
      </div>

      {/* ── Steps ──────────────────────────────────────────────── */}
      <div className="mb-8">
        <Steps
          current={step}
          size="small"
          items={[
            { title: 'สแกน AI', icon: <FiCamera className="text-xs" /> },
            { title: 'กรอกข้อมูล', icon: <FiPackage className="text-xs" /> },
            { title: 'เสร็จสิ้น', icon: <FiCheck className="text-xs" /> },
          ]}
        />
      </div>

      {/* ── AI Scanner Button ───────────────────────────────────── */}
      <div className="mb-6">
        {!aiResult ? (
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-center gap-3 py-5 border-2 border-dashed border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-2xl transition-colors group"
          >
            <span className="w-10 h-10 bg-green-500 group-hover:bg-green-600 rounded-xl flex items-center justify-center transition-colors shadow-md shadow-green-200">
              <FiCamera className="text-white text-lg" />
            </span>
            <div className="text-left">
              <p className="font-bold text-green-700 dark:text-green-400">📷 สแกนอาหารด้วย AI</p>
              <p className="text-xs text-green-600 dark:text-green-500">กรอกชื่อ, ราคา, วันหมดอายุอัตโนมัติ</p>
            </div>
          </button>
        ) : (
          /* AI Result Preview */
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-sm">
                  <FiZap className="text-white text-lg" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-green-800 dark:text-green-300">
                      AI วิเคราะห์แล้ว: {aiResult.food_type}
                    </p>
                    {aiBadgeData && <AIBadge {...aiBadgeData} size="sm" />}
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ความสด {aiResult.freshness_score}/100 · ราคา ฿{aiResult.suggested_price_thb.min}–{aiResult.suggested_price_thb.max}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-green-600 dark:text-green-400 underline hover:text-green-700 font-medium"
              >
                สแกนใหม่
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Form ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <FiPackage className="text-green-500" /> รายละเอียดสินค้า
          </h3>
          {/* AI Verified toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">AI Verified</span>
            <Tooltip title="เปิดเพื่อแสดง badge ผ่านการตรวจ AI บน listing">
              <Switch
                size="small"
                checked={aiVerified}
                onChange={setAiVerified}
                disabled={!aiResult}
                style={{ backgroundColor: aiVerified ? '#22c55e' : undefined }}
              />
            </Tooltip>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ quantity: 1, unit: 'กก.', ai_verified: false }}
        >
          {/* ชื่อสินค้า */}
          <Form.Item
            name="title"
            label="ชื่อสินค้า"
            rules={[{ required: true, message: 'กรุณากรอกชื่อสินค้า' }]}
          >
            <Input
              placeholder="เช่น มะเขือเทศสด, นมพร่องมันเนย..."
              prefix={aiResult ? <FiZap className="text-green-400 text-xs" /> : undefined}
            />
          </Form.Item>

          {/* หมวดหมู่ + ราคา */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="category"
              label="หมวดหมู่"
              rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่' }]}
            >
              <Select
                placeholder="เลือกหมวดหมู่"
                options={FOOD_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Form.Item>

            <Form.Item
              name="price"
              label={
                <span className="flex items-center gap-1">
                  ราคา (฿/100g)
                  {aiResult && (
                    <Tooltip title={`AI แนะนำ ฿${aiResult.suggested_price_thb.min}–${aiResult.suggested_price_thb.max}`}>
                      <FiInfo className="text-blue-400 text-xs cursor-help" />
                    </Tooltip>
                  )}
                </span>
              }
              rules={[{ required: true, message: 'กรุณากรอกราคา' }]}
            >
              <InputNumber
                min={1}
                className="w-full"
                placeholder="0"
                prefix="฿"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>
          </div>

          {/* ปริมาณ + หน่วย */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="quantity" label="ปริมาณ" rules={[{ required: true }]}>
              <InputNumber min={1} className="w-full" placeholder="1" />
            </Form.Item>
            <Form.Item name="unit" label="หน่วย" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'กก.', label: 'กิโลกรัม (กก.)' },
                  { value: 'ก.', label: 'กรัม (ก.)' },
                  { value: 'ชิ้น', label: 'ชิ้น' },
                  { value: 'กล่อง', label: 'กล่อง' },
                  { value: 'ถุง', label: 'ถุง' },
                  { value: 'ขวด', label: 'ขวด' },
                  { value: 'ลิตร', label: 'ลิตร' },
                ]}
              />
            </Form.Item>
          </div>

          {/* วันหมดอายุ + พื้นที่ */}
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="expiry_date"
              label={
                <span className="flex items-center gap-1">
                  วันหมดอายุ
                  {aiResult && (
                    <Tooltip title={`AI ประมาณ ${aiResult.expiry_hours} ชั่วโมง`}>
                      <FiInfo className="text-blue-400 text-xs cursor-help" />
                    </Tooltip>
                  )}
                </span>
              }
              rules={[{ required: true, message: 'กรุณาเลือกวันหมดอายุ' }]}
            >
              <DatePicker
                className="w-full"
                format="DD/MM/YYYY HH:mm"
                showTime={{ format: 'HH:mm' }}
                disabledDate={(d) => d && d.isBefore(dayjs(), 'day')}
                placeholder="เลือกวันหมดอายุ"
              />
            </Form.Item>

            <Form.Item name="location" label="พื้นที่/จังหวัด">
              <Input placeholder="เช่น กรุงเทพ, เชียงใหม่..." />
            </Form.Item>
          </div>

          {/* รายละเอียด */}
          <Form.Item name="description" label="รายละเอียดเพิ่มเติม">
            <TextArea
              rows={4}
              placeholder="บอกผู้ซื้อเพิ่มเติม เช่น วิธีเก็บรักษา เมนูแนะนำ..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          {/* AI scan preview */}
          {aiResult && aiVerified && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl text-xs text-green-700 dark:text-green-300">
              <p className="font-bold mb-1">✓ listing นี้จะแสดง AI Badge ให้ผู้ซื้อ:</p>
              <p>
                ความสด {aiResult.freshness_score}/100 ·
                ความเสี่ยง {aiResult.risk_level} ·
                วิเคราะห์โดย Gemini 1.5 Flash
              </p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            block
            size="large"
            style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', height: 48 }}
            icon={aiVerified ? <FiZap /> : <FiPackage />}
          >
            {aiVerified ? 'โพสต์ขายพร้อม AI Badge' : 'โพสต์ขายเลย'}
          </Button>
        </Form>
      </div>

      {/* ── ScannerModal ────────────────────────────────────────── */}
      <ScannerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUseResult={handleUseResult}
      />
    </div>
  )
}
