import React from 'react'
import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { SensorReadings } from '../../types/telemetry'

// ─── SVG Arc Gauge ─────────────────────────────────────────────────────────
function ArcGauge({ value }: { value: number }) {
  const R      = 52
  const cx     = 64
  const cy     = 64
  const stroke = 8
  // 270° arc (135° start → 135° end, going clockwise)
  const startAngle = 135
  const totalArc   = 270
  const circumference = (Math.PI * 2 * R * totalArc) / 360
  const filled     = circumference * (value / 100)

  const polarToXY = (angleDeg: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + R * Math.cos(rad),
      y: cy + R * Math.sin(rad),
    }
  }

  const makeArcPath = (sweep: number) => {
    const endAngle = startAngle + sweep
    const start = polarToXY(startAngle)
    const end   = polarToXY(endAngle)
    const large = sweep > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const color =
    value >= 80 ? '#10b981' :
    value >= 50 ? '#f59e0b' :
                  '#f43f5e'

  return (
    <svg width="96" height="96" viewBox="0 0 128 128">
      {/* Track */}
      <path
        d={makeArcPath(totalArc)}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Filled arc */}
      <motion.path
        d={makeArcPath(totalArc)}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - filled }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        {value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="10">
        % match
      </text>
    </svg>
  )
}

// ─── Sensor row ────────────────────────────────────────────────────────────
const LABELS: Record<keyof SensorReadings, string> = {
  ph:               'pH',
  ec:               'EC',
  water_temp:       'Water T',
  air_temp:         'Air T',
  humidity:         'Humidity',
  water_level:      'Water Lvl',
  light_intensity:  'Light',
  dissolved_oxygen: 'DO₂',
}

function SensorRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-500 w-12 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-[2px] bg-slate-800 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[10px] font-mono w-7 text-right ${
        score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'
      }`}>{score}%</span>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  overallMatch: number
  recipeMatch: Partial<Record<keyof SensorReadings, number>>
}

// ─── Component ───────────────────────────────────────────────────────────────
export function RecipeMatch({ overallMatch, recipeMatch }: Props) {
  const label =
    overallMatch >= 80 ? 'GOLDEN STATE' :
    overallMatch >= 50 ? 'NEAR OPTIMAL' :
                         'OUT OF SPEC'

  const labelColor =
    overallMatch >= 80 ? 'text-emerald-400' :
    overallMatch >= 50 ? 'text-amber-400'   :
                         'text-rose-400'

  return (
    <section>
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 h-7 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-1.5">
          <Target size={10} className="text-slate-600" />
          <span className="text-[9px] font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">Recipe Match</span>
        </div>
        <span className={`text-[9px] font-mono font-bold tracking-[0.12em] ${labelColor}`}>{label}</span>
      </div>

      <div className="p-3">
        {/* Gauge */}
        <div className="flex items-center justify-center mb-2">
          <ArcGauge value={overallMatch} />
        </div>

        {/* Per-sensor breakdown */}
        <div className="space-y-1">
          {(Object.keys(LABELS) as (keyof SensorReadings)[]).map(key => (
            <SensorRow
              key={key}
              label={LABELS[key]}
              score={recipeMatch[key] ?? 0}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
