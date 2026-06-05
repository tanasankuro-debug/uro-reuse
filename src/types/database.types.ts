/**
 * database.types.ts
 * ─────────────────────────────────────────────────────────────────
 * TypeScript types ที่ตรงกับ Supabase schema ทุก column
 *
 * อัปเดต types นี้เมื่อ:
 *  - เพิ่ม/ลบ column ใน SQL migration
 *  - เพิ่ม function ใหม่
 *  - เปลี่ยน CHECK constraint
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
// JSON TYPE
// ═══════════════════════════════════════════════════════════════

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json }

// ═══════════════════════════════════════════════════════════════
// ENUMS / UNIONS
// ═══════════════════════════════════════════════════════════════

export type ScanRiskLevel   = 'LOW' | 'MEDIUM' | 'HIGH' | 'DANGEROUS'
export type ScanSource      = 'camera' | 'upload'
export type ScanUsedFor     = 'seller_listing' | 'buyer_check' | 'personal'
export type ExpiryCondition = 'room_temp' | 'refrigerated' | 'frozen'
export type DeviceType      = 'mobile' | 'desktop' | 'tablet'
export type SessionType     = 'seller' | 'buyer' | 'personal'

// ═══════════════════════════════════════════════════════════════
// JSONB COLUMN TYPES
// ═══════════════════════════════════════════════════════════════

export interface VisualSignsJson {
  color:              string
  texture:            string
  mold_detected:      boolean
  bruising_detected:  boolean
  discoloration:      boolean
}

export interface NutritionJson {
  calories_per_100g: number
  protein_g:         number
  carbohydrates_g:   number
  fat_g:             number
  fiber_g:           number
  note?:             string
}

export interface StorageGuideJson {
  method:      string
  temperature: string
  container:   string
  tips:        string[]
}

export interface CookingSuggestionJson {
  dish_name:   string
  urgency:     'today' | 'tomorrow' | 'this_week'
  difficulty:  'easy' | 'medium' | 'hard'
  description: string
}

// ═══════════════════════════════════════════════════════════════
// TABLE: scan_results
// ═══════════════════════════════════════════════════════════════

export interface ScanResultRow {
  id:                   string
  user_id:              string | null

  food_type:            string | null
  food_type_en:         string | null
  food_category:        string | null

  freshness_score:      number | null
  freshness_description: string | null
  expiry_hours:         number | null
  expiry_condition:     ExpiryCondition | null
  risk_level:           ScanRiskLevel | null
  risk_reasons:         string[]

  visual_signs:         VisualSignsJson
  nutrition:            NutritionJson
  storage_guide:        StorageGuideJson
  cooking_suggestions:  CookingSuggestionJson[]

  suggested_price_min:  number | null
  suggested_price_max:  number | null
  price_reasoning:      string | null

  ai_confidence:        number | null
  image_url:            string | null
  scan_source:          ScanSource
  used_for:             ScanUsedFor | null
  linked_listing_id:    string | null

  created_at:           string
  updated_at:           string
}

/** ใช้ตอน INSERT — id, created_at, updated_at ไม่ต้องส่ง */
export interface ScanResultInsert {
  id?:                   string
  user_id:               string

  food_type?:            string | null
  food_type_en?:         string | null
  food_category?:        string | null

  freshness_score?:      number | null
  freshness_description?: string | null
  expiry_hours?:         number | null
  expiry_condition?:     ExpiryCondition | null
  risk_level?:           ScanRiskLevel | null
  risk_reasons?:         string[]

  visual_signs?:         VisualSignsJson
  nutrition?:            NutritionJson
  storage_guide?:        StorageGuideJson
  cooking_suggestions?:  CookingSuggestionJson[]

  suggested_price_min?:  number | null
  suggested_price_max?:  number | null
  price_reasoning?:      string | null

  ai_confidence?:        number | null
  image_url?:            string | null
  scan_source?:          ScanSource
  used_for?:             ScanUsedFor | null
  linked_listing_id?:    string | null

  created_at?:           string
  updated_at?:           string
}

/** ใช้ตอน UPDATE — ทุก field เป็น optional */
export type ScanResultUpdate = Partial<Omit<ScanResultInsert, 'user_id'>>

// ═══════════════════════════════════════════════════════════════
// TABLE: scanner_sessions
// ═══════════════════════════════════════════════════════════════

export interface ScannerSessionRow {
  id:           string
  user_id:      string | null
  started_at:   string
  ended_at:     string | null
  total_scans:  number
  device_type:  DeviceType | null
  session_type: SessionType | null
}

export interface ScannerSessionInsert {
  id?:          string
  user_id:      string
  started_at?:  string
  ended_at?:    string | null
  total_scans?: number
  device_type?: DeviceType | null
  session_type?: SessionType | null
}

export type ScannerSessionUpdate = Partial<ScannerSessionInsert>

// ═══════════════════════════════════════════════════════════════
// FUNCTION RETURN TYPES
// ═══════════════════════════════════════════════════════════════

export interface UserScanStats {
  total_scans:       number
  avg_freshness:     number
  most_scanned_food: string | null
  high_risk_count:   number
}

export interface ExpiringListing {
  listing_id:          string
  food_type:           string | null
  freshness_score:     number | null
  risk_level:          ScanRiskLevel | null
  expiry_at:           string
  suggested_price_min: number | null
  suggested_price_max: number | null
}

// ═══════════════════════════════════════════════════════════════
// DATABASE TYPE (Supabase client generic)
// ═══════════════════════════════════════════════════════════════

export interface Database {
  public: {
    Tables: {
      scan_results: {
        Row:    ScanResultRow
        Insert: ScanResultInsert
        Update: ScanResultUpdate
      }
      scanner_sessions: {
        Row:    ScannerSessionRow
        Insert: ScannerSessionInsert
        Update: ScannerSessionUpdate
      }
    }
    Functions: {
      get_user_scan_stats: {
        Args:    { p_user_id: string }
        Returns: UserScanStats[]
      }
      get_expiring_soon_listings: {
        Args:    { p_hours?: number }
        Returns: ExpiringListing[]
      }
    }
  }
}
