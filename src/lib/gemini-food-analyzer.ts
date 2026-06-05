/**
 * gemini-food-analyzer.ts
 * ─────────────────────────────────────────────────────────────────
 * Gemini Vision prompt + response parser + type definitions
 * สำหรับวิเคราะห์ความสดของอาหารแบบ Real-Time
 * ─────────────────────────────────────────────────────────────────
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

// ═══════════════════════════════════════════════════════════════
// TYPES — โครงสร้าง JSON ที่ Gemini จะตอบกลับ
// ═══════════════════════════════════════════════════════════════

export type FoodCategory =
  | 'meat'
  | 'seafood'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'grain'
  | 'cooked'
  | 'other'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'DANGEROUS'

export type ExpiryCondition = 'room_temp' | 'refrigerated' | 'frozen'

export type CookingUrgency = 'today' | 'tomorrow' | 'this_week'

export type CookingDifficulty = 'easy' | 'medium' | 'hard'

export interface VisualSigns {
  color: string
  texture: string
  mold_detected: boolean
  bruising_detected: boolean
  discoloration: boolean
}

export interface NutritionEstimate {
  calories_per_100g: number
  protein_g: number
  carbohydrates_g: number
  fat_g: number
  fiber_g: number
  note: string
}

export interface StorageGuide {
  method: string
  temperature: string
  container: string
  tips: string[]
}

export interface PriceRange {
  min: number
  max: number
  reasoning: string
}

export interface CookingSuggestion {
  dish_name: string
  urgency: CookingUrgency
  difficulty: CookingDifficulty
  description: string
}

/** ผลลัพธ์เต็มจาก Gemini Vision */
export interface FoodAnalysisResult {
  food_type: string
  food_type_en: string
  food_category: FoodCategory
  freshness_score: number             // 0-100
  freshness_description: string
  expiry_hours: number
  expiry_condition: ExpiryCondition
  risk_level: RiskLevel
  risk_reasons: string[]
  visual_signs: VisualSigns
  nutrition_estimate: NutritionEstimate
  storage_guide: StorageGuide
  suggested_price_thb: PriceRange
  cooking_suggestions: CookingSuggestion[]
  ai_confidence: number               // 0-1
  is_food: boolean
  warning_message: string | null
}

/** กรณีที่ไม่พบอาหารในภาพ */
export interface NoFoodResult {
  is_food: false
  ai_confidence: number
}

export type GeminiResponse = FoodAnalysisResult | NoFoodResult

// ═══════════════════════════════════════════════════════════════
// PROMPT TEMPLATE — ออกแบบให้ได้ผลลัพธ์ที่แม่นยำและสม่ำเสมอ
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `คุณคือ AI ผู้เชี่ยวชาญด้านความปลอดภัยอาหารและโภชนาการ
ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นใด ห้ามมี markdown code fence`

