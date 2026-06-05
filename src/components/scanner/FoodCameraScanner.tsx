/**
 * FoodCameraScanner.tsx
 * ─────────────────────────────────────────────────────────────────
 * Real-Time Food Scanner สำหรับเว็บ FoodRescue / Fresh Futures
 *
 * ฟีเจอร์:
 *  - เปิดกล้อง getUserMedia (กล้องหน้า/หลัง/Webcam)
 *  - สแกนอาหารอัตโนมัติทุก N วินาที (interval ปรับได้)
 *  - Overlay: corner guides + scan line animation + status badge
 *  - ถ่ายภาพด้วยมือ / อัปโหลดรูปจากเครื่อง
 *  - หยุดสแกนอัตโนมัติเมื่อ tab ไม่ active
 *  - cleanup stream เมื่อ component unmount
 *  - Error message ภาษาไทยทุก case
 * ─────────────────────────────────────────────────────────────────
 */

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  ChangeEvent,
} from 'react'
import { Slider, Tooltip, Upload } from 'antd'
import {
  FiCamera,
  FiCameraOff,
  FiZap,
  FiZapOff,
  FiUpload,
  FiRotateCcw,
  FiAlertCircle,
  FiWifi,
} from 'react-icons/fi'
import { MdFlipCameraAndroid } from 'react-icons/md'

// ─── Types ────────────────────────────────────────────────────────

export interface FoodCameraScannerProps {
  /** Callback รับ base64 JPEG ทุกครั้งที่ดักภาพสำเร็จ */
  onFrameCaptured: (base64Image: string) => void
  /** true เมื่อ Gemini กำลัง analyze อยู่ — ป้องกัน spam request */
  isAnalyzing: boolean
  /** ระยะห่างระหว่างการสแกนแต่ละครั้ง (ms) — default 2000 */
  scanInterval?: number
  /** Callback เมื่อเกิด error */
  onError?: (error: string) => void
  /** แสดงปุ่ม flip camera หรือไม่ — default true */
  showFlipButton?: boolean
  /** ปุ่ม upload รูปจากเครื่อง — default true */
  showUploadButton?: boolean
}

/** facing mode ของกล้อง */
type FacingMode = 'environment' | 'user'

/** สถานะการทำงานของ component */
type CameraStatus =
  | 'idle'           // ยังไม่เปิดกล้อง
  | 'requesting'     // กำลังขอ permission
  | 'active'         // กล้องพร้อม
  | 'scanning'       // กำลังสแกน auto
  | 'error'          // เกิด error
  | 'unsupported'    // browser ไม่รองรับ

// ─── Error Messages (ภาษาไทย) ────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError:
    'ไม่ได้รับอนุญาตให้ใช้กล้อง — กรุณาอนุญาตในการตั้งค่า browser',
  NotFoundError:
    'ไม่พบกล้องในอุปกรณ์นี้ — ลองใช้ฟีเจอร์อัปโหลดรูปแทน',
  NotReadableError:
    'กล้องถูกใช้งานโดยแอปอื่นอยู่ — กรุณาปิดแอปอื่นก่อน',
  OverconstrainedError:
    'กล้องที่เลือกไม่รองรับการตั้งค่านี้ — ลองสลับกล้อง',
  SecurityError:
    'ถูกบล็อกโดย security policy — ต้องใช้งานบน HTTPS เท่านั้น',
  TypeError:
    'เกิดข้อผิดพลาดในการเปิดกล้อง — ลองรีเฟรชหน้าเว็บ',
  UNSUPPORTED:
    'Browser นี้ไม่รองรับการใช้กล้อง — กรุณาใช้ Chrome, Firefox หรือ Safari เวอร์ชันล่าสุด',
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return ERROR_MESSAGES[err.name] ?? `เกิดข้อผิดพลาด: ${err.message}`
  }
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}

// ─── Component ────────────────────────────────────────────────────

