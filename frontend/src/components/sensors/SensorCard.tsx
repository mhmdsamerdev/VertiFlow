import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon, Beaker, Zap, Thermometer, Wind, Droplets, Waves, Sun, Leaf } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { HistoryPoint, SensorReadings } from '../../types/telemetry'
import { GOLDEN_STATE, getSensorStatus, SensorStatus } from '../../hooks/useTelemetry'

// ─── Sensor display registry ────────────────────────────────────────────
interface SensorMeta {
  label:      string
  shortLabel: string
  unit:       string
  decimals:   number
  Icon:       LucideIcon
}

const SENSOR_META: Record<keyof SensorReadings, SensorMeta> = {
  ph:               { label: 'PH LEVEL',       shortLabel: 'PH',    unit: 'pH',    decimals: 2, Icon: Beaker      },
  ec:               { label: 'EC / NUTRIENT',  shortLabel: 'EC',    unit: 'mS/cm', decimals: 2, Icon: Zap         },
  water_temp:       { label: 'WATER TEMP',     shortLabel: 'H₂O-T', unit: '°C',    decimals: 1, Icon: Thermometer },
  air_temp:         { label: 'AIR TEMP',       shortLabel: 'AIR-T', unit: '°C',    decimals: 1, Icon: Wind        },
  humidity:         { label: 'REL. HUMIDITY',  shortLabel: 'RH',    unit: '%',     decimals: 1, Icon: Droplets    },
  water_level:      { label: 'RESERVOIR LVL',  shortLabel: 'LVL',   unit: '%',     decimals: 1, Icon: Waves       },
  light_intensity:  { label: 'LIGHT / PPFD',   shortLabel: 'PPFD',  unit: 'µmol',  decimals: 0, Icon: Sun         },
  dissolved_oxygen: { label: 'DISSOLVED O₂',   shortLabel: 'DO₂',   unit: 'mg/L',  decimals: 2, Icon: Leaf        },
}

const STATUS_STYLES: Record<SensorStatus, {
  led:    string
  value:  string
  chart:  string
  label:  string
  accent: string
}> = {
  nominal:  { led: 'bg-emerald-500',              value: 'text-emerald-300', chart: '#10b981', label: 'NOM',  accent: '' },
  warning:  { led: 'bg-amber-500 animate-pulse',  value: 'text-amber-300',  chart: '#f59e0b', label: 'WARN', accent: 'border-l border-amber-500/60' },
  critical: { led: 'bg-rose-500 animate-pulse',   value: 'text-rose-300',   chart: '#f43f5e', label: 'CRIT', accent: 'border-l-2 border-rose-500' },
}

// ─── Shared props ─────────────────────────────────────────────────────────
export interface CellProps {
  sensorKey:  keyof SensorReadings
  value:      number
  history:    HistoryPoint[]
  matchScore: number
}

