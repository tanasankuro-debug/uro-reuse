import { FiCameraOff, FiUpload, FiRefreshCw, FiWifi, FiAlertTriangle, FiMonitor } from 'react-icons/fi'
import type { CameraErrorType, Platform } from '../../../lib/scanner-error-handler'
import { detectPlatform } from '../../../lib/scanner-error-handler'

// ═══════════════════════════════════════════════════════════════
// PLATFORM-SPECIFIC PERMISSION INSTRUCTIONS
// ═══════════════════════════════════════════════════════════════

const PERMISSION_STEPS: Record<Platform, string[]> = {
  ios_safari: [
    'เปิด "การตั้งค่า" (⚙️ Settings) บน iPhone/iPad',
    'เลื่อนลงหา "Safari" แล้วแตะ',
    'แตะ "กล้อง" (Camera)',
    'เลือก "อนุญาต" (Allow)',
    'กลับมาที่เว็บแล้วกด "ลองใหม่"',
  ],
  ios_chrome: [
    'เปิด "การตั้งค่า" (⚙️ Settings)',
    'เลื่อนหา "Chrome" แล้วแตะ',
    'แตะ "กล้อง" → เปิดสลับ',
    'กลับมาที่ Chrome แล้วรีเฟรชหน้า',
  ],
  android_chrome: [
    'แตะจุดสามจุด (⋮) มุมบนขวาของ Chrome',
    'เลือก "การตั้งค่า" → "การตั้งค่าเว็บไซต์"',
    'แตะ "กล้อง"',
    'ค้นหาเว็บไซต์นี้และเลือก "อนุญาต"',
    'กดปุ่ม Back แล้วรีเฟรชหน้า',
  ],
  desktop_chrome: [
    'คลิกไอคอนล็อก (🔒) หรือ (ℹ️) ด้านซ้ายของ URL bar',
    'คลิก "Permissions" หรือ "การอนุญาต"',
    'เปลี่ยน "กล้อง" จาก "บล็อก" เป็น "อนุญาต"',
    'รีเฟรชหน้าเว็บ (Ctrl+R หรือ ⌘+R)',
  ],
  desktop_safari: [
    'คลิก Safari → "Preferences" (⌘+,)',
    'เลือกแท็บ "Websites"',
    'คลิก "Camera" ในแถบซ้าย',
    'ค้นหาเว็บไซต์นี้ → เลือก "Allow"',
    'รีเฟรชหน้าเว็บ',
  ],
  desktop_firefox: [
    'คลิกไอคอนล็อก (🔒) ด้านซ้ายของ URL bar',
    'คลิก "Connection Secure" → "More Information"',
    'เลือกแท็บ "Permissions"',
    'ค้นหา "Use the Camera" และยกเลิกการบล็อก',
    'รีเฟรชหน้าเว็บ',
  ],
  other: [
    'ค้นหาการตั้งค่า Camera ใน browser ของคุณ',
    'อนุญาตให้เว็บไซต์นี้เข้าถึงกล้อง',
    'รีเฟรชหน้าเว็บแล้วลองใหม่',
  ],
}

// ═══════════════════════════════════════════════════════════════
// ERROR CONFIG
// ═══════════════════════════════════════════════════════════════

interface ErrorConfig {
  icon: React.ReactNode
  title: string
  description: string
  bgClass: string
  borderClass: string
  showRetry: boolean
  showUpload: boolean
}

