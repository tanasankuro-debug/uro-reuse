import { Collapse } from 'antd'
import type { CollapseProps } from 'antd'
import { FiCamera, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi'

// ═══════════════════════════════════════════════════════════════
// TIP ITEMS
// ═══════════════════════════════════════════════════════════════

function TipList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((tip, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="text-green-500 mt-0.5 shrink-0">•</span>
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  )
}

function WarnList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="text-orange-400 mt-0.5 shrink-0">⚠</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════════
// PANEL CONTENT
// ═══════════════════════════════════════════════════════════════

const SCAN_TIPS = [
  'ส่องกล้องในที่มีแสงสว่างเพียงพอ — แสงธรรมชาติหรือไฟฟ้าสีขาว',
  'วางอาหารบนพื้นหลังสว่าง (จาน/กระดาษขาว) เพื่อให้ AI แยกแยะได้ง่าย',
  'ถ่ายในระยะ 20–40 cm ให้เห็นอาหารชัดเจน ไม่ใกล้/ไกลเกินไป',
  'หันอาหารให้เห็นส่วนที่เสี่ยงที่สุด เช่น จุดช้ำ, รอยดำ, ขอบเขียว',
  'ถ้าผลดูผิดปกติ — กด "สแกนใหม่" แล้วลองปรับมุมกล้อง',
  'สำหรับเนื้อสัตว์และปลา: ให้เห็นสีเนื้อ ไม่ถ่ายผ่านบรรจุภัณฑ์ถ้าเป็นไปได้',
]

const ACCURATE_FOODS = [
  '🥦 ผักและผลไม้ — ดีที่สุด AI แม่นยำ 90%+ สำหรับสีและเนื้อสัมผัส',
  '🍞 เบเกอรี่ — แม่นสำหรับสี, ราและจุดดำ',
  '🐟 ปลาและอาหารทะเล — ดีสำหรับความสดของตา, เกล็ด, สี',
  '🥛 ผลิตภัณฑ์นม — แม่นสำหรับสีผิวนอกและเชื้อรา',
  '🍖 เนื้อสัตว์ — ดีสำหรับสีและกลิ่น (บางส่วน)',
]

const LIMITATIONS = [
  'AI ไม่สามารถดมกลิ่นได้ — อาหารที่เสียเพราะกลิ่นอาจได้คะแนนสูงกว่าความเป็นจริง',
  'อาหารบรรจุกล่อง/ขวด — AI วิเคราะห์แพ็กเกจจิ้ง ไม่ใช่อาหารข้างใน',
  'อาหารปรุงสำเร็จ — ความสดขึ้นกับส่วนผสมหลาย ชั้น AI อาจไม่แม่น 100%',
  'แสงสีเหลืองหรือสีแดง — อาจทำให้ AI ประเมินสีอาหารผิดได้',
  'ผลเป็นเพียงคำแนะนำ ไม่ใช่คำสั่งจากผู้เชี่ยวชาญด้านอาหาร',
  'ใช้วิจารณญาณของคุณเองร่วมกับผล AI เสมอ',
]

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ScannerTips() {
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: (
        <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
          <FiCamera className="text-green-500" />
          วิธีส่องกล้องให้ได้ผลดีที่สุด
        </div>
      ),
      children: <TipList items={SCAN_TIPS} />,
    },
    {
      key: '2',
      label: (
        <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
          <FiCheckCircle className="text-green-500" />
          ประเภทอาหารที่ AI วิเคราะห์ได้แม่นยำ
        </div>
      ),
      children: <TipList items={ACCURATE_FOODS} />,
    },
    {
      key: '3',
      label: (
        <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
          <FiAlertTriangle className="text-orange-400" />
          ข้อจำกัดของ AI ที่ควรทราบ
        </div>
      ),
      children: <WarnList items={LIMITATIONS} />,
    },
  ]

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        💡 เคล็ดลับการใช้งาน
      </h2>
      <Collapse
        items={items}
        defaultActiveKey={['1']}
        bordered={false}
        className="bg-transparent"
      />
    </div>
  )
}