export default function FoodCameraScanner({
  onFrameCaptured,
  isAnalyzing,
  scanInterval = 2000,
  onError,
  showFlipButton = true,
  showUploadButton = true,
}: FoodCameraScannerProps) {
  // ── Refs ────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── State ───────────────────────────────────────────────────────
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [captureInterval, setCaptureInterval] = useState(scanInterval)
  const [scanCount, setScanCount] = useState(0)
  const [lastFrameDataUrl, setLastFrameDataUrl] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // ─── ตรวจสอบ Browser support ───────────────────────────────────
  useEffect(() => {
    // ตรวจว่า getUserMedia มีให้ใช้ไหม
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      setErrorMessage(ERROR_MESSAGES.UNSUPPORTED)
      onError?.(ERROR_MESSAGES.UNSUPPORTED)
    }
    // ตรวจว่าเป็นมือถือหรือเปล่า (เพื่อแสดงปุ่ม flip)
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [onError])

  // ─── หยุดสแกนเมื่อ Tab ไม่ active ────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && intervalRef.current) {
        stopAutoScan()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, []) // eslint-disable-line

  // ─── Cleanup เมื่อ unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      stopAutoScan()
      releaseStream()
    }
  }, []) // eslint-disable-line

  // ─── Release stream helper ────────────────────────────────────
  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // ─── เปิดกล้อง ────────────────────────────────────────────────
  const startCamera = useCallback(
    async (mode: FacingMode = facingMode) => {
      if (status === 'unsupported') return

      setStatus('requesting')
      setErrorMessage(null)

      // หยุด stream เก่าก่อนเปิด stream ใหม่
      releaseStream()

      try {
        // ขอ resolution ที่เหมาะสม — fallback ลงมาถ้าไม่ได้
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280, min: 320 },
            height: { ideal: 720, min: 240 },
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // รอให้ metadata โหลดก่อน play
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) return reject()
            videoRef.current.onloadedmetadata = () => resolve()
            videoRef.current.onerror = reject
          })
          await videoRef.current.play()
        }

        setFacingMode(mode)
        setStatus('active')
      } catch (err) {
        const msg = getErrorMessage(err)
        setErrorMessage(msg)
        setStatus('error')
        onError?.(msg)
      }
    },
    [facingMode, releaseStream, onError, status]
  )

  // ─── ปิดกล้อง ─────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    stopAutoScan()
    releaseStream()
    setStatus('idle')
    setScanCount(0)
  }, [releaseStream]) // eslint-disable-line

  // ─── ดักภาพ 1 frame ──────────────────────────────────────────
  const captureFrame = useCallback(
    (quality = 0.8): string | null => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return null

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      // วาด frame ปัจจุบันลง canvas
      ctx.drawImage(video, 0, 0, w, h)
      return canvas.toDataURL('image/jpeg', quality)
    },
    []
  )

  // ─── ส่งภาพออกไป ──────────────────────────────────────────────
  const dispatchFrame = useCallback(() => {
    // ข้ามถ้า Gemini กำลัง analyze อยู่ (ป้องกัน spam)
    if (isAnalyzing) return

    const frame = captureFrame(0.8)
    if (!frame) return

    setLastFrameDataUrl(frame)
    setScanCount((n) => n + 1)
    onFrameCaptured(frame)
  }, [isAnalyzing, captureFrame, onFrameCaptured])

  // ─── เริ่ม Auto-scan loop ──────────────────────────────────────
  const startAutoScan = useCallback(() => {
    if (intervalRef.current) return
    if (!streamRef.current) return

    setStatus('scanning')
    dispatchFrame() // ยิง frame แรกทันที
    intervalRef.current = setInterval(dispatchFrame, captureInterval)
  }, [dispatchFrame, captureInterval])

  // ─── หยุด Auto-scan loop ───────────────────────────────────────
  const stopAutoScan = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // กลับ status เป็น active ถ้ากล้องยังเปิดอยู่
    if (streamRef.current) setStatus('active')
  }, [])

  // ─── Toggle กล้องหน้า/หลัง ────────────────────────────────────
  const flipCamera = useCallback(() => {
    const next: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    stopAutoScan()
    startCamera(next)
  }, [facingMode, startCamera, stopAutoScan])

  // ─── ถ่ายภาพด้วยมือ ───────────────────────────────────────────
  const manualCapture = useCallback(() => {
    if (status !== 'active' && status !== 'scanning') return
    const frame = captureFrame(0.9)
    if (!frame) return
    setLastFrameDataUrl(frame)
    setScanCount((n) => n + 1)
    onFrameCaptured(frame)
  }, [status, captureFrame, onFrameCaptured])

  // ─── อัปโหลดรูปจากเครื่อง ─────────────────────────────────────
  const handleFileUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // ตรวจสอบประเภทไฟล์
      if (!file.type.startsWith('image/')) {
        const msg = 'กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WEBP)'
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      // ตรวจสอบขนาดไฟล์ (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        const msg = 'รูปภาพมีขนาดใหญ่เกินไป (สูงสุด 10MB)'
        setErrorMessage(msg)
        onError?.(msg)
        return
      }

      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        if (!base64) return

        // ปรับขนาดภาพลงก่อนส่ง (ใช้ canvas compress)
        const img = new Image()
        img.onload = () => {
          const canvas = canvasRef.current ?? document.createElement('canvas')
          const MAX = 1280
          const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
          canvas.width = img.width * ratio
          canvas.height = img.height * ratio
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          const compressed = canvas.toDataURL('image/jpeg', 0.8)
          setLastFrameDataUrl(compressed)
          setScanCount((n) => n + 1)
          onFrameCaptured(compressed)
        }
        img.src = base64
      }
      reader.readAsDataURL(file)

      // reset input เพื่อให้เลือกไฟล์เดิมซ้ำได้
      e.target.value = ''
    },
    [onFrameCaptured, onError]
  )

  // ─── อัปเดต interval เมื่อ slider เปลี่ยน ────────────────────
  const handleIntervalChange = useCallback(
    (value: number) => {
      setCaptureInterval(value * 1000)
      // ถ้า auto-scan กำลังทำงาน ให้ restart loop
      if (intervalRef.current) {
        stopAutoScan()
        setTimeout(() => {
          if (streamRef.current) {
            intervalRef.current = setInterval(dispatchFrame, value * 1000)
            setStatus('scanning')
          }
        }, 50)
      }
    },
    [stopAutoScan, dispatchFrame]
  )

  // ─── Derived states ────────────────────────────────────────────
  const isCameraOn = status === 'active' || status === 'scanning'
  const isAutoScanning = status === 'scanning'
  const showControls = status !== 'unsupported'

  // ─── STATUS BADGE config ───────────────────────────────────────
  const statusConfig: Record<CameraStatus, { text: string; color: string; pulse: boolean }> = {
    idle:        { text: 'กล้องปิดอยู่',         color: 'bg-gray-500',  pulse: false },
    requesting:  { text: 'กำลังขอ permission...', color: 'bg-yellow-500', pulse: true  },
    active:      { text: 'กล้องพร้อม',            color: 'bg-blue-500',  pulse: false },
    scanning:    { text: 'กำลังสแกน...',          color: 'bg-green-500', pulse: true  },
    error:       { text: 'เกิดข้อผิดพลาด',        color: 'bg-red-500',   pulse: false },
    unsupported: { text: 'ไม่รองรับ',             color: 'bg-gray-500',  pulse: false },
  }
  const badge = statusConfig[status]

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-4 select-none">

      {/* ── Video Container ──────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 w-full aspect-video shadow-xl">

        {/* Live Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Hidden Canvas (frame capture) */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* ── Idle / Error overlay ───────────────────────── */}
        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/95">
            {status === 'unsupported' ? (
              <>
                <FiWifi className="text-5xl text-gray-500" />
                <p className="text-gray-400 text-sm text-center px-6">
                  {ERROR_MESSAGES.UNSUPPORTED}
                </p>
              </>
            ) : status === 'error' ? (
              <>
                <FiAlertCircle className="text-5xl text-red-400" />
                <p className="text-red-400 text-sm text-center px-6 max-w-xs">
                  {errorMessage}
                </p>
                <button
                  onClick={() => startCamera()}
                  className="flex items-center gap-2 mt-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm hover:bg-red-500/30 transition-colors"
                >
                  <FiRotateCcw /> ลองใหม่
                </button>
              </>
            ) : status === 'requesting' ? (
              <>
                <div className="w-10 h-10 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-yellow-300 text-sm">กำลังขอสิทธิ์ใช้งานกล้อง...</p>
              </>
            ) : (
              <>
                <FiCameraOff className="text-5xl text-gray-500" />
                <p className="text-gray-400 text-sm">กดปุ่มด้านล่างเพื่อเปิดกล้อง</p>
              </>
            )}
          </div>
        )}

        {/* ── Active Overlays ────────────────────────────── */}
        {isCameraOn && (
          <>
            {/* Corner Guide Brackets */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52 sm:w-64 sm:h-64">
                {/* Top-Left */}
                <span className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-green-400 rounded-tl-sm" />
                {/* Top-Right */}
                <span className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-green-400 rounded-tr-sm" />
                {/* Bottom-Left */}
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-green-400 rounded-bl-sm" />
                {/* Bottom-Right */}
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-green-400 rounded-br-sm" />

                {/* Scan Line — วิ่งขึ้น-ลงเฉพาะตอน scanning */}
                {isAutoScanning && (
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div
                      className="absolute left-0 right-0 h-[2px] scan-line"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%)',
                        boxShadow: '0 0 8px #22c55e, 0 0 16px #22c55e40',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Status Badge (top-left) ───────────────── */}
            <div className="absolute top-3 left-3 pointer-events-none">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg ${badge.color} ${badge.pulse ? 'scan-pulse' : ''}`}
              >
                <span
                  className={`w-2 h-2 rounded-full bg-white/80 ${badge.pulse ? 'animate-ping' : ''}`}
                  style={{ animationDuration: '1.5s' }}
                />
                {badge.text}
              </div>
            </div>

            {/* ── Scan Count (top-right) ────────────────── */}
            {scanCount > 0 && (
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
                สแกนแล้ว {scanCount} ครั้ง
              </div>
            )}

            {/* ── Analyzing Indicator ───────────────────── */}
            {isAnalyzing && (
              <div className="absolute bottom-14 left-0 right-0 flex justify-center pointer-events-none">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                  <div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                  Gemini AI กำลังวิเคราะห์...
                </div>
              </div>
            )}

            {/* ── Flip Camera (bottom-right) — mobile only ─ */}
            {showFlipButton && isMobile && (
              <Tooltip title="สลับกล้อง" placement="left">
                <button
                  onClick={flipCamera}
                  className="absolute bottom-3 right-3 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors active:scale-95"
                >
                  <MdFlipCameraAndroid className="text-xl" />
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      {/* ── Controls ─────────────────────────────────────────── */}
      {showControls && (
        <div className="bg-white rounded-2xl p-4 border border-green-100 shadow-sm space-y-4">

          {/* Row 1: Camera on/off + Auto-scan */}
          <div className="flex gap-2">
            {/* เปิด/ปิดกล้อง */}
            <button
              onClick={isCameraOn ? stopCamera : () => startCamera()}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                isCameraOn
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-md shadow-green-200'
              }`}
            >
              {isCameraOn ? (
                <><FiCameraOff className="text-base" /> ปิดกล้อง</>
              ) : (
                <><FiCamera className="text-base" /> เปิดกล้อง</>
              )}
            </button>

            {/* สแกนอัตโนมัติ */}
            <button
              onClick={isAutoScanning ? stopAutoScan : startAutoScan}
              disabled={!isCameraOn}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                isAutoScanning
                  ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-200'
              }`}
            >
              {isAutoScanning ? (
                <><FiZapOff className="text-base" /> หยุดสแกน</>
              ) : (
                <><FiZap className="text-base" /> สแกนอัตโนมัติ</>
              )}
            </button>
          </div>

          {/* Row 2: Manual capture + Flip (desktop) + Upload */}
          <div className="flex gap-2">
            {/* ถ่ายภาพด้วยมือ */}
            <Tooltip title="ถ่ายภาพและวิเคราะห์ 1 ครั้ง">
              <button
                onClick={manualCapture}
                disabled={!isCameraOn}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FiCamera className="text-base" />
                ถ่ายภาพ
              </button>
            </Tooltip>

            {/* Flip camera — desktop */}
            {showFlipButton && !isMobile && (
              <Tooltip title="สลับกล้องหน้า/หลัง">
                <button
                  onClick={flipCamera}
                  disabled={!isCameraOn}
                  className="px-4 flex items-center justify-center bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm hover:bg-purple-100 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MdFlipCameraAndroid className="text-xl" />
                </button>
              </Tooltip>
            )}

            {/* อัปโหลดรูป */}
            {showUploadButton && (
              <>
                <Tooltip title="อัปโหลดรูปภาพจากเครื่อง">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors active:scale-95"
                  >
                    <FiUpload className="text-base" />
                    อัปโหลด
                  </button>
                </Tooltip>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}
          </div>

          {/* Row 3: Scan Interval Slider */}
          <div className="pt-1">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-600">
                ความเร็วสแกน
              </span>
              <span className="text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                ทุก {captureInterval / 1000} วินาที
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              step={1}
              value={captureInterval / 1000}
              onChange={handleIntervalChange}
              tooltip={{ formatter: (v) => `${v}s` }}
              marks={{ 1: '1s', 5: '5s', 10: '10s' }}
              styles={{
                track: { backgroundColor: '#22c55e' },
                handle: { borderColor: '#22c55e' },
              }}
            />
          </div>

          {/* Row 4: Error message */}
          {errorMessage && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <FiAlertCircle className="text-red-500 text-lg mt-0.5 shrink-0" />
              <p className="text-red-700 text-xs leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Last captured preview (thumbnail) ──────────────── */}
      {lastFrameDataUrl && (
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-green-100 shadow-sm">
          <img
            src={lastFrameDataUrl}
            alt="ภาพล่าสุดที่สแกน"
            className="w-14 h-14 object-cover rounded-lg border border-gray-200"
          />
          <div>
            <p className="text-xs font-semibold text-gray-700">ภาพล่าสุดที่วิเคราะห์</p>
            <p className="text-xs text-gray-400">
              {isAnalyzing ? (
                <span className="text-green-500 animate-pulse">กำลังประมวลผล AI...</span>
              ) : (
                'วิเคราะห์เสร็จแล้ว'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
