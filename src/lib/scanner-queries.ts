/**
 * scanner-queries.ts
 * ─────────────────────────────────────────────────────────────────
 * Helper functions สำหรับ query scan_results / scanner_sessions
 *
 * ทุก function ผ่าน Supabase client — RLS บังคับใช้อัตโนมัติ
 * ─────────────────────────────────────────────────────────────────
 */

import { supabase } from '../services/supabase'
import type { FoodAnalysisResult } from './gemini-food-analyzer'
import type {
  ScanResultRow,
  ScanResultInsert,
  ScannerSessionRow,
  ScannerSessionInsert,
  UserScanStats,
  ExpiringListing,
  ScanRiskLevel,
} from '../types/database.types'

// ═══════════════════════════════════════════════════════════════
// WRITE
// ═══════════════════════════════════════════════════════════════

export interface SaveScanOptions {
  imageUrl?:        string
  scanSource?:      'camera' | 'upload'
  usedFor?:         'seller_listing' | 'buyer_check' | 'personal'
  linkedListingId?: string
}

/**
 * บันทึกผลสแกนลง scan_results
 * @returns scan_result id ถ้าสำเร็จ, null ถ้า error
 */
export async function saveScanResult(
  result: FoodAnalysisResult,
  userId: string,
  options: SaveScanOptions = {}
): Promise<string | null> {
  const row: ScanResultInsert = {
    user_id: userId,

    food_type:             result.food_type,
    food_type_en:          result.food_type_en,
    food_category:         result.food_category,

    freshness_score:       result.freshness_score,
    freshness_description: result.freshness_description,
    expiry_hours:          result.expiry_hours,
    expiry_condition:      result.expiry_condition,
    risk_level:            result.risk_level as ScanRiskLevel,
    risk_reasons:          result.risk_reasons,

    visual_signs: {
      color:             result.visual_signs.color,
      texture:           result.visual_signs.texture,
      mold_detected:     result.visual_signs.mold_detected,
      bruising_detected: result.visual_signs.bruising_detected,
      discoloration:     result.visual_signs.discoloration,
    },

    nutrition: {
      calories_per_100g: result.nutrition_estimate.calories_per_100g,
      protein_g:         result.nutrition_estimate.protein_g,
      carbohydrates_g:   result.nutrition_estimate.carbohydrates_g,
      fat_g:             result.nutrition_estimate.fat_g,
      fiber_g:           result.nutrition_estimate.fiber_g,
      note:              result.nutrition_estimate.note,
    },

    storage_guide: {
      method:      result.storage_guide.method,
      temperature: result.storage_guide.temperature,
      container:   result.storage_guide.container,
      tips:        result.storage_guide.tips,
    },

    cooking_suggestions: result.cooking_suggestions.map((s) => ({
      dish_name:   s.dish_name,
      urgency:     s.urgency,
      difficulty:  s.difficulty,
      description: s.description,
    })),

    suggested_price_min: result.suggested_price_thb.min,
    suggested_price_max: result.suggested_price_thb.max,
    price_reasoning:     result.suggested_price_thb.reasoning,

    ai_confidence: result.ai_confidence,

    image_url:         options.imageUrl         ?? null,
    scan_source:       options.scanSource        ?? 'camera',
    used_for:          options.usedFor           ?? null,
    linked_listing_id: options.linkedListingId   ?? null,
  }

  const { data, error } = await supabase
    .from('scan_results')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    console.warn('[scanner-queries] saveScanResult failed:', error.message)
    return null
  }
  return data.id
}

/**
 * อัปโหลดภาพไปยัง Storage bucket food-scans
 * @returns public URL ถ้าสำเร็จ, null ถ้า error
 */
