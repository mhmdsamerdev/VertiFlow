import React from 'react'
import { motion } from 'framer-motion'
import {
  Beaker, Droplets, Leaf, LucideIcon, Sun,
  Thermometer, Waves, Wind, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts'
import { HistoryPoint, SensorReadings } from '../../types/telemetry'
import { GOLDEN_STATE, getSensorStatus, SensorStatus } from '../../hooks/useTelemetry'

// ─── Sensor display registry ────────────────────────────────────────────────
interface SensorMeta {
  label: string
  unit: string
  decimals: number
  Icon: LucideIcon
}

const SENSOR_META: Record<keyof SensorReadings, SensorMeta> = {
  ph:               { label: 'pH Level',      unit: 'pH',      decimals: 2, Icon: Beaker      },
  ec:               { label: 'EC Level',       unit: 'mS/cm',   decimals: 2, Icon: Zap         },
  water_temp:       { label: 'Water Temp',     unit: '°C',      decimals: 1, Icon: Thermometer },
  air_temp:         { label: 'Air Temp',       unit: '°C',      decimals: 1, Icon: Wind        },
  humidity:         { label: 'Humidity',       unit: '%',       decimals: 1, Icon: Droplets    },
  water_level:      { label: 'Water Level',    unit: '%',       decimals: 1, Icon: Waves       },
  light_intensity:  { label: 'Light',          unit: 'µmol',    decimals: 0, Icon: Sun         },
  dissolved_oxygen: { label: 'Dissolved O₂',   unit: 'mg/L',    decimals: 2, Icon: Leaf        },
}

const STATUS_STYLES: Record<SensorStatus, { dot: string; value: string; chart: string; bg: string; border: string }> = {
  nominal:  {
    dot:    'bg-emerald-400',
    value:  'text-emerald-300',
    chart:  '#10b981',
    bg:     'hover:border-emerald-500/25',
    border: 'border-white/[0.07]',
  },
  warning:  {
    dot:    'bg-amber-400 animate-pulse',
    value:  'text-amber-300',
    chart:  '#f59e0b',
    bg:     'hover:border-amber-500/25',
    border: 'border-amber-500/20',
  },
  critical: {
    dot:    'bg-rose-400 animate-pulse',
    value:  'text-rose-300',
    chart:  '#f43f5e',
    bg:     'hover:border-rose-500/35',
    border: 'border-rose-500/30',
  },
}

// ─── Mini sparkline tooltip ────────────────────────────────────────────────
function SparkTooltip({ active, payload, unit }: { active?: boolean; payload?: {value: number}[]; unit: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-200">
      {payload[0].value.toFixed(2)} {unit}
    </div>
  )
}

// ─── Match bar ─────────────────────────────────────────────────────────────
function MatchBar({ score, status }: { score: number; status: SensorStatus }) {
  const barColor = status === 'critical' ? 'bg-rose-500' : status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[10px] font-mono font-medium tabular-nums ${
        status === 'critical' ? 'text-rose-400' : status === 'warning' ? 'text-amber-400' : 'text-emerald-400'
      }`}>
        {score}%
      </span>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface Props {
  sensorKey: keyof SensorReadings
  value: number
  history: HistoryPoint[]
  matchScore: number
  index: number
}

// ─── Card ──────────────────────────────────────────────────────────────────
export function SensorCard({ sensorKey, value, history, matchScore, index }: Props) {
  const meta   = SENSOR_META[sensorKey]
  const thresh = GOLDEN_STATE[sensorKey]
  const status = getSensorStatus(sensorKey, value)
  const s      = STATUS_STYLES[status]

  const chartData = history.map(h => ({ v: h.value }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={`
        group relative flex flex-col gap-1 p-4 rounded-xl
        bg-white/[0.03] backdrop-blur-md
        border ${s.border} ${s.bg}
        transition-all duration-300 cursor-default
        hover:bg-white/[0.055] hover:shadow-lg
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">{meta.label}</p>
          <motion.p
            key={value}
            initial={{ opacity: 0.5, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`text-2xl font-semibold font-mono tabular-nums mt-0.5 ${s.value}`}
          >
            {value.toFixed(meta.decimals)}
            <span className="text-sm font-normal text-slate-500 ml-1">{meta.unit}</span>
          </motion.p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Status dot */}
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot} mt-0.5`} />
          {/* Icon */}
          <meta.Icon size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>

      {/* Target ghost text */}
      <p className="text-[10px] text-slate-600">
        Target: {thresh.target} {meta.unit} &nbsp;·&nbsp; {thresh.warnMin}–{thresh.warnMax}
      </p>

      {/* Recipe match bar */}
      <MatchBar score={matchScore} status={status} />

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="mt-2 h-14 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={s.chart} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={s.chart} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Tooltip
                content={<SparkTooltip unit={meta.unit} />}
                cursor={{ stroke: s.chart, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={s.chart}
                strokeWidth={1.5}
                fill={`url(#grad-${sensorKey})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  )
}
