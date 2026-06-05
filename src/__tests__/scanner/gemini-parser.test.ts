import { describe, it, expect } from 'vitest'
import {
  validateAndNormalize,
  GeminiParseError,
  GeminiSizeError,
  GeminiNoFoodError,
} from '../../lib/gemini-food-analyzer'

// Minimal valid raw payload
const validRaw = {
  food_type: 'เนื้อวัว',
  food_type_en: 'Beef',
  food_category: 'meat',
  freshness_score: 75,
  freshness_description: 'สดพอใช้',
  expiry_hours: 48,
  expiry_condition: 'refrigerated',
  risk_level: 'LOW',
  risk_reasons: ['สีปกติ'],
  visual_signs: {
    color: 'แดงสด',
    texture: 'แน่น',
    mold_detected: false,
    bruising_detected: false,
    discoloration: false,
  },
  nutrition_estimate: {
    calories_per_100g: 250,
    protein_g: 26,
    carbohydrates_g: 0,
    fat_g: 15,
    fiber_g: 0,
    note: 'ค่าประมาณการณ์',
  },
  storage_guide: {
    method: 'แช่เย็น',
    temperature: '0-4°C',
    container: 'กล่องปิดสนิท',
    tips: ['ไม่ล้างก่อนเก็บ'],
  },
  suggested_price_thb: { min: 50, max: 80, reasoning: 'ราคาตลาด' },
  cooking_suggestions: [
    { dish_name: 'สเต็กเนื้อ', urgency: 'today', difficulty: 'medium', description: 'ย่างไฟกลาง' },
  ],
  ai_confidence: 0.9,
  is_food: true,
  warning_message: null,
}

describe('validateAndNormalize', () => {
  it('passes valid data through unchanged', () => {
    const result = validateAndNormalize(validRaw)
    expect(result.food_type).toBe('เนื้อวัว')
    expect(result.food_type_en).toBe('Beef')
    expect(result.food_category).toBe('meat')
    expect(result.freshness_score).toBe(75)
    expect(result.ai_confidence).toBe(0.9)
    expect(result.is_food).toBe(true)
    expect(result.warning_message).toBeNull()
  })

  it('clamps freshness_score to 0-100', () => {
    expect(validateAndNormalize({ ...validRaw, freshness_score: 150 }).freshness_score).toBe(100)
    expect(validateAndNormalize({ ...validRaw, freshness_score: -10 }).freshness_score).toBe(0)
  })

  it('clamps ai_confidence to 0-1', () => {
    expect(validateAndNormalize({ ...validRaw, ai_confidence: 1.5 }).ai_confidence).toBe(1)
    expect(validateAndNormalize({ ...validRaw, ai_confidence: -0.1 }).ai_confidence).toBe(0)
  })

  it('falls back to "other" for unknown food_category', () => {
    const result = validateAndNormalize({ ...validRaw, food_category: 'alien_food' })
    expect(result.food_category).toBe('other')
  })

  it('falls back to "MEDIUM" for unknown risk_level', () => {
    const result = validateAndNormalize({ ...validRaw, risk_level: 'EXTREME' })
    expect(result.risk_level).toBe('MEDIUM')
  })

  it('overrides risk_level to DANGEROUS when mold_detected is true', () => {
    const result = validateAndNormalize({
      ...validRaw,
      risk_level: 'LOW',
      visual_signs: { ...validRaw.visual_signs, mold_detected: true },
    })
    expect(result.risk_level).toBe('DANGEROUS')
    expect(result.visual_signs.mold_detected).toBe(true)
  })

  it('keeps DANGEROUS when mold is true and risk was already DANGEROUS', () => {
    const result = validateAndNormalize({
      ...validRaw,
      risk_level: 'DANGEROUS',
      visual_signs: { ...validRaw.visual_signs, mold_detected: true },
    })
    expect(result.risk_level).toBe('DANGEROUS')
  })

  it('swaps min/max when price min > max', () => {
    const result = validateAndNormalize({
      ...validRaw,
      suggested_price_thb: { min: 100, max: 50, reasoning: 'ผิดลำดับ' },
    })
    expect(result.suggested_price_thb.min).toBe(50)
    expect(result.suggested_price_thb.max).toBe(100)
  })

  it('returns empty array for missing cooking_suggestions', () => {
    const result = validateAndNormalize({ ...validRaw, cooking_suggestions: undefined })
    expect(result.cooking_suggestions).toEqual([])
  })

  it('falls back to default strings for missing food_type', () => {
    const result = validateAndNormalize({ ...validRaw, food_type: undefined })
    expect(result.food_type).toBe('ไม่ทราบ')
    const result2 = validateAndNormalize({ ...validRaw, food_type_en: undefined })
    expect(result2.food_type_en).toBe('Unknown')
  })

  it('uses default expiry_condition when invalid', () => {
    const result = validateAndNormalize({ ...validRaw, expiry_condition: 'magic' })
    expect(result.expiry_condition).toBe('refrigerated')
  })

  it('normalizes cooking suggestion urgency fallback', () => {
    const result = validateAndNormalize({
      ...validRaw,
      cooking_suggestions: [{ dish_name: 'เมนู', urgency: 'never', difficulty: 'easy', description: '' }],
    })
    expect(result.cooking_suggestions[0].urgency).toBe('this_week')
  })

  it('sets warning_message to null when empty string', () => {
    const result = validateAndNormalize({ ...validRaw, warning_message: '' })
    expect(result.warning_message).toBeNull()
  })

  it('preserves non-empty warning_message', () => {
    const result = validateAndNormalize({ ...validRaw, warning_message: 'ระวัง' })
    expect(result.warning_message).toBe('ระวัง')
  })
})

describe('Custom error classes', () => {
  it('GeminiParseError has correct name and rawResponse', () => {
    const err = new GeminiParseError('bad json', '{ invalid }')
    expect(err.name).toBe('GeminiParseError')
    expect(err.message).toBe('bad json')
    expect(err.rawResponse).toBe('{ invalid }')
    expect(err).toBeInstanceOf(Error)
  })

  it('GeminiSizeError message includes KB', () => {
    const err = new GeminiSizeError(5120)
    expect(err.name).toBe('GeminiSizeError')
    expect(err.message).toContain('5120')
    expect(err).toBeInstanceOf(Error)
  })

  it('GeminiNoFoodError has correct name', () => {
    const err = new GeminiNoFoodError()
    expect(err.name).toBe('GeminiNoFoodError')
    expect(err).toBeInstanceOf(Error)
  })
})
