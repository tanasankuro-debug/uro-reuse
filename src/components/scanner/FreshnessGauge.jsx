import { getFreshnessLabel } from '../../lib/gemini-food-analyzer'

/**
 * Circular SVG gauge showing freshness score 0–100
 */
export default function FreshnessGauge({ score = 0, size = 140 }) {
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const filled = ((100 - score) / 100) * circumference
  const { label, color } = getFreshnessLabel(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={10}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={filled}
          className="score-ring"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>

      {/* Center text */}
      <div className="flex flex-col items-center -mt-[calc(50%+20px)] relative z-10" style={{ marginTop: -(size / 2 + 24) }}>
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>

      <p className="text-sm font-semibold mt-1" style={{ color }}>
        {label}
      </p>
    </div>
  )
}
