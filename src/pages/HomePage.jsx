import { Link } from 'react-router-dom'
import { Button, Statistic } from 'antd'
import { FiCamera, FiShoppingBag, FiTrendingUp, FiShield } from 'react-icons/fi'
import { FaLeaf } from 'react-icons/fa'
import { MdFoodBank } from 'react-icons/md'

const stats = [
  { title: 'อาหารที่ช่วยได้', value: 12480, suffix: 'kg', color: '#22c55e' },
  { title: 'ผู้ใช้งาน', value: 3200, suffix: '+', color: '#3b82f6' },
  { title: 'สินค้าปัจจุบัน', value: 580, suffix: 'รายการ', color: '#f97316' },
  { title: 'CO₂ ลดได้', value: 18720, suffix: 'kg', color: '#8b5cf6' },
]

const features = [
  {
    icon: <FiCamera className="text-3xl text-green-500" />,
    title: 'AI สแกนอาหาร Real-Time',
    desc: 'วิเคราะห์ความสดของอาหารด้วย Gemini Vision API ทันทีผ่านกล้อง',
    bg: 'bg-green-50',
  },
  {
    icon: <FiShoppingBag className="text-3xl text-blue-500" />,
    title: 'ตลาดอาหารใกล้หมดอายุ',
    desc: 'ซื้อ-ขายอาหารสดคุณภาพดีในราคาประหยัด ลดขยะอาหาร',
    bg: 'bg-blue-50',
  },
  {
    icon: <FiShield className="text-3xl text-orange-500" />,
    title: 'ความปลอดภัยมาก่อน',
    desc: 'ระบบประเมินความเสี่ยง LOW / MEDIUM / HIGH ก่อนทุกการตัดสินใจ',
    bg: 'bg-orange-50',
  },
  {
    icon: <FiTrendingUp className="text-3xl text-purple-500" />,
    title: 'ราคาอัตโนมัติ',
    desc: 'AI แนะนำราคาที่เหมาะสมตามความสดและความใกล้หมดอายุ',
    bg: 'bg-purple-50',
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <FaLeaf className="text-2xl" />
              <span className="text-green-200 font-medium">Fresh Futures × FoodRescue</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
              ลดขยะอาหาร
              <br />
              <span className="text-green-200">ต่อชีวิตอาหาร</span>
            </h1>
            <p className="text-green-100 text-lg mb-8 leading-relaxed">
              Marketplace ซื้อ-ขายอาหารใกล้หมดอายุ พร้อม AI วิเคราะห์ความสดแบบ Real-Time
              ช่วยให้คุณตัดสินใจซื้อ-ขายได้อย่างมั่นใจ
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/scanner">
                <Button
                  size="large"
                  icon={<FiCamera />}
                  className="!bg-white !text-green-700 !border-white hover:!bg-green-50 font-semibold flex items-center gap-2"
                >
                  สแกนอาหาร AI
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button
                  size="large"
                  icon={<FiShoppingBag />}
                  className="!bg-green-400/20 !text-white !border-white/40 hover:!bg-green-400/30 font-semibold flex items-center gap-2"
                >
                  เข้าตลาด
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.title} className="text-center">
                <Statistic
                  value={s.value}
                  suffix={<span className="text-sm">{s.suffix}</span>}
                  valueStyle={{ color: s.color, fontWeight: 700, fontSize: 28 }}
                />
                <p className="text-gray-500 text-sm mt-1">{s.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">ฟีเจอร์เด่น</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            เทคโนโลยีที่ช่วยให้การซื้อ-ขายอาหารใกล้หมดอายุ ปลอดภัย ง่าย และมีความหมาย
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className={`${f.bg} rounded-2xl p-6 border border-white shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-1">มีอาหารใกล้หมดอายุ?</h3>
            <p className="text-green-200">สแกนด้วย AI แล้วลงขายได้เลย — ง่าย รวดเร็ว ราคาอัตโนมัติ</p>
          </div>
          <Link to="/sell">
            <Button
              size="large"
              className="!bg-white !text-green-700 !border-white font-bold hover:!bg-green-50"
              icon={<MdFoodBank className="text-xl" />}
            >
              เริ่มขายเลย
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
