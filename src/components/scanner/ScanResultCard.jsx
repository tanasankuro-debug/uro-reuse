/**
 * ScanResultCard.jsx
 * แสดงผลลัพธ์จาก Gemini Vision API ตาม schema ใน gemini-food-analyzer.ts
 */

import { Tag } from 'antd'
import {
  FiClock,
  FiAlertTriangle,
  FiThermometer,
  FiDollarSign,
  FiBookOpen,
  FiInfo,
  FiCheckCircle,
  FiAlertOctagon,
  FiBox,
  FiSave,
} from 'react-icons/fi'
import { MdOutlineFoodBank } from 'react-icons/md'
import {
  RISK_COLOR,
  RISK_LABEL_TH,
  CATEGORY_LABEL_TH,
  CATEGORY_EMOJI,
  URGENCY_LABEL_TH,
  URGENCY_COLOR,
  DIFFICULTY_LABEL_TH,
  formatExpiryLabel,
} from '../../lib/gemini-food-analyzer'
import FreshnessGauge from './FreshnessGauge'

const RISK_ICON = {
  LOW: FiCheckCircle,
  MEDIUM: FiAlertTriangle,
  HIGH: FiAlertTriangle,
  DANGEROUS: FiAlertOctagon,
}

export default function ScanResultCard({ result, onAddToListing, onSave, compact = false }) {
  if (!result) return null

  const {
    food_type,
    food_type_en,
    food_category,
    freshness_score,
    freshness_description,
    risk_level,
    risk_reasons = [],
    expiry_hours,
    expiry_condition,
    visual_signs = {},
    nutrition_estimate = {},
    storage_guide = {},
    suggested_price_thb = {},
    cooking_suggestions = [],
    ai_confidence,
    warning_message,
  } = result

  const RiskIcon = RISK_ICON[risk_level] || FiInfo
  const riskColor = RISK_COLOR[risk_level] || '#6b7280'
  const riskLabel = RISK_LABEL_TH[risk_level] || risk_level
  const expiryLabel = formatExpiryLabel(expiry_hours)

  const CONDITION_LABEL = {
    room_temp: '🌡️ อุณหภูมิห้อง',
    refrigerated: '❄️ ตู้เย็น',
    frozen: '🧊 ช่องแช่แข็ง',
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden fade-in-up">

      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="px-5 py-4"
        style={{
          background: risk_level === 'DANGEROUS'
            ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
            : 'linear-gradient(135deg, #22c55e, #10b981)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{CATEGORY_EMOJI[food_category] || '🍽️'}</span>
              <h2 className="text-white font-bold text-xl leading-tight truncate">{food_type}</h2>
            </div>
            <p className="text-white/70 text-sm">{food_type_en}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Tag className="!bg-white/20 !border-white/30 !text-white !text-xs">
                {CATEGORY_LABEL_TH[food_category] || food_category}
              </Tag>
              <Tag className="!bg-white/20 !border-white/30 !text-white !text-xs">
                {CONDITION_LABEL[expiry_condition] || expiry_condition}
              </Tag>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/70 text-xs">ความมั่นใจ AI</p>
            <p className="text-white font-bold text-xl">{Math.round(ai_confidence * 100)}%</p>
          </div>
        </div>
      </div>

      {/* ── DANGEROUS banner ──────────────────────────────── */}
      {risk_level === 'DANGEROUS' && (
        <div className="bg-red-50 border-b-2 border-red-300 px-5 py-3 flex items-center gap-2">
          <FiAlertOctagon className="text-red-600 text-xl shrink-0" />
          <p className="text-red-700 font-bold text-sm">
            ⚠️ อันตราย! ห้ามรับประทานอาหารนี้
            {warning_message && ` — ${warning_message}`}
          </p>
        </div>
      )}

      {/* ── Warning message (non-dangerous) ──────────────── */}
      {warning_message && risk_level !== 'DANGEROUS' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-2.5 flex items-center gap-2">
          <FiAlertTriangle className="text-yellow-600 shrink-0" />
          <p className="text-yellow-800 text-xs">{warning_message}</p>
        </div>
      )}

      <div className="p-5 space-y-5">

        {/* ── Score + Risk + Price row ───────────────────── */}
        <div className="flex items-center justify-around gap-4">
          <FreshnessGauge score={freshness_score} size={130} />

          <div className="flex flex-col gap-2.5 flex-1 max-w-[200px]">
            {/* Risk level */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ backgroundColor: riskColor + '15', border: `1px solid ${riskColor}40` }}
            >
              <RiskIcon style={{ color: riskColor }} className="text-lg shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-none">ระดับความเสี่ยง</p>
                <p className="font-bold text-sm truncate" style={{ color: riskColor }}>
                  {riskLabel}
                </p>
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100">
              <FiClock className="text-orange-500 text-lg shrink-0" />
              <div>
                <p className="text-xs text-gray-500 leading-none">เสียใน</p>
                <p className="font-bold text-sm text-orange-600">{expiryLabel}</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-100">
              <FiDollarSign className="text-blue-500 text-lg shrink-0" />
              <div>
                <p className="text-xs text-gray-500 leading-none">ราคาแนะนำ/100g</p>
                <p className="font-bold text-sm text-blue-600">
                  ฿{suggested_price_thb.min}–{suggested_price_thb.max}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Freshness description ─────────────────────── */}
        {freshness_description && (
          <p className="text-sm text-gray-600 italic bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            "{freshness_description}"
          </p>
        )}

        {/* ── Risk reasons ─────────────────────────────── */}
        {!compact && risk_reasons.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              เหตุผล
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {risk_reasons.map((r, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{
                    color: riskColor,
                    borderColor: riskColor + '40',
                    backgroundColor: riskColor + '10',
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Visual signs ─────────────────────────────── */}
        {!compact && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'สี', value: visual_signs.color, icon: '🎨' },
              { label: 'เนื้อสัมผัส', value: visual_signs.texture, icon: '✋' },
              {
                label: 'เชื้อรา',
                value: visual_signs.mold_detected ? '⚠️ พบ' : '✓ ไม่พบ',
                icon: '🔬',
                danger: visual_signs.mold_detected,
              },
              {
                label: 'ช้ำ',
                value: visual_signs.bruising_detected ? '⚠️ พบ' : '✓ ไม่พบ',
                icon: '🫐',
                danger: visual_signs.bruising_detected,
              },
              {
                label: 'สีผิดปกติ',
                value: visual_signs.discoloration ? '⚠️ พบ' : '✓ ไม่พบ',
                icon: '🌈',
                danger: visual_signs.discoloration,
              },
            ].map(({ label, value, icon, danger }) => (
              <div
                key={label}
                className={`rounded-xl p-3 text-center ${
                  danger ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                }`}
              >
                <p className="text-lg">{icon}</p>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-xs font-medium ${danger ? 'text-red-600' : 'text-gray-700'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Nutrition ────────────────────────────────── */}
        {!compact && nutrition_estimate.calories_per_100g != null && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
              <FiThermometer className="text-orange-400" /> โภชนาการ (ต่อ 100g)
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'แคลอรี่', value: `${nutrition_estimate.calories_per_100g} kcal`, color: '#f97316' },
                { label: 'โปรตีน', value: `${nutrition_estimate.protein_g}g`, color: '#3b82f6' },
                { label: 'คาร์โบไฮเดรต', value: `${nutrition_estimate.carbohydrates_g}g`, color: '#eab308' },
                { label: 'ไขมัน', value: `${nutrition_estimate.fat_g}g`, color: '#ef4444' },
                { label: 'ใยอาหาร', value: `${nutrition_estimate.fiber_g}g`, color: '#22c55e' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className="text-xs font-bold" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {nutrition_estimate.note && (
              <p className="text-xs text-gray-400 mt-1.5 italic">{nutrition_estimate.note}</p>
            )}
          </div>
        )}

        {/* ── Storage guide ─────────────────────────────── */}
        {!compact && storage_guide.method && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FiBox className="text-green-500" /> วิธีเก็บรักษา
            </h4>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="font-medium text-green-700">วิธี:</span>
                {storage_guide.method}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="font-medium text-green-700">อุณหภูมิ:</span>
                {storage_guide.temperature}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="font-medium text-green-700">ภาชนะ:</span>
                {storage_guide.container}
              </div>
              {storage_guide.tips?.map((tip, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Price reasoning ───────────────────────────── */}
        {!compact && suggested_price_thb.reasoning && (
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
              <FiDollarSign /> เหตุผลการตั้งราคา
            </p>
            <p className="text-xs text-gray-600">{suggested_price_thb.reasoning}</p>
          </div>
        )}

        {/* ── Cooking suggestions ───────────────────────── */}
        {!compact && cooking_suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FiBookOpen className="text-purple-500" /> สูตรอาหารแนะนำ
            </h4>
            <div className="space-y-2">
              {cooking_suggestions.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 border bg-purple-50 border-purple-100"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-800">{r.dish_name}</span>
                    <div className="flex gap-1 shrink-0">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: URGENCY_COLOR[r.urgency] }}
                      >
                        {URGENCY_LABEL_TH[r.urgency]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.difficulty === 'easy'
                          ? 'bg-green-100 text-green-700'
                          : r.difficulty === 'hard'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {DIFFICULTY_LABEL_TH[r.difficulty]}
                      </span>
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{r.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ────────────────────────────── */}
        <div className="flex gap-2 pt-1">
          {onSave && (
            <button
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-green-300 text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-colors text-sm"
            >
              <FiSave /> บันทึก
            </button>
          )}
          {onAddToListing && (
            <button
              onClick={() => onAddToListing(result)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              <MdOutlineFoodBank className="text-base" /> ลงขาย
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
