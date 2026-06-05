import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, message as antMessage } from 'antd'
import { FiCamera, FiActivity, FiClock } from 'react-icons/fi'
import FoodCameraScanner from '../components/scanner/FoodCameraScanner'
import ScanResultDashboard from '../components/scanner/ScanResultDashboard'
import ScanResultCard from '../components/scanner/ScanResultCard'
import { useFoodScanner } from '../hooks/useFoodScanner'
import { useApp } from '../store/useAppStore'

export default function ScannerPage() {
  const { actions } = useApp()
  const navigate = useNavigate()

  const {
    scanResult,
    isLoading,
    error,
    scanHistory,
    scanCount,
    rateLimit,
    analyzeImage,
    clearResult,
    saveToProfile,
    retryLastScan,
  } = useFoodScanner()

  // กล้องส่งภาพมา → วิเคราะห์
  const handleFrame = useCallback(
    async (base64) => {
      const result = await analyzeImage(base64)
      if (result) {
        actions.setScanResult(result)
      }
    },
    [analyzeImage, actions]
  )

  // ไปหน้าขาย พร้อมผลสแกน
  const handlePostSell = useCallback(
    (result) => {
      actions.setScanResult(result)
      navigate('/sell')
    },
    [actions, navigate]
  )

  // บันทึกลง Supabase
  const handleSave = useCallback(async () => {
    const ok = await saveToProfile()
    if (ok) {
      void antMessage.success('บันทึกผลสแกนแล้ว!')
    } else {
      void antMessage.warning('กรุณาล็อกอินก่อนบันทึก')
    }
  }, [saveToProfile])

  // เลือก item ใน history → แสดงผล
  const handleSelectHistory = useCallback(
    (item) => {
      actions.setScanResult(item)
    },
    [actions]
  )

  const tabs = [
    {
      key: 'scan',
      label: (
        <span className="flex items-center gap-1.5">
          <FiCamera /> สแกน
        </span>
      ),
      children: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          {/* ─── LEFT: Camera ─────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-green-100 dark:border-green-900">
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <FiActivity className="text-green-500" />
                กล้อง AI Scanner
              </h3>
              <FoodCameraScanner
                onFrameCaptured={handleFrame}
                isAnalyzing={isLoading}
                scanInterval={2000}
                onError={(msg) => void msg}
                showFlipButton
                showUploadButton
              />
            </div>

            {/* Rate limit indicator */}
            {rateLimit.used > 20 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
                <p className="text-orange-700 dark:text-orange-400 text-xs font-semibold">
                  ⚠️ ใช้งาน {rateLimit.used}/{rateLimit.limit} ครั้ง/นาที
                </p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-900">
              <p className="text-green-700 dark:text-green-400 text-sm font-semibold mb-2">
                💡 เคล็ดลับการสแกน
              </p>
              <ul className="text-green-600 dark:text-green-300 text-xs space-y-1">
                <li>• จัดแสงให้เพียงพอ เห็นอาหารชัดเจน</li>
                <li>• วางอาหารให้อยู่ในกรอบสีเขียว</li>
                <li>• กด "สแกนอัตโนมัติ" วิเคราะห์ทุก 2 วินาที</li>
                <li>• ไม่มีกล้อง? ใช้ปุ่มอัปโหลดรูปแทน</li>
              </ul>
            </div>
          </div>

          {/* ─── RIGHT: Result Dashboard ───────────────────────── */}
          <div>
            <ScanResultDashboard
              result={scanResult}
              isLoading={isLoading}
              error={error}
              scanHistory={scanHistory}
              onPostSell={handlePostSell}
              onSave={handleSave}
              onRescan={clearResult}
              onSelectHistory={handleSelectHistory}
              onUsePriceSuggestion={(min, max) => {
                // ใช้ใน SellPage ผ่าน setScanResult ที่มี suggested_price_thb อยู่แล้ว
                void antMessage.info(`ราคาแนะนำ ฿${min}–฿${max}/100g ถูกเลือกแล้ว`)
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span className="flex items-center gap-1.5">
          <FiClock /> ประวัติ ({scanHistory.length})
        </span>
      ),
      children: (
        <div className="pt-4 space-y-3">
          {scanHistory.length === 0 ? (
            <div className="text-center py-14 text-gray-400 dark:text-gray-500 text-sm">
              ยังไม่มีประวัติการสแกน
            </div>
          ) : (
            scanHistory.map((item) => (
              <ScanResultCard
                key={item.id}
                result={item}
                compact
                onSave={() => {
                  actions.setScanResult(item)
                  void saveToProfile()
                }}
                onAddToListing={(r) => {
                  actions.setScanResult(r)
                  navigate('/sell')
                }}
              />
            ))
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-md shadow-green-200">
            <FiCamera className="text-white text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
              สแกนอาหาร AI
            </h1>
            <p className="text-green-600 dark:text-green-400 text-sm">
              Real-Time Food Scanner — Gemini 1.5 Flash
            </p>
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg">
          วิเคราะห์ความสด ความเสี่ยง โภชนาการ และราคาอัตโนมัติ
          {scanCount > 0 && (
            <span className="ml-2 text-green-600 dark:text-green-400 font-semibold">
              · สแกนแล้ว {scanCount} ครั้ง
            </span>
          )}
        </p>
      </div>

      <Tabs items={tabs} />
    </div>
  )
}
