import React from 'react'
import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { SensorReadings } from '../../types/telemetry'

// ─── SVG Arc Gauge ──────────────────────────────────────────────────────────
function ArcGauge({ value }: { value: number }) {
  const R = 38, cx = 48, cy = 48, stroke = 6
  const startAngle = 135, totalArc = 270
  const circumference = (Math.PI * 2 * R * totalArc) / 360
  const filled = circumference * (value / 100)

  const polarToXY = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) }
  }
  const makeArc = (sweep: number) => {
    const end = polarToXY(startAngle + sweep)
    const start = polarToXY(startAngle)
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y}`
  }

  const color = value >= 80 ? '#22c55e' : value >= 50 ? '#fbbf24' : '#ef4444'

  return (
    <svg width="96" height="72" viewBox="0 0 96 80">
      <path d={makeArc(totalArc)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} strokeLinecap="round" />
      <motion.path
        d={makeArc(totalArc)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - filled }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(113,113,122,0.9)" fontSize="9" fontFamily="Inter, sans-serif">
        % match
      </text>
    </svg>
  )
}

// ─── Sensor row ─────────────────────────────────────────────────────────────
const LABELS: Record<keyof SensorReadings, string> = {
  ph: 'pH', ec: 'EC', water_temp: 'Water T', air_temp: 'Air T',
  humidity: 'Humidity', water_level: 'Reservoir', light_intensity: 'Light', dissolved_oxygen: 'DO₂',
}

function MatchRow({ label, score }: { label: string; score: number }) {
  const bar   = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-500'
  const text  = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-500 w-14 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-mono w-8 text-right shrink-0 ${text}`}>{score}%</span>
    </div>
  )
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  overallMatch: number
  recipeMatch:  Partial<Record<keyof SensorReadings, number>>
}

// ─── Component ──────────────────────────────────────────────────────────────
export function RecipeMatch({ overallMatch, recipeMatch }: Props) {
  const stateLabel =
    overallMatch >= 80 ? 'Golden State' :
    overallMatch >= 50 ? 'Near Optimal' :
                         'Out of Spec'
  const stateColor =
    overallMatch >= 80 ? 'text-green-400' :
    overallMatch >= 50 ? 'text-amber-400' :
                         'text-red-400'

  return (
    <div className="lp-section">
      <div className="lp-section-hd">
        <div className="flex items-center gap-1.5">
          <Target size={12} className="text-zinc-600" />
          <span className="lp-section-title">Recipe Match</span>
        </div>
        <span className={`text-xs font-medium ${stateColor}`}>{stateLabel}</span>
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className="flex items-center justify-center mb-3">
          <ArcGauge value={overallMatch} />
        </div>
        <div className="space-y-1.5">
          {(Object.keys(LABELS) as (keyof SensorReadings)[]).map(key => (
            <MatchRow key={key} label={LABELS[key]} score={recipeMatch[key] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  )
}
