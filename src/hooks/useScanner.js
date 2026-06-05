import { useRef, useState, useCallback, useEffect } from 'react'
import { analyzeFood, mockAnalyzeFood } from '../services/gemini'
import { SCAN_INTERVAL_MS } from '../constants'

/**
 * useScanner — orchestrates the auto-scan loop
 * captureFrame: () => base64 | null  (from useCamera)
 * onResult: (result) => void
 */
export function useScanner({ captureFrame, onResult, onError, autoScan = false }) {
  const intervalRef = useRef(null)
  const isProcessingRef = useRef(false)

  const [isAutoScanning, setIsAutoScanning] = useState(false)
  const [scanCount, setScanCount] = useState(0)
  const [lastCapture, setLastCapture] = useState(null)

  const isDev = !import.meta.env.VITE_GEMINI_API_KEY

  // ── Single scan ─────────────────────────────────────────────
  const scan = useCallback(async () => {
    if (isProcessingRef.current) return
    const frame = captureFrame()
    if (!frame) return

    isProcessingRef.current = true
    setLastCapture(frame)

    try {
      const result = isDev ? await mockAnalyzeFood() : await analyzeFood(frame)
      if (result.error) {
        onError?.(result.error)
      } else {
        onResult?.(result)
        setScanCount((n) => n + 1)
      }
    } catch (err) {
      onError?.(err.message || 'วิเคราะห์ไม่สำเร็จ')
    } finally {
      isProcessingRef.current = false
    }
  }, [captureFrame, onResult, onError, isDev])

  // ── Start auto-scan loop ────────────────────────────────────
  const startAutoScan = useCallback(() => {
    if (intervalRef.current) return
    setIsAutoScanning(true)
    scan() // immediate first scan
    intervalRef.current = setInterval(scan, SCAN_INTERVAL_MS)
  }, [scan])

  // ── Stop auto-scan loop ─────────────────────────────────────
  const stopAutoScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsAutoScanning(false)
  }, [])

  // ── Auto-start if prop passed ───────────────────────────────
  useEffect(() => {
    if (autoScan) startAutoScan()
    return () => stopAutoScan()
  }, [autoScan]) // eslint-disable-line

  // ── Cleanup ─────────────────────────────────────────────────
  useEffect(() => () => stopAutoScan(), [stopAutoScan])

  return {
    scan,
    startAutoScan,
    stopAutoScan,
    isAutoScanning,
    scanCount,
    lastCapture,
  }
}