const ERROR_CONFIG: Record<CameraErrorType, ErrorConfig> = {
  permission_denied: {
    icon: <FiCameraOff className="text-4xl text-red-400" />,
    title: 'ไม่ได้รับอนุญาตใช้กล้อง',
    description: 'Browser บล็อกการเข้าถึงกล้อง ทำตามขั้นตอนด้านล่างเพื่อแก้ไข',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
    showRetry: true,
    showUpload: true,
  },
  not_found: {
    icon: <FiCameraOff className="text-4xl text-gray-400" />,
    title: 'ไม่พบกล้องในอุปกรณ์',
    description: 'อุปกรณ์นี้ไม่มีกล้อง หรือ browser ไม่สามารถเข้าถึงได้ ลองอัปโหลดรูปแทน',
    bgClass: 'bg-gray-50 dark:bg-gray-800',
    borderClass: 'border-gray-200 dark:border-gray-700',
    showRetry: false,
    showUpload: true,
  },
  camera_busy: {
    icon: <FiAlertTriangle className="text-4xl text-orange-400" />,
    title: 'กล้องถูกใช้งานอยู่',
    description: 'กล้องกำลังถูกใช้โดย App อื่น ปิด App เหล่านั้นก่อนแล้วลองใหม่',
    bgClass: 'bg-orange-50 dark:bg-orange-900/20',
    borderClass: 'border-orange-200 dark:border-orange-800',
    showRetry: true,
    showUpload: true,
  },
  https_required: {
    icon: <FiWifi className="text-4xl text-blue-400" />,
    title: 'ต้องใช้งานบน HTTPS',
    description: 'การเข้าถึงกล้องต้องใช้การเชื่อมต่อที่ปลอดภัย (HTTPS)',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    showRetry: false,
    showUpload: false,
  },
  unsupported_browser: {
    icon: <FiMonitor className="text-4xl text-purple-400" />,
    title: 'Browser ไม่รองรับ',
    description: 'Browser นี้ไม่รองรับการใช้กล้อง ใช้ browser ที่รองรับหรืออัปโหลดรูปแทน',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
    showRetry: false,
    showUpload: true,
  },
  unknown: {
    icon: <FiAlertTriangle className="text-4xl text-gray-400" />,
    title: 'เกิดข้อผิดพลาดกล้อง',
    description: 'ไม่สามารถเปิดกล้องได้ ลองรีเฟรชหน้าเว็บหรืออัปโหลดรูปแทน',
    bgClass: 'bg-gray-50 dark:bg-gray-800',
    borderClass: 'border-gray-200 dark:border-gray-700',
    showRetry: true,
    showUpload: true,
  },
}

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

export interface CameraErrorProps {
  errorType: CameraErrorType
  onRetry: () => void
  onUpload: () => void
  className?: string
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CameraError({
  errorType,
  onRetry,
  onUpload,
  className = '',
}: CameraErrorProps) {
  const platform = detectPlatform()
  const cfg = ERROR_CONFIG[errorType]
  const steps = PERMISSION_STEPS[platform]

  return (
    <div
      className={`rounded-2xl border p-5 space-y-5 ${cfg.bgClass} ${cfg.borderClass} ${className}`}
      role="alert"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center text-center gap-2">
        {cfg.icon}
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">{cfg.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          {cfg.description}
        </p>
      </div>

      {/* ── Permission Steps ────────────────────────────────────── */}
      {errorType === 'permission_denied' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            วิธีแก้ไข ({platform.replace('_', ' ')})
          </p>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Camera Busy: list likely culprits ───────────────────── */}
      {errorType === 'camera_busy' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            App ที่อาจใช้กล้องอยู่
          </p>
          {['Video call (Zoom, Google Meet, Teams)', 'กล้องถ่ายรูปของระบบ', 'แอปสแกน QR Code', 'Browser tab อื่นที่เปิดกล้อง'].map((item) => (
            <p key={item} className="text-sm text-gray-600 dark:text-gray-300 flex gap-2">
              <span className="text-orange-400 shrink-0">•</span> {item}
            </p>
          ))}
        </div>
      )}

      {/* ── HTTPS: redirect button ───────────────────────────────── */}
      {errorType === 'https_required' && (
        <button
          onClick={() => {
            if (typeof location !== 'undefined') {
              location.href = location.href.replace('http://', 'https://')
            }
          }}
          className="w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors"
        >
          🔒 เปลี่ยนไปใช้ HTTPS อัตโนมัติ
        </button>
      )}

      {/* ── Unsupported Browser: list supported browsers ─────────── */}
      {errorType === 'unsupported_browser' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Browser ที่รองรับ
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {['Chrome 60+', 'Firefox 55+', 'Safari 11+', 'Edge 79+'].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span className="text-green-500">✓</span> {b}
              </div>
            ))}
          </div>
          <p className="text-xs text-red-500">❌ ไม่รองรับ: Internet Explorer ทุกเวอร์ชัน</p>
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {cfg.showRetry && (
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <FiRefreshCw className="text-sm" />
            ลองใหม่
          </button>
        )}
        {cfg.showUpload && (
          <button
            onClick={onUpload}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm"
          >
            <FiUpload className="text-sm" />
            อัปโหลดรูปแทน
          </button>
        )}
      </div>
    </div>
  )
}