export async function uploadScanImage(
  base64DataUrl: string,
  userId: string,
  scanId: string
): Promise<string | null> {
  try {
    const response = await fetch(base64DataUrl)
    const blob = await response.blob()
    const path = `${userId}/${scanId}.jpg`

    const { error: upErr } = await supabase.storage
      .from('food-scans')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

    if (upErr) {
      console.warn('[scanner-queries] uploadScanImage failed:', upErr.message)
      return null
    }

    // Private bucket — ใช้ signed URL (หมดอายุ 60 นาที)
    const { data } = await supabase.storage
      .from('food-scans')
      .createSignedUrl(path, 3600)

    return data?.signedUrl ?? null
  } catch (err) {
    console.warn('[scanner-queries] uploadScanImage error:', err)
    return null
  }
}

/**
 * เชื่อม scan_result กับ listing
 */
export async function linkScanToListing(
  scanId: string,
  listingId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('scan_results')
    .update({ linked_listing_id: listingId, used_for: 'seller_listing' })
    .eq('id', scanId)

  return !error
}

/**
 * ลบผลสแกน (เฉพาะของตัวเอง — RLS บังคับ)
 */
export async function deleteScanResult(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('scan_results')
    .delete()
    .eq('id', id)

  return !error
}

// ═══════════════════════════════════════════════════════════════
// READ
// ═══════════════════════════════════════════════════════════════

export interface GetScanHistoryOptions {
  limit?:     number    // default 20
  offset?:    number    // default 0
  category?:  string
  riskLevel?: ScanRiskLevel
}

/**
 * ประวัติสแกนของ user — ล่าสุดก่อน
 */
export async function getScanHistory(
  userId: string,
  options: GetScanHistoryOptions = {}
): Promise<ScanResultRow[]> {
  const { limit = 20, offset = 0, category, riskLevel } = options

  let query = supabase
    .from('scan_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category)  query = query.eq('food_category', category)
  if (riskLevel) query = query.eq('risk_level', riskLevel)

  const { data, error } = await query

  if (error) {
    console.warn('[scanner-queries] getScanHistory failed:', error.message)
    return []
  }
  return (data ?? []) as ScanResultRow[]
}

/**
 * ดึง scan_result เดียวตาม id
 */
export async function getScanById(id: string): Promise<ScanResultRow | null> {
  const { data, error } = await supabase
    .from('scan_results')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as ScanResultRow
}

// ═══════════════════════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * สถิติการสแกนของ user (เรียก DB function)
 */
export async function getUserScanStats(
  userId: string
): Promise<UserScanStats | null> {
  const { data, error } = await supabase
    .rpc('get_user_scan_stats', { p_user_id: userId })

  if (error || !data?.length) return null
  return data[0] as UserScanStats
}

/**
 * Listings ที่จะหมดอายุเร็วๆ นี้ (เรียก DB function)
 * @param hours ภายในกี่ชั่วโมง (default 24)
 */
export async function getExpiringSoonListings(
  hours = 24
): Promise<ExpiringListing[]> {
  const { data, error } = await supabase
    .rpc('get_expiring_soon_listings', { p_hours: hours })

  if (error) {
    console.warn('[scanner-queries] getExpiringSoonListings failed:', error.message)
    return []
  }
  return (data ?? []) as ExpiringListing[]
}

// ═══════════════════════════════════════════════════════════════
// SESSION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * เริ่ม scanner session ใหม่
 */
export async function startScannerSession(
  userId: string,
  options: Pick<ScannerSessionInsert, 'device_type' | 'session_type'> = {}
): Promise<string | null> {
  const { data, error } = await supabase
    .from('scanner_sessions')
    .insert({ user_id: userId, ...options })
    .select('id')
    .single()

  return error ? null : data.id
}

/**
 * จบ session + บันทึกจำนวนสแกน
 */
export async function endScannerSession(
  sessionId: string,
  totalScans: number
): Promise<boolean> {
  const { error } = await supabase
    .from('scanner_sessions')
    .update({ ended_at: new Date().toISOString(), total_scans: totalScans })
    .eq('id', sessionId)

  return !error
}

/**
 * ประวัติ session ของ user
 */
export async function getScannerSessions(
  userId: string,
  limit = 10
): Promise<ScannerSessionRow[]> {
  const { data, error } = await supabase
    .from('scanner_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data ?? []) as ScannerSessionRow[]
}
