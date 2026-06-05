import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Alert, message as antMessage, Tooltip } from 'antd'
import { FiBookmark, FiCheckCircle, FiLogIn } from 'react-icons/fi'
import FoodCameraScanner from '../components/scanner/FoodCameraScanner'
import ScanResultDashboard from '../components/scanner/ScanResultDashboard'
import MarketComparison from '../components/scanner/MarketComparison'
import ScanHistory from '../components/scanner/ScanHistory'
import ScannerTips from '../components/scanner/ScannerTips'
import { useFoodScanner } from '../hooks/useFoodScanner'
import { useApp } from '../store/useAppStore'

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function BuyerScannerPage() {
  const { state } = useApp()
  const isLoggedIn = !!(state as { user?: { id: string } | null }).user

  const {
    scanResult,
    isLoading,
    error,
    scanHistory,
    analyzeImage,
    clearResult,
    saveToProfile,
    rateLimit,
  } = useFoodScanner()

  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  // ── SEO ───────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.title
    document.title = 'Food Scanner — ตรวจสอบอาหารด้วย AI | Fresh Futures'

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = metaDesc?.content ?? ''
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content =
      'ส่องกล้องที่อาหาร AI วิเคราะห์ความสด ราคาเหมาะสม และความปลอดภัย ฟรี ไม่ต้องสมัครสมาชิก'

    return () => {
      document.title = prev
      if (metaDesc) metaDesc.content = prevDesc
    }
  }, [])

  // ── Reset saved when result changes ──────────────────────────
  useEffect(() => { setSaved(false) }, [scanResult])

  // ── Save handler ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!scanResult) return
    setSaving(true)
    const ok = await saveToProfile()
    setSaving(false)
    if (ok) {
      setSaved(true)
      antMessage.success('บันทึกผลเรียบร้อย')
    } else {
      antMessage.error('บันทึกไม่สำเร็จ — กรุณาลองอีกครั้ง')
    }
  }

  const showRateWarning = rateLimit.used >= 20

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          🔬 Food Scanner
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400">
          ส่องกล้องที่อาหาร เราบอกได้ว่าสดไหม คุ้มไหม
        </p>

        {/* Guest login banner */}
        {!isLoggedIn && (
          <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-5 py-3 text-sm">
            <FiLogIn className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-700 dark:text-amber-300">
              เข้าสู่ระบบเพื่อบันทึกผลและดูประวัติการสแกน
            </span>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="font-bold text-green-600 dark:text-green-400 hover:underline"
              >
                เข้าสู่ระบบ
              </Link>
              <span className="text-gray-400">·</span>
              <Link
                to="/register"
                className="font-bold text-green-600 dark:text-green-400 hover:underline"
              >
                สมัครสมาชิก
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Scanner — 2 columns ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Left: Camera */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
          <FoodCameraScanner
            onFrameCaptured={analyzeImage}
            isAnalyzing={isLoading}
            scanInterval={3000}
            showFlipButton
            showUploadButton
          />
        </div>

        {/* Right: Result + actions */}
        <div className="space-y-4">
          <ScanResultDashboard
            result={scanResult}
            isLoading={isLoading}
            error={error}
            scanHistory={scanHistory}
            onRescan={clearResult}
          />

          {/* Save / CTA */}
          {scanResult && (
            <div className="flex flex-wrap gap-3 pt-1">
              {isLoggedIn ? (
                <Button
                  type="primary"
                  icon={saved ? <FiCheckCircle /> : <FiBookmark />}
                  loading={saving}
                  disabled={saved}
                  onClick={handleSave}
                  style={
                    saved
                      ? { backgroundColor: '#22c55e', borderColor: '#22c55e' }
                      : undefined
                  }
                >
                  {saved ? 'บันทึกแล้ว ✓' : 'บันทึกผลไว้ในประวัติ'}
                </Button>
              ) : (
                <Tooltip title="ต้องเข้าสู่ระบบก่อนบันทึก">
                  <Link to="/login">
                    <Button icon={<FiBookmark />}>
                      เข้าสู่ระบบเพื่อบันทึก
                    </Button>
                  </Link>
                </Tooltip>
              )}
            </div>
          )}

          {/* Rate limit warning */}
          {showRateWarning && (
            <Alert
              type="warning"
              showIcon
              message={`ใช้ AI ไปแล้ว ${rateLimit.used}/${rateLimit.limit} ครั้ง`}
              description="โควต้าจะรีเซ็ตใน 1 ชั่วโมง"
              className="text-sm"
            />
          )}
        </div>
      </div>

      {/* ── Market Comparison (login + has result) ───────────────── */}
      {isLoggedIn && scanResult?.food_category && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <MarketComparison
            foodCategory={scanResult.food_category}
            aiSuggestedMin={scanResult.suggested_price_thb?.min ?? 0}
            aiSuggestedMax={scanResult.suggested_price_thb?.max ?? 0}
          />
        </div>
      )}

      {/* ── Scan History (login only) ────────────────────────────── */}
      {isLoggedIn && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <ScanHistory history={scanHistory} isLoggedIn={isLoggedIn} />
        </div>
      )}

      {/* ── Tips (always visible) ────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <ScannerTips />
      </div>

    </div>
  )
}
