/**
 * ScannerModal.tsx
 * Modal ที่ครอบ FoodCameraScanner + ScanResultDashboard
 * สำหรับใช้ใน SellPage — Seller เปิดสแกนแล้วกด "ใช้ผลนี้"
 */

import { useState, useCallback } from 'react'
import { Modal, Button } from 'antd'
import { FiCamera, FiRefreshCw, FiCheck, FiX } from 'react-icons/fi'
import FoodCameraScanner from './FoodCameraScanner'
import ScanResultDashboard from './ScanResultDashboard'
import { useFoodScanner } from '../../hooks/useFoodScanner'
import { saveScanResult } from '../../lib/scanner-queries'
import { useApp } from '../../store/useAppStore'
import type { FoodAnalysisResult } from '../../lib/gemini-food-analyzer'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ScannerModalProps {
  open:          boolean
  onClose:       () => void
  /** เรียกเมื่อ Seller กด "ใช้ผลนี้" */
  onUseResult:   (result: FoodAnalysisResult, scanId: string | null) => void
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function ScannerModal({ open, onClose, onUseResult }: ScannerModalProps) {
  const { state } = useApp()
  const userId = (state as { user?: { id: string } | null }).user?.id ?? null

  const [saving, setSaving] = useState(false)

  const {
    scanResult,
    isLoading,
    error,
    scanHistory,
    analyzeImage,
    clearResult,
  } = useFoodScanner()

  // ── "ใช้ผลนี้" ────────────────────────────────────────────────
  const handleUseResult = useCallback(async () => {
    if (!scanResult) return
    setSaving(true)

    let scanId: string | null = null
    if (userId) {
      scanId = await saveScanResult(scanResult, userId, { usedFor: 'seller_listing' })
    }

    setSaving(false)
    onUseResult(scanResult, scanId)
    onClose()
  }, [scanResult, userId, onUseResult, onClose])

  const handleRescan  = useCallback(() => clearResult(), [clearResult])
  const handleCapture = useCallback((b64: string) => analyzeImage(b64), [analyzeImage])

  // ── Render ────────────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="min(96vw, 1100px)"
      style={{ top: 16 }}
      styles={{ body: { padding: 0, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      closeIcon={<FiX className="text-gray-500" />}
      title={
        <div className="flex items-center gap-2 py-1">
          <span className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
            <FiCamera className="text-white text-sm" />
          </span>
          <span className="font-bold text-gray-900">สแกนอาหาร AI</span>
          <span className="text-xs text-gray-400 ml-1">— วิเคราะห์แล้วกด "ใช้ผลนี้"</span>
        </div>
      }
    >
      {/* ── Body: 2 columns ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
        {/* Left: Camera */}
        <div className="p-4 lg:border-r border-gray-100 dark:border-gray-700 overflow-y-auto">
          <FoodCameraScanner
            onFrameCaptured={handleCapture}
            isAnalyzing={isLoading}
            scanInterval={3000}
            showFlipButton
            showUploadButton
          />
        </div>

        {/* Right: Result */}
        <div className="p-4 overflow-y-auto max-h-[60vh] lg:max-h-full">
          <ScanResultDashboard
            result={scanResult}
            isLoading={isLoading}
            error={error}
            scanHistory={scanHistory}
            onRescan={handleRescan}
          />
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-400">
          {scanResult
            ? `✓ พบ ${scanResult.food_type} — กด "ใช้ผลนี้" เพื่อกรอกฟอร์มอัตโนมัติ`
            : 'เปิดกล้องแล้วส่องที่อาหาร หรืออัปโหลดรูป'}
        </p>

        <div className="flex gap-2 shrink-0">
          <Button onClick={onClose} size="middle">
            ปิด
          </Button>

          {scanResult && (
            <Button
              onClick={handleRescan}
              icon={<FiRefreshCw />}
              size="middle"
            >
              สแกนใหม่
            </Button>
          )}

          <Button
            type="primary"
            disabled={!scanResult}
            loading={saving}
            icon={<FiCheck />}
            onClick={handleUseResult}
            size="middle"
            style={{ backgroundColor: '#22c55e', borderColor: '#22c55e' }}
          >
            ใช้ผลนี้
          </Button>
        </div>
      </div>
    </Modal>
  )
}
