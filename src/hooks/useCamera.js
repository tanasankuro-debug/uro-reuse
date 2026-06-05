import { useRef, useState, useCallback, useEffect } from 'react'
import { CAMERA_CONSTRAINTS } from '../constants'

/**
 * useCamera — manages webcam / mobile camera lifecycle
 * Returns videoRef to attach to <video>, plus controls and snapshot utility
 */
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [error, setError] = useState(null)
  const [hasPermission, setHasPermission] = useState(null)

  // ── Start camera ────────────────────────────────────────────
  const startCamera = useCallback(async (mode = facingMode) => {
    setError(null)
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      const constraints =
        mode === 'environment' ? CAMERA_CONSTRAINTS.BACK : CAMERA_CONSTRAINTS.FRONT

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setHasPermission(true)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsActive(true)
      setFacingMode(mode)
    } catch (err) {
      setHasPermission(false)
      if (err.name === 'NotAllowedError') {
        setError('กรุณาอนุญาตการใช้งานกล้อง')
      } else if (err.name === 'NotFoundError') {
        setError('ไม่พบกล้องในอุปกรณ์นี้')
      } else {
        setError('เกิดข้อผิดพลาดในการเปิดกล้อง: ' + err.message)
      }
      setIsActive(false)
    }
  }, [facingMode])

  // ── Stop camera ─────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  // ── Flip camera (mobile) ────────────────────────────────────
  const flipCamera = useCallback(() => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    startCamera(next)
  }, [facingMode, startCamera])

  // ── Capture snapshot as base64 ──────────────────────────────
  const captureFrame = useCallback((quality = 0.85) => {
    if (!videoRef.current || !isActive) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  }, [isActive])

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => () => stopCamera(), [stopCamera])

  return {
    videoRef,
    isActive,
    facingMode,
    error,
    hasPermission,
    startCamera,
    stopCamera,
    flipCamera,
    captureFrame,
  }
}