const buildAnalysisPrompt = (): string => `
วิเคราะห์ภาพอาหารนี้แล้วตอบเป็น JSON ตามโครงสร้างด้านล่างนี้เท่านั้น:

{
  "food_type": "ชื่ออาหารภาษาไทย เช่น เนื้อวัว, ผักโขม, ขนมปัง",
  "food_type_en": "Food name in English",
  "food_category": "หนึ่งใน: meat | seafood | vegetable | fruit | dairy | grain | cooked | other",
  "freshness_score": 0-100 (100=สดมาก 0=เน่าแล้ว),
  "freshness_description": "อธิบายสภาพอาหาร 1 ประโยคภาษาไทย",
  "expiry_hours": จำนวนชั่วโมงก่อนเสีย (ตัวเลข เช่น 48),
  "expiry_condition": "หนึ่งใน: room_temp | refrigerated | frozen",
  "risk_level": "หนึ่งใน: LOW | MEDIUM | HIGH | DANGEROUS",
  "risk_reasons": ["เหตุผล 1 ภาษาไทย", "เหตุผล 2"],
  "visual_signs": {
    "color": "สีที่สังเกตได้ เช่น สีแดงสด, เริ่มคล้ำ",
    "texture": "เนื้อสัมผัสที่มองเห็น เช่น แน่น, เหี่ยว, ฉ่ำ",
    "mold_detected": true หรือ false,
    "bruising_detected": true หรือ false,
    "discoloration": true หรือ false
  },
  "nutrition_estimate": {
    "calories_per_100g": ตัวเลข,
    "protein_g": ตัวเลข,
    "carbohydrates_g": ตัวเลข,
    "fat_g": ตัวเลข,
    "fiber_g": ตัวเลข,
    "note": "หมายเหตุ เช่น ค่าประมาณการณ์เท่านั้น"
  },
  "storage_guide": {
    "method": "วิธีเก็บที่แนะนำภาษาไทย",
    "temperature": "อุณหภูมิที่เหมาะสม เช่น 0-4°C",
    "container": "ภาชนะที่แนะนำ เช่น กล่องปิดสนิท",
    "tips": ["เคล็ดลับ 1", "เคล็ดลับ 2"]
  },
  "suggested_price_thb": {
    "min": ราคาต่ำสุด (บาท/100g ตัวเลข),
    "max": ราคาสูงสุด (บาท/100g ตัวเลข),
    "reasoning": "เหตุผลการตั้งราคาภาษาไทย"
  },
  "cooking_suggestions": [
    {
      "dish_name": "ชื่อเมนูภาษาไทย",
      "urgency": "หนึ่งใน: today | tomorrow | this_week",
      "difficulty": "หนึ่งใน: easy | medium | hard",
      "description": "วิธีทำสั้นๆ 1-2 ประโยค"
    }
  ],
  "ai_confidence": 0.0-1.0 (ความมั่นใจ),
  "is_food": true,
  "warning_message": "ข้อความเตือนพิเศษถ้ามี หรือ null"
}

กฎสำคัญ:
- ถ้าไม่เห็นอาหารในภาพ: {"is_food": false, "ai_confidence": 1.0}
- ถ้าพบเชื้อรา: risk_level = "DANGEROUS", mold_detected = true
- freshness_score ต้องสอดคล้องกับ risk_level:
  * LOW: 60-100, MEDIUM: 35-59, HIGH: 15-34, DANGEROUS: 0-14
- expiry_hours ประเมินตาม expiry_condition ที่ระบุ
- cooking_suggestions ให้ 2-3 เมนูที่เหมาะสมกับความสดปัจจุบัน
- ตอบ JSON เท่านั้น ห้ามมี text ก่อนหรือหลัง JSON
`

// ═══════════════════════════════════════════════════════════════
// VALIDATOR — ตรวจสอบโครงสร้าง JSON ที่ได้รับ
// ═══════════════════════════════════════════════════════════════

const VALID_CATEGORIES: FoodCategory[] = [
  'meat', 'seafood', 'vegetable', 'fruit', 'dairy', 'grain', 'cooked', 'other',
]
const VALID_RISK_LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'DANGEROUS']
const VALID_EXPIRY_CONDITIONS: ExpiryCondition[] = ['room_temp', 'refrigerated', 'frozen']
const VALID_URGENCIES: CookingUrgency[] = ['today', 'tomorrow', 'this_week']
const VALID_DIFFICULTIES: CookingDifficulty[] = ['easy', 'medium', 'hard']

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : fallback
  return Math.min(Math.max(n, min), max)
}

function ensureString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function ensureEnum<T extends string>(value: unknown, valid: T[], fallback: T): T {
  return valid.includes(value as T) ? (value as T) : fallback
}

/**
 * validateAndNormalize — sanitizes raw Gemini JSON
 * แก้ไขค่าที่ผิดพลาดเล็กน้อยโดยอัตโนมัติ แทนที่จะ throw error
 */
