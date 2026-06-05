import React from 'react'
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi'
import { Link } from 'react-router-dom'

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Props {
  children: React.ReactNode
  /** Called after user clicks "ลองใหม่" and boundary resets */
  onReset?: () => void
  /** Optional custom fallback — replaces the default error screen */
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK UI (functional)
// ═══════════════════════════════════════════════════════════════

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null
  onReset: () => void
}) {
  const isDev = typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 space-y-6 text-center">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center">
            <FiAlertTriangle className="text-3xl text-red-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Scanner เกิดข้อผิดพลาด
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบสแกน
            <br />
            กรุณาลองใหม่ หรือรีเฟรชหน้าเว็บ
          </p>
        </div>

        {/* Dev-only: show error details */}
        {isDev && error && (
          <details className="text-left bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900 rounded-xl p-3">
            <summary className="text-xs font-mono text-red-600 dark:text-red-400 cursor-pointer select-none">
              {error.name}: {error.message.slice(0, 80)}
            </summary>
            <pre className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 overflow-auto max-h-32 whitespace-pre-wrap leading-relaxed">
              {error.stack}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onReset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
          >
            <FiRefreshCw />
            ลองใหม่
          </button>
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors no-underline"
          >
            <FiHome />
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY (class component — required by React)
// ═══════════════════════════════════════════════════════════════

export default class ScannerErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })
    // In production this could forward to Sentry / LogRocket etc.
    if (import.meta.env.DEV) {
      console.error('[ScannerErrorBoundary] caught:', error, errorInfo.componentStack)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    // Custom fallback takes priority
    if (this.props.fallback) {
      return this.props.fallback
    }

    return (
      <ErrorFallback
        error={this.state.error}
        onReset={this.handleReset}
      />
    )
  }
}
