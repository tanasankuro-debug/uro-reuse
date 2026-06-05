export const APP_NAME = 'Fresh Futures'
export const APP_TAGLINE = 'ลดขยะอาหาร ต่อชีวิตอาหาร'

export const SCAN_INTERVAL_MS = 2000

export const RISK_LEVEL = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
}

export const RISK_COLOR = {
  LOW: '#22c55e',
  MEDIUM: '#f97316',
  HIGH: '#ef4444',
}

export const RISK_LABEL_TH = {
  LOW: 'ความเสี่ยงต่ำ',
  MEDIUM: 'ความเสี่ยงปานกลาง',
  HIGH: 'ความเสี่ยงสูง',
}

export const FRESHNESS_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 20,
}

export const FRESHNESS_LABEL = (score) => {
  if (score >= 80) return { label: 'สดมาก', color: '#22c55e' }
  if (score >= 60) return { label: 'สดดี', color: '#84cc16' }
  if (score >= 40) return { label: 'พอใช้', color: '#f97316' }
  if (score >= 20) return { label: 'ใกล้หมด', color: '#ef4444' }
  return { label: 'เสียแล้ว', color: '#7f1d1d' }
}

export const FOOD_CATEGORIES = [
  'ผักและผลไม้',
  'เนื้อสัตว์และสัตว์ปีก',
  'อาหารทะเล',
  'ผลิตภัณฑ์นม',
  'เบเกอรี่',
  'อาหารปรุงสำเร็จ',
  'เครื่องดื่ม',
  'ขนมและของหวาน',
  'อื่นๆ',
]

export const CAMERA_CONSTRAINTS = {
  BACK: { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
  FRONT: { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } },
}

export const ROUTES = {
  HOME: '/',
  MARKETPLACE: '/marketplace',
  SCANNER: '/scanner',
  SELL: '/sell',
  PRODUCT: '/product/:id',
  LOGIN: '/login',
  REGISTER: '/register',
  PROFILE: '/profile',
  ORDERS: '/orders',
}