function validateAndNormalize(raw: Record<string, unknown>): FoodAnalysisResult {
  // visual_signs
  const vs = (raw.visual_signs as Record<string, unknown>) ?? {}
  const visual_signs: VisualSigns = {
    color: ensureString(vs.color, 'ไม่ทราบ'),
    texture: ensureString(vs.texture, 'ไม่ทราบ'),
    mold_detected: Boolean(vs.mold_detected),
    bruising_detected: Boolean(vs.bruising_detected),
    discoloration: Boolean(vs.discoloration),
  }

  // nutrition
  const nu = (raw.nutrition_estimate as Record<string, unknown>) ?? {}
  const nutrition_estimate: NutritionEstimate = {
    calories_per_100g: clamp(nu.calories_per_100g, 0, 2000, 0),
    protein_g: clamp(nu.protein_g, 0, 100, 0),
    carbohydrates_g: clamp(nu.carbohydrates_g, 0, 100, 0),
    fat_g: clamp(nu.fat_g, 0, 100, 0),
    fiber_g: clamp(nu.fiber_g, 0, 50, 0),
    note: ensureString(nu.note, 'ค่าประมาณการณ์เท่านั้น'),
  }

  // storage guide
  const sg = (raw.storage_guide as Record<string, unknown>) ?? {}
  const storage_guide: StorageGuide = {
    method: ensureString(sg.method, 'เก็บในที่เย็น'),
    temperature: ensureString(sg.temperature, 'ต่ำกว่า 4°C'),
    container: ensureString(sg.container, 'กล่องปิดสนิท'),
    tips: ensureArray<string>(sg.tips),
  }

  // price
  const price = (raw.suggested_price_thb as Record<string, unknown>) ?? {}
  const suggested_price_thb: PriceRange = {
    min: clamp(price.min, 0, 9999, 0),
    max: clamp(price.max, 0, 9999, 0),
    reasoning: ensureString(price.reasoning, 'ราคาตลาดทั่วไป'),
  }
  // fix min > max
  if (suggested_price_thb.min > suggested_price_thb.max) {
    ;[suggested_price_thb.min, suggested_price_thb.max] = [
      suggested_price_thb.max,
      suggested_price_thb.min,
    ]
  }

  // cooking suggestions
  const rawSuggestions = ensureArray<Record<string, unknown>>(raw.cooking_suggestions)
  const cooking_suggestions: CookingSuggestion[] = rawSuggestions.map((s) => ({
    dish_name: ensureString(s.dish_name, 'เมนูแนะนำ'),
    urgency: ensureEnum<CookingUrgency>(s.urgency, VALID_URGENCIES, 'this_week'),
    difficulty: ensureEnum<CookingDifficulty>(s.difficulty, VALID_DIFFICULTIES, 'easy'),
    description: ensureString(s.description, ''),
  }))

  const freshness_score = clamp(raw.freshness_score, 0, 100, 50)
  const risk_level = ensureEnum<RiskLevel>(raw.risk_level, VALID_RISK_LEVELS, 'MEDIUM')

  // ตรวจ consistency: ถ้า mold_detected ต้อง DANGEROUS
  const effectiveRisk =
    visual_signs.mold_detected && risk_level !== 'DANGEROUS' ? 'DANGEROUS' : risk_level

  return {
    food_type: ensureString(raw.food_type, 'ไม่ทราบ'),
    food_type_en: ensureString(raw.food_type_en, 'Unknown'),
    food_category: ensureEnum<FoodCategory>(raw.food_category, VALID_CATEGORIES, 'other'),
    freshness_score,
    freshness_description: ensureString(raw.freshness_description, ''),
    expiry_hours: clamp(raw.expiry_hours, 0, 8760, 24),
    expiry_condition: ensureEnum<ExpiryCondition>(
      raw.expiry_condition,
      VALID_EXPIRY_CONDITIONS,
      'refrigerated'
    ),
    risk_level: effectiveRisk,
    risk_reasons: ensureArray<string>(raw.risk_reasons),
    visual_signs,
    nutrition_estimate,
    storage_guide,
    suggested_price_thb,
    cooking_suggestions,
    ai_confidence: clamp(raw.ai_confidence, 0, 1, 0.5),
    is_food: true,
    warning_message:
      typeof raw.warning_message === 'string' && raw.warning_message ? raw.warning_message : null,
  }
}

// ═══════════════════════════════════════════════════════════════
// PARSER — แปลง raw text จาก Gemini เป็น typed object
// ═══════════════════════════════════════════════════════════════

function parseGeminiResponse(text: string): GeminiResponse {
  // strip markdown fences ถ้ามี
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(cleaned)
  } catch {
    throw new GeminiParseError('Gemini ตอบกลับไม่ใช่ JSON ที่ถูกต้อง', text)
  }

  // กรณีไม่พบอาหาร
  if (raw.is_food === false) {
    return {
      is_food: false,
      ai_confidence: clamp(raw.ai_confidence, 0, 1, 1),
    }
  }

  return validateAndNormalize(raw)
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM ERRORS
// ═══════════════════════════════════════════════════════════════

export class GeminiParseError extends Error {
  constructor(
    message: string,
    public readonly rawResponse: string
  ) {
    super(message)
    this.name = 'GeminiParseError'
  }
}

