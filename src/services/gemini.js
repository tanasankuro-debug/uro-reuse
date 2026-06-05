import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// ── Prompt template ───────────────────────────────────────────
const buildPrompt = () => `
คุณคือ AI วิเคราะห์ความสดของอาหาร ตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

วิเคราะห์ภาพอาหารนี้แล้วตอบในรูปแบบ JSON ต่อไปนี้:

{
  "food_name": "ชื่ออาหาร (ภาษาไทย)",
  "food_name_en": "Food name (English)",
  "category": "หมวดหมู่อาหาร เช่น ผักและผลไม้ / เนื้อสัตว์ / อาหารทะเล / ผลิตภัณฑ์นม / เบเกอรี่ / อาหารปรุงสำเร็จ",
  "freshness_score": 0-100,
  "risk_level": "LOW หรือ MEDIUM หรือ HIGH",
  "expires_in_hours": จำนวนชั่วโมง (ตัวเลข),
  "expires_label": "เช่น '3 วัน' หรือ '12 ชั่วโมง'",
  "recommended_price": ราคาบาท (ตัวเลข),
  "storage_tips": ["เคล็ดลับการเก็บ 1", "เคล็ดลับ 2"],
  "recipes": [
    { "name": "ชื่อสูตร", "time": "เวลาปรุง", "difficulty": "ง่าย/ปานกลาง/ยาก" }
  ],
  "nutrition": {
    "calories": ตัวเลข,
    "protein": ตัวเลขกรัม,
    "carbs": ตัวเลขกรัม,
    "fat": ตัวเลขกรัม,
    "fiber": ตัวเลขกรัม
  },
  "freshness_indicators": {
    "color": "สีปกติ/เปลี่ยนสี",
    "texture": "แน่น/นิ่ม/เหี่ยว",
    "smell_prediction": "ปกติ/เริ่มมีกลิ่น/มีกลิ่นเสีย"
  },
  "ai_confidence": 0-100,
  "analysis_notes": "หมายเหตุเพิ่มเติมจาก AI"
}

ถ้าไม่เห็นอาหารในภาพ ให้ตอบ: { "error": "ไม่พบอาหารในภาพ" }
`

// ── Main analysis function ────────────────────────────────────
export async function analyzeFood(base64Image) {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY not set')

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const imagePart = {
    inlineData: {
      data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
      mimeType: 'image/jpeg',
    },
  }

  const result = await model.generateContent([buildPrompt(), imagePart])
  const text = result.response.text().trim()

  // Strip markdown code fences if present
  const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Gemini returned invalid JSON: ' + text.slice(0, 200))
  }
}

// ── Mock for development (when no API key) ────────────────────
export function mockAnalyzeFood() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        food_name: 'มะเขือเทศ',
        food_name_en: 'Tomato',
        category: 'ผักและผลไม้',
        freshness_score: 72,
        risk_level: 'LOW',
        expires_in_hours: 48,
        expires_label: '2 วัน',
        recommended_price: 25,
        storage_tips: [
          'เก็บในตู้เย็นช่องผัก',
          'ห่อด้วยกระดาษทิชชูก่อนเก็บ',
          'หลีกเลี่ยงการวางใกล้ผลไม้สุก',
        ],
        recipes: [
          { name: 'สลัดมะเขือเทศ', time: '10 นาที', difficulty: 'ง่าย' },
          { name: 'ซุปมะเขือเทศ', time: '30 นาที', difficulty: 'ปานกลาง' },
          { name: 'พิซซ่าโฮมเมด', time: '45 นาที', difficulty: 'ปานกลาง' },
        ],
        nutrition: {
          calories: 18,
          protein: 0.9,
          carbs: 3.9,
          fat: 0.2,
          fiber: 1.2,
        },
        freshness_indicators: {
          color: 'สีแดงสม่ำเสมอ',
          texture: 'แน่น',
          smell_prediction: 'ปกติ',
        },
        ai_confidence: 88,
        analysis_notes: 'มะเขือเทศสดใหม่ เหมาะสำหรับขายในตลาด',
      })
    }, 800)
  })
}
