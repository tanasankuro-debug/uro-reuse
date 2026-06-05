import { supabase } from '../services/supabase'
import type { FoodCategory, RiskLevel } from '../lib/gemini-food-analyzer'

// ── Map Gemini enum → Thai DB category ────────────────────────
export const FOOD_CATEGORY_MAP: Record<FoodCategory, string> = {
  meat:      'เนื้อสัตว์และสัตว์ปีก',
  seafood:   'อาหารทะเล',
  vegetable: 'ผักและผลไม้',
  fruit:     'ผักและผลไม้',
  dairy:     'ผลิตภัณฑ์นม',
  grain:     'เบเกอรี่',
  cooked:    'อาหารปรุงสำเร็จ',
  other:     'อื่นๆ',
}

export interface SimilarListing {
  id: string | number
  name: string
  category: string
  price: number
  freshness_score?: number
  risk_level?: RiskLevel
  seller?: string
  location?: string
  ai_verified: boolean
}

export interface SimilarListingsResult {
  listings: SimilarListing[]
  thaiCategory: string
}

// ── Fallback mock data per Thai category ──────────────────────
const MOCK_BY_CATEGORY: Record<string, SimilarListing[]> = {
  'เนื้อสัตว์และสัตว์ปีก': [
    { id: 'mk1', name: 'เนื้อวัวสด', category: 'เนื้อสัตว์และสัตว์ปีก', price: 180, freshness_score: 82, risk_level: 'LOW', seller: 'ฟาร์มโคดี', location: 'นครราชสีมา', ai_verified: true },
    { id: 'mk2', name: 'ไก่สดทั้งตัว', category: 'เนื้อสัตว์และสัตว์ปีก', price: 65, freshness_score: 50, risk_level: 'MEDIUM', seller: 'ร้านไก่สด', location: 'กรุงเทพ', ai_verified: false },
    { id: 'mk3', name: 'หมูสามชั้น', category: 'เนื้อสัตว์และสัตว์ปีก', price: 95, freshness_score: 70, risk_level: 'LOW', seller: 'ตลาดสด', location: 'เชียงใหม่', ai_verified: false },
    { id: 'mk4', name: 'ไก่อบสมุนไพร', category: 'เนื้อสัตว์และสัตว์ปีก', price: 80, freshness_score: 40, risk_level: 'MEDIUM', seller: 'แม่ค้าตลาด', location: 'ขอนแก่น', ai_verified: false },
  ],
  'อาหารทะเล': [
    { id: 'mk5', name: 'กุ้งแชบ๊วย', category: 'อาหารทะเล', price: 150, freshness_score: 88, risk_level: 'LOW', seller: 'ท่าเรือสด', location: 'สมุทรสาคร', ai_verified: true },
    { id: 'mk6', name: 'ปลาหมึกสด', category: 'อาหารทะเล', price: 120, freshness_score: 75, risk_level: 'LOW', seller: 'ตลาดปลา', location: 'ระยอง', ai_verified: false },
    { id: 'mk7', name: 'ปลาแซลมอน', category: 'อาหารทะเล', price: 280, freshness_score: 45, risk_level: 'MEDIUM', seller: 'ซูเปอร์มาร์เก็ต', location: 'กรุงเทพ', ai_verified: true },
    { id: 'mk8', name: 'หอยแมลงภู่', category: 'อาหารทะเล', price: 90, freshness_score: 60, risk_level: 'LOW', seller: 'ฟาร์มหอย', location: 'ชลบุรี', ai_verified: false },
  ],
  'ผักและผลไม้': [
    { id: 'mk9', name: 'มะเขือเทศออร์แกนิค', category: 'ผักและผลไม้', price: 30, freshness_score: 78, risk_level: 'LOW', seller: 'สวนเขียว', location: 'กรุงเทพ', ai_verified: true },
    { id: 'mk10', name: 'กะหล่ำปลีสด', category: 'ผักและผลไม้', price: 20, freshness_score: 62, risk_level: 'LOW', seller: 'ตลาดสด', location: 'นนทบุรี', ai_verified: false },
    { id: 'mk11', name: 'แอปเปิ้ลนำเข้า', category: 'ผักและผลไม้', price: 45, freshness_score: 55, risk_level: 'MEDIUM', seller: 'ร้านผลไม้', location: 'สมุทรปราการ', ai_verified: false },
    { id: 'mk12', name: 'ส้มนาเวล', category: 'ผักและผลไม้', price: 35, freshness_score: 70, risk_level: 'LOW', seller: 'สวนผลไม้', location: 'เชียงใหม่', ai_verified: true },
  ],
  'ผลิตภัณฑ์นม': [
    { id: 'mk13', name: 'โยเกิร์ตกรีก', category: 'ผลิตภัณฑ์นม', price: 45, freshness_score: 80, risk_level: 'LOW', seller: 'ซูเปอร์มาร์เก็ต', location: 'กรุงเทพ', ai_verified: false },
    { id: 'mk14', name: 'นมสดพาสเจอร์ไรซ์', category: 'ผลิตภัณฑ์นม', price: 35, freshness_score: 55, risk_level: 'MEDIUM', seller: 'ฟาร์มสด', location: 'เชียงใหม่', ai_verified: true },
    { id: 'mk15', name: 'ชีสสไลด์', category: 'ผลิตภัณฑ์นม', price: 65, freshness_score: 72, risk_level: 'LOW', seller: 'นำเข้า', location: 'กรุงเทพ', ai_verified: false },
  ],
  'เบเกอรี่': [
    { id: 'mk16', name: 'ขนมปังโฮลวีต', category: 'เบเกอรี่', price: 30, freshness_score: 45, risk_level: 'MEDIUM', seller: 'เบเกอรี่ใจดี', location: 'กรุงเทพ', ai_verified: false },
    { id: 'mk17', name: 'ครัวซองต์', category: 'เบเกอรี่', price: 55, freshness_score: 70, risk_level: 'LOW', seller: 'ร้านเพสตรี้', location: 'กรุงเทพ', ai_verified: true },
    { id: 'mk18', name: 'มัฟฟินบลูเบอร์รี่', category: 'เบเกอรี่', price: 40, freshness_score: 60, risk_level: 'LOW', seller: 'โฮมเมด', location: 'เชียงใหม่', ai_verified: false },
  ],
  'อาหารปรุงสำเร็จ': [
    { id: 'mk19', name: 'ข้าวกล่องแม่ค้า', category: 'อาหารปรุงสำเร็จ', price: 40, freshness_score: 55, risk_level: 'MEDIUM', seller: 'แม่ค้าตลาด', location: 'กรุงเทพ', ai_verified: false },
    { id: 'mk20', name: 'สลัดผักสำเร็จรูป', category: 'อาหารปรุงสำเร็จ', price: 65, freshness_score: 72, risk_level: 'LOW', seller: 'ร้านอาหาร', location: 'ภูเก็ต', ai_verified: true },
    { id: 'mk21', name: 'ซุปไก่โฮมเมด', category: 'อาหารปรุงสำเร็จ', price: 80, freshness_score: 48, risk_level: 'MEDIUM', seller: 'ครัวบ้าน', location: 'กรุงเทพ', ai_verified: false },
  ],
}

// ── Main function ──────────────────────────────────────────────
export async function getSimilarListings(
  foodCategory: FoodCategory,
  options: { limit?: number } = {}
): Promise<SimilarListingsResult> {
  const { limit = 8 } = options
  const thaiCategory = FOOD_CATEGORY_MAP[foodCategory] ?? 'อื่นๆ'

  try {
    const { data, error } = await (supabase as any)
      .from('products')
      .select('id, name, category, price, freshness_score, risk_level, location, profiles(full_name)')
      .eq('category', thaiCategory)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data?.length) {
      return { listings: MOCK_BY_CATEGORY[thaiCategory] ?? [], thaiCategory }
    }

    return {
      thaiCategory,
      listings: (data as any[]).map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        price: row.price ?? 0,
        freshness_score: row.freshness_score ?? undefined,
        risk_level: row.risk_level ?? undefined,
        seller: row.profiles?.full_name ?? undefined,
        location: row.location ?? undefined,
        ai_verified: !!row.freshness_score,
      })),
    }
  } catch {
    return { listings: MOCK_BY_CATEGORY[thaiCategory] ?? [], thaiCategory }
  }
}