export class GeminiSizeError extends Error {
  constructor(sizeKB: number) {
    super(`ขนาดภาพ ${sizeKB.toFixed(0)} KB เกินขีดจำกัด 4 MB`)
    this.name = 'GeminiSizeError'
  }
}

export class GeminiNoFoodError extends Error {
  constructor() {
    super('ไม่พบอาหารในภาพ — กรุณาถ่ายภาพอาหารใหม่')
    this.name = 'GeminiNoFoodError'
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYZER FUNCTION
// ═══════════════════════════════════════════════════════════════

let _model: GenerativeModel | null = null

function getModel(): GenerativeModel {
  if (_model) return _model
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY ยังไม่ได้ตั้งค่า')
  const genAI = new GoogleGenerativeAI(apiKey)
  _model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,         // ลด hallucination
      topP: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  })
  return _model
}

/**
 * analyzeFoodImage — ส่งภาพไปวิเคราะห์กับ Gemini
 * @param base64 — data:image/jpeg;base64,... หรือ raw base64
 * @returns FoodAnalysisResult
 * @throws GeminiSizeError | GeminiNoFoodError | GeminiParseError | Error
 */
export async function analyzeFoodImage(base64: string): Promise<FoodAnalysisResult> {
  // ── ตรวจสอบขนาดภาพ (4 MB = 4 * 1024 * 1024 bytes, base64 overhead ~1.37x) ──
  const rawBase64 = base64.replace(/^data:image\/\w+;base64,/, '')
  const estimatedBytes = (rawBase64.length * 3) / 4
  const MAX_BYTES = 4 * 1024 * 1024 // 4 MB
  if (estimatedBytes > MAX_BYTES) {
    throw new GeminiSizeError(estimatedBytes / 1024)
  }

  const model = getModel()

  const imagePart = {
    inlineData: {
      data: rawBase64,
      mimeType: 'image/jpeg' as const,
    },
  }

  const result = await model.generateContent([buildAnalysisPrompt(), imagePart])
  const text = result.response.text().trim()

  if (!text) throw new Error('Gemini ไม่ได้ตอบกลับ — ลองใหม่อีกครั้ง')

  const parsed = parseGeminiResponse(text)

  if (!parsed.is_food) throw new GeminiNoFoodError()

  return parsed as FoodAnalysisResult
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA — ใช้เมื่อไม่มี API key (Development mode)
// ═══════════════════════════════════════════════════════════════

export function mockAnalyzeFoodImage(): Promise<FoodAnalysisResult> {
  const mocks: FoodAnalysisResult[] = [
    {
      food_type: 'มะเขือเทศ',
      food_type_en: 'Tomato',
      food_category: 'vegetable',
      freshness_score: 72,
      freshness_description: 'มะเขือเทศสดใหม่ สีแดงสม่ำเสมอ เนื้อแน่น ยังไม่มีสัญญาณของการเสื่อมสภาพ',
      expiry_hours: 72,
      expiry_condition: 'refrigerated',
      risk_level: 'LOW',
      risk_reasons: ['เก็บได้อีก 3 วันในตู้เย็น', 'ไม่พบสัญญาณเสื่อมสภาพ'],
      visual_signs: {
        color: 'สีแดงสม่ำเสมอ',
        texture: 'แน่น ฉ่ำ',
        mold_detected: false,
        bruising_detected: false,
        discoloration: false,
      },
      nutrition_estimate: {
        calories_per_100g: 18,
        protein_g: 0.9,
        carbohydrates_g: 3.9,
        fat_g: 0.2,
        fiber_g: 1.2,
        note: 'ค่าประมาณการณ์มาตรฐานต่อ 100g',
      },
      storage_guide: {
        method: 'เก็บในตู้เย็นช่องผัก',
        temperature: '8-12°C',
        container: 'ถุงพลาสติกหรือกล่องปิดสนิท',
        tips: [
          'ห่อด้วยกระดาษทิชชูก่อนเก็บเพื่อดูดความชื้น',
          'หลีกเลี่ยงการวางใกล้ผลไม้สุกอื่น',
          'ไม่ควรล้างก่อนเก็บ',
        ],
      },
      suggested_price_thb: {
        min: 15,
        max: 25,
        reasoning: 'ราคาตลาดทั่วไปของมะเขือเทศสด ปรับลด 30-40% เนื่องจากใกล้หมดอายุ',
      },
      cooking_suggestions: [
        {
          dish_name: 'สลัดมะเขือเทศน้ำสลัดอิตาเลียน',
          urgency: 'this_week',
          difficulty: 'easy',
          description: 'หั่นมะเขือเทศ ราดน้ำสลัด โรยพาร์เมซาน เสิร์ฟทันที',
        },
        {
          dish_name: 'ซุปมะเขือเทศโฮมเมด',
          urgency: 'this_week',
          difficulty: 'medium',
          description: 'ต้มมะเขือเทศกับหอมใหญ่ กระเทียม ใส่ครีม ปั่นให้ละเอียด',
        },
        {
          dish_name: 'พิซซ่าไข่ดาว',
          urgency: 'tomorrow',
          difficulty: 'medium',
          description: 'ใช้มะเขือเทศทำซอส ราดบนแป้ง ใส่ไข่ดาว ชีส อบ 200°C 15 นาที',
        },
      ],
      ai_confidence: 0.91,
      is_food: true,
      warning_message: null,
    },
  ]

  return new Promise((resolve) =>
    setTimeout(() => resolve(mocks[Math.floor(Math.random() * mocks.length)]), 900)
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPER UTILITIES — ฟังก์ชันช่วยแปลงข้อมูลสำหรับ UI
// ═══════════════════════════════════════════════════════════════

/** แปลง expiry_hours เป็นข้อความภาษาไทย */
export function formatExpiryLabel(hours: number): string {
  if (hours < 1) return 'น้อยกว่า 1 ชั่วโมง'
  if (hours < 24) return `${hours} ชั่วโมง`
  const days = Math.floor(hours / 24)
  const rem = hours % 24
  if (rem === 0) return `${days} วัน`
  return `${days} วัน ${rem} ชั่วโมง`
}

/** แปลง food_category เป็นภาษาไทย */
export const CATEGORY_LABEL_TH: Record<FoodCategory, string> = {
  meat: 'เนื้อสัตว์',
  seafood: 'อาหารทะเล',
  vegetable: 'ผัก',
  fruit: 'ผลไม้',
  dairy: 'ผลิตภัณฑ์นม',
  grain: 'ธัญพืช/แป้ง',
  cooked: 'อาหารปรุงสำเร็จ',
  other: 'อื่นๆ',
}

/** emoji ประจำ category */
export const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  meat: '🥩',
  seafood: '🦐',
  vegetable: '🥦',
  fruit: '🍎',
  dairy: '🥛',
  grain: '🌾',
  cooked: '🍱',
  other: '🍽️',
}

/** แปลง urgency เป็นภาษาไทย */
export const URGENCY_LABEL_TH: Record<CookingUrgency, string> = {
  today: 'ทำวันนี้เลย',
  tomorrow: 'ทำพรุ่งนี้',
  this_week: 'ทำภายในอาทิตย์นี้',
}

export const URGENCY_COLOR: Record<CookingUrgency, string> = {
  today: '#ef4444',
  tomorrow: '#f97316',
  this_week: '#22c55e',
}

/** แปลง difficulty เป็นภาษาไทย */
export const DIFFICULTY_LABEL_TH: Record<CookingDifficulty, string> = {
  easy: 'ง่าย',
  medium: 'ปานกลาง',
  hard: 'ยาก',
}

/** สีประจำ risk level */
export const RISK_COLOR: Record<RiskLevel, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f97316',
  HIGH: '#ef4444',
  DANGEROUS: '#7f1d1d',
}

/** ป้ายชื่อภาษาไทย */
export const RISK_LABEL_TH: Record<RiskLevel, string> = {
  LOW: 'ความเสี่ยงต่ำ',
  MEDIUM: 'ความเสี่ยงปานกลาง',
  HIGH: 'ความเสี่ยงสูง',
  DANGEROUS: 'อันตราย! ห้ามรับประทาน',
}

/** คะแนนความสด → ป้ายชื่อ + สี */
export function getFreshnessLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'สดมาก', color: '#22c55e' }
  if (score >= 60) return { label: 'สดดี', color: '#84cc16' }
  if (score >= 40) return { label: 'พอใช้ได้', color: '#f97316' }
  if (score >= 20) return { label: 'ใกล้หมด', color: '#ef4444' }
  return { label: 'เสียแล้ว', color: '#7f1d1d' }
}
