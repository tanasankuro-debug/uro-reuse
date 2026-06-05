import { Link } from 'react-router-dom'
import { FaLeaf } from 'react-icons/fa'
import { FiFacebook, FiInstagram, FiTwitter } from 'react-icons/fi'
import { APP_NAME } from '../../constants'

export default function Footer() {
  return (
    <footer className="bg-green-900 text-green-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <FaLeaf className="text-white text-lg" />
              </div>
              <span className="font-bold text-xl text-white">{APP_NAME}</span>
            </div>
            <p className="text-green-300 text-sm leading-relaxed max-w-xs">
              แพลตฟอร์มซื้อ-ขายอาหารใกล้หมดอายุ ลดขยะอาหาร สร้างโอกาสให้ทุกคน
              ด้วย AI วิเคราะห์ความสดของอาหารแบบ Real-Time
            </p>
            <div className="flex gap-3 mt-4">
              {[FiFacebook, FiInstagram, FiTwitter].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 bg-green-800 rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors"
                >
                  <Icon className="text-green-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-white mb-3">เมนู</h4>
            <ul className="space-y-2 text-sm text-green-300">
              {[
                ['ตลาดอาหาร', '/marketplace'],
                ['สแกนอาหาร', '/scanner'],
                ['ลงขายสินค้า', '/sell'],
                ['คำสั่งซื้อ', '/orders'],
              ].map(([label, path]) => (
                <li key={path}>
                  <Link to={path} className="hover:text-white transition-colors no-underline text-green-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-3">ติดต่อ</h4>
            <ul className="space-y-2 text-sm text-green-300">
              <li>support@freshfutures.th</li>
              <li>02-xxx-xxxx</li>
              <li>จ-ศ 9:00 - 18:00 น.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-green-400">
          <p>© 2025 {APP_NAME}. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white no-underline text-green-400">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="hover:text-white no-underline text-green-400">เงื่อนไขการใช้งาน</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