// ─── Primary sensor cell (with sparkline) ────────────────────────────────
export function PrimarySensorCell({ sensorKey, value, history, matchScore }: CellProps) {
  const meta   = SENSOR_META[sensorKey]
  const thresh = GOLDEN_STATE[sensorKey]
  const status = getSensorStatus(sensorKey, value)
  const s      = STATUS_STYLES[status]
  const delta  = value - thresh.target
  const chartData = history.map(h => ({ v: h.value }))

  return (
    <div className={`flex-1 min-h-0 flex flex-col px-3 py-2 bg-slate-950 hover:bg-slate-900/40 transition-colors cursor-default overflow-hidden ${s.accent}`}>

      {/* Top row: label + status badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 shrink-0 ${s.led}`} />
          <span className="text-[9px] font-mono font-bold text-slate-500 tracking-[0.18em]">{meta.label}</span>
        </div>
        <span className={`text-[8px] font-mono font-bold tracking-[0.12em] px-1 py-px ${
          status === 'critical' ? 'bg-rose-500/15 text-rose-400' :
          status === 'warning'  ? 'bg-amber-500/15 text-amber-400' :
                                  'text-slate-600'
        }`}>{s.label}</span>
      </div>

      {/* Value + delta row */}
      <div className="flex items-baseline gap-2 mb-1.5">
        <motion.span
          key={value}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className={`text-[26px] leading-none font-mono font-bold tabular-nums tracking-tight ${s.value}`}
        >
          {value.toFixed(meta.decimals)}
        </motion.span>
        <span className="text-[11px] font-mono text-slate-600">{meta.unit}</span>
        <span className={`text-[10px] font-mono ml-auto tabular-nums ${
          Math.abs(delta) < 0.005 ? 'text-slate-700' :
          delta > 0               ? 'text-amber-500/80' :
                                    'text-sky-500/80'
        }`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(meta.decimals)}&nbsp;Δ
        </span>
      </div>

      {/* Match bar + target */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-[2px] bg-slate-800">
          <motion.div
            className={status === 'critical' ? 'h-full bg-rose-500' : status === 'warning' ? 'h-full bg-amber-500' : 'h-full bg-emerald-500'}
            initial={{ width: 0 }}
            animate={{ width: `${matchScore}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className={`text-[9px] font-mono tabular-nums w-7 text-right shrink-0 ${
          status === 'critical' ? 'text-rose-500' : status === 'warning' ? 'text-amber-500' : 'text-slate-600'
        }`}>{matchScore}%</span>
        <span className="text-[9px] font-mono text-slate-700 shrink-0">TGT&nbsp;{thresh.target}</span>
      </div>

      {/* Sparkline */}
      {chartData.length > 1 && (
        <div className="flex-1 min-h-[40px] max-h-[140px] -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`gp-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.chart} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={s.chart} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={s.chart}
                strokeWidth={1}
                fill={`url(#gp-${sensorKey})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Compact sensor row ──────────────────────────────────────────────────────────
export function CompactSensorRow({ sensorKey, value, history, matchScore }: CellProps) {
  const meta   = SENSOR_META[sensorKey]
  const thresh = GOLDEN_STATE[sensorKey]
  const status = getSensorStatus(sensorKey, value)
  const s      = STATUS_STYLES[status]
  const delta  = value - thresh.target
  const chartData = history.map(h => ({ v: h.value }))

  return (
    <div className={`flex items-center gap-2 px-3 h-9 hover:bg-slate-900/40 transition-colors cursor-default ${s.accent}`}>
      <span className={`w-1.5 h-1.5 shrink-0 ${s.led}`} />
      <span className="text-[9px] font-mono text-slate-500 tracking-[0.1em] w-10 shrink-0">{meta.shortLabel}</span>

      <motion.span
        key={value}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className={`text-sm font-mono font-bold tabular-nums ${s.value} w-12 shrink-0`}
      >
        {value.toFixed(meta.decimals)}
      </motion.span>
      <span className="text-[9px] font-mono text-slate-700 w-7 shrink-0">{meta.unit}</span>

      <span className={`text-[9px] font-mono tabular-nums w-9 shrink-0 ${
        Math.abs(delta) < 0.005 ? 'text-slate-800' :
        delta > 0               ? 'text-amber-600' :
                                  'text-sky-600'
      }`}>
        {delta >= 0 ? '+' : ''}{delta.toFixed(meta.decimals)}
      </span>

      {/* Mini sparkline */}
      {chartData.length > 1 && (
        <div className="flex-1 h-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 1, right: 0, bottom: 1, left: 0 }}>
              <defs>
                <linearGradient id={`gc-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.chart} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={s.chart} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={s.chart}
                strokeWidth={1}
                fill={`url(#gc-${sensorKey})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <span className={`text-[9px] font-mono w-6 text-right shrink-0 tabular-nums ${
        status === 'critical' ? 'text-rose-500' : status === 'warning' ? 'text-amber-500' : 'text-slate-700'
      }`}>{matchScore}%</span>
    </div>
  )
}

// ─── Legacy SensorCard export (no longer used — kept to avoid unused import errors) ───
export function SensorCard({ sensorKey, value, history, matchScore }: CellProps & { index?: number }) {
  return <PrimarySensorCell sensorKey={sensorKey} value={value} history={history} matchScore={matchScore} />
}
