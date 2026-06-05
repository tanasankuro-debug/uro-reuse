import { useEffect } from 'react'
import { Button, Spin } from 'antd'
import {
  FiCamera,
  FiCameraOff,
  FiRefreshCw,
  FiZap,
  FiZapOff,
} from 'react-icons/fi'
import { MdFlipCameraAndroid } from 'react-icons/md'
import { useCamera } from '../../hooks/useCamera'
import { useScanner } from '../../hooks/useScanner'

/**
 * CameraView — video feed with scanner overlay and controls
 * Props:
 *   onResult(result)  — called every time Gemini returns a result
 *   onError(msg)      — called on scan error
 *   autoStart         — open camera immediately on mount
 *   showFlip          — show camera flip button (mobile)
 */
export default function CameraView({ onResult, onError, autoStart = false, showFlip = true }) {
  const camera = useCamera()
  const scanner = useScanner({
    captureFrame: camera.captureFrame,
    onResult,
    onError,
  })

  useEffect(() => {
    if (autoStart) camera.startCamera()
  }, []) // eslint-disable-line

  const handleToggleCamera = () => {
    if (camera.isActive) {
      scanner.stopAutoScan()
      camera.stopCamera()
    } else {
      camera.startCamera()
    }
  }

  const handleToggleAutoScan = () => {
    if (scanner.isAutoScanning) {
      scanner.stopAutoScan()
    } else {
      if (!camera.isActive) return
      scanner.startAutoScan()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Video container */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video w-full shadow-xl">
        <video
          ref={camera.videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Overlay: camera off state */}
        {!camera.isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900">
            <FiCameraOff className="text-gray-400 text-5xl" />
            <p className="text-gray-400 text-sm">กล้องปิดอยู่</p>
            {camera.error && (
              <p className="text-red-400 text-xs text-center px-4">{camera.error}</p>
            )}
          </div>
        )}

        {/* Overlay: scanner frame when active */}
        {camera.isActive && (
          <>
            {/* Corner brackets */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-56">
                {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map(
                  (pos, i) => (
                    <span
                      key={i}
                      className={`absolute w-8 h-8 border-green-400 ${pos} ${
                        i < 2 ? 'border-t-2' : 'border-b-2'
                      } ${i % 2 === 0 ? 'border-l-2' : 'border-r-2'}`}
                    />
                  )
                )}
              </div>
            </div>

            {/* Scan line */}
            {scanner.isAutoScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="relative w-56 h-56 overflow-hidden">
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-green-400 opacity-80 scan-line"
                    style={{ boxShadow: '0 0 8px #22c55e' }}
                  />
                </div>
              </div>
            )}

            {/* Status badge */}
            <div className="absolute top-3 left-3">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  scanner.isAutoScanning
                    ? 'bg-green-500 text-white scan-pulse'
                    : 'bg-black/50 text-white'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    scanner.isAutoScanning ? 'bg-white' : 'bg-gray-400'
                  }`}
                />
                {scanner.isAutoScanning ? 'กำลังสแกน...' : 'กล้องพร้อม'}
              </div>
            </div>

            {/* Scan count */}
            {scanner.scanCount > 0 && (
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                สแกนแล้ว {scanner.scanCount} ครั้ง
              </div>
            )}

            {/* Flip camera */}
            {showFlip && (
              <button
                onClick={camera.flipCamera}
                className="absolute bottom-3 right-3 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <MdFlipCameraAndroid className="text-xl" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          icon={camera.isActive ? <FiCameraOff /> : <FiCamera />}
          onClick={handleToggleCamera}
          className="flex-1"
          type={camera.isActive ? 'default' : 'primary'}
          style={!camera.isActive ? { backgroundColor: '#22c55e', borderColor: '#22c55e' } : {}}
        >
          {camera.isActive ? 'ปิดกล้อง' : 'เปิดกล้อง'}
        </Button>

        <Button
          icon={scanner.isAutoScanning ? <FiZapOff /> : <FiZap />}
          onClick={handleToggleAutoScan}
          disabled={!camera.isActive}
          className="flex-1"
          type={scanner.isAutoScanning ? 'default' : 'primary'}
          danger={scanner.isAutoScanning}
        >
          {scanner.isAutoScanning ? 'หยุดสแกน' : 'สแกนอัตโนมัติ'}
        </Button>

        <Button
          icon={<FiRefreshCw />}
          onClick={() => scanner.scan()}
          disabled={!camera.isActive}
          title="สแกนครั้งเดียว"
        />
      </div>
    </div>
  )
}
