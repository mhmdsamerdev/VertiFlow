import React from 'react'
import { motion } from 'framer-motion'
import { Target } from 'lucide-react'
import { SensorReadings } from '../../types/telemetry'

// ─── SVG Circular Gauge ──────────────────────────────────────────────────────
function CircularGauge({ value }: { value: number }) {
  const R = 32, cx = 40, cy = 40, stroke = 3
  const circumference = 2 * Math.PI * R
  const filled = (value / 100) * circumference

  const color = value >= 80 ? '#22c55e' : value >= 50 ? '#fbbf24' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 80 80" className="-rotate-90">
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-800/50"
        />
        <motion.circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${color}33)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tracking-tighter text-zinc-100 font-mono">
          {value}%
        </span>
      </div>
    </div>
  )
}

// ─── Sensor row ─────────────────────────────────────────────────────────────
const LABELS: Record<keyof SensorReadings, string> = {
  ph: 'pH', ec: 'EC', air_temp: 'Air T',
  humidity: 'Humidity', soil_moisture: 'Soil', light_intensity: 'Light', co2: 'CO₂',
}

function MatchRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-green-500' : score >= 50 ? 'text-amber-400' : 'text-red-400'
  const barColor = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-500'
  
  return (
    <div className="group space-y-1">
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
        <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
        <span className={`${color} font-mono`}>{score}%</span>
      </div>
      <div className="h-1 bg-zinc-800/50 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
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
    overallMatch >= 80 ? 'Golden' :
    overallMatch >= 50 ? 'Near' :
                         'Out'
  const stateColor =
    overallMatch >= 80 ? 'text-green-400' :
    overallMatch >= 50 ? 'text-amber-400' :
                         'text-red-400'

  return (
    <div className="card h-full flex flex-col bg-zinc-900/10 border-zinc-800/30 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={12} className="text-zinc-500" />
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Recipe Performance</span>
        </div>
        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border border-current ${stateColor}`}>
          {stateLabel}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <CircularGauge value={overallMatch} />
        <div className="space-y-3">
          {(Object.keys(LABELS) as (keyof SensorReadings)[]).map(key => (
            <MatchRow key={key} label={LABELS[key]} score={recipeMatch[key] ?? 0} />
          ))}
        </div>
      </div>
    </div>
  )
}
