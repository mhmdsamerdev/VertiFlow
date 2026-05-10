import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon, AlertTriangle, Beaker, Zap, Wind, Droplets, Sun, Cloud, Sprout } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { HistoryPoint, SensorReadings, ValidationStatus } from '../../types/telemetry'
import { getSensorStatus, SensorStatus } from '../../hooks/useTelemetry'
import { useZoneContext } from '../../context/ZoneContext'

// ─── Metadata registry ──────────────────────────────────────────────────
interface SensorMeta {
  label:    string
  unit:     string
  decimals: number
  Icon:     LucideIcon
}

export const SENSOR_META: Record<keyof SensorReadings, SensorMeta> = {
  ph:              { label: 'pH Level',        unit: 'pH',    decimals: 2, Icon: Beaker  },
  ec:              { label: 'EC / Nutrient',   unit: 'mS/cm', decimals: 2, Icon: Zap     },
  air_temp:        { label: 'Air Temp',        unit: '°C',    decimals: 1, Icon: Wind    },
  humidity:        { label: 'Ambient Humidity', unit: '%',    decimals: 1, Icon: Droplets },
  soil_moisture:   { label: 'Soil Moisture',   unit: '%',     decimals: 1, Icon: Sprout  },
  light_intensity: { label: 'Light',           unit: 'µmol',  decimals: 0, Icon: Sun     },
  co2:             { label: 'CO₂ Level',       unit: 'ppm',   decimals: 0, Icon: Cloud   },
}

// ─── Status styles ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<SensorStatus, {
  dot:        string
  value:      string
  chart:      string
  badge:      string
  badgeLabel: string
  bar:        string
  accent:     string
}> = {
  nominal: {
    dot:        'status-dot-nominal',
    value:      'text-zinc-100',
    chart:      '#22c55e',
    badge:      'badge-nominal',
    badgeLabel: 'Nominal',
    bar:        'bg-green-500',
    accent:     '',
  },
  warning: {
    dot:        'status-dot-warning',
    value:      'text-amber-300',
    chart:      '#fbbf24',
    badge:      'badge-warning',
    badgeLabel: 'Warning',
    bar:        'bg-amber-400',
    accent:     'ring-1 ring-inset ring-amber-500/20',
  },
  critical: {
    dot:        'status-dot-critical',
    value:      'text-red-300',
    chart:      '#ef4444',
    badge:      'badge-critical',
    badgeLabel: 'Critical',
    bar:        'bg-red-500',
    accent:     'ring-1 ring-inset ring-red-500/30',
  },
}

// ─── Shared props ────────────────────────────────────────────────────────
export interface CellProps {
  sensorKey:        keyof SensorReadings
  value:            number | null
  history:          HistoryPoint[]
  matchScore:       number
  index?:           number
  isOnline?:        boolean
  validationStatus?: ValidationStatus
}

// ─── Sensor card ─────────────────────────────────────────────────────────
export function SensorCard({ sensorKey, value, history, matchScore, isOnline = true, validationStatus }: CellProps) {
  const { activeZone } = useZoneContext()
  const meta      = SENSOR_META[sensorKey]
  const thresh    = activeZone?.recipe?.[sensorKey] ?? { target: 0, min: 0, max: 100 }
  const isNull    = value === null
  const status    = isNull ? 'nominal' : getSensorStatus(sensorKey, value, activeZone?.recipe)
  const s         = isNull ? { ...STATUS_STYLES.nominal, badgeLabel: 'Offline', dot: 'bg-zinc-700', value: 'text-zinc-600' } : STATUS_STYLES[status]
  const delta     = isNull ? 0 : value - thresh.target
  const chartData = history.filter(h => h.value !== null).map(h => ({ v: h.value }))
  const { Icon }  = meta

  return (
    <div className={`card flex flex-col p-4 gap-3 ${s.accent}`}>

      {/* ── Header: sensor name + status ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`status-dot ${s.dot}`} />
          <Icon size={13} className="text-zinc-500 shrink-0" />
          <span className="text-xs font-medium text-zinc-400">{meta.label}</span>
        </div>
        <span className={`badge ${s.badge}`}>{s.badgeLabel}</span>
      </div>

      {/* ── Fault chip ── */}
      {(!isOnline || (validationStatus && validationStatus !== 'ok')) && (
        <div className={`inline-flex items-center gap-1 text-[9px] font-semibold tracking-wide px-1.5 py-0.5 rounded w-fit ${
          !isOnline ? 'bg-red-500/12 text-red-400' : 'bg-amber-400/12 text-amber-400'
        }`}>
          <AlertTriangle size={8} />
          {!isOnline ? 'Offline' : validationStatus === 'frozen' ? 'Frozen' : 'Spike detected'}
        </div>
      )}

      {/* ── Big value + delta ── */}
      <div className="flex items-baseline gap-2">
        <motion.span
          key={value ?? 'null'}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className={`text-2xl font-mono font-semibold tabular-nums leading-none ${s.value}`}
        >
          {isNull ? '--' : value!.toFixed(meta.decimals)}
        </motion.span>
        <span className="text-sm text-zinc-600">{isNull ? 'No Reading' : meta.unit}</span>
        {!isNull && (
          <span className={`text-xs font-mono tabular-nums ml-auto ${
            Math.abs(delta) < 0.005 ? 'text-zinc-700' :
            delta > 0               ? 'text-amber-500' :
                                      'text-sky-400'
          }`}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(meta.decimals)}
          </span>
        )}
      </div>

      {/* ── Chart ── */}
      {chartData.length > 1 && (
        <div className="h-16 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id={`grad-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.chart} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={s.chart} stopOpacity={0}    />
                </linearGradient>
              </defs>
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

      {/* ── Recipe match bar ── */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-zinc-600 shrink-0">Tgt {thresh.target}</span>
        <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${s.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${matchScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <span className={`text-[11px] font-mono tabular-nums shrink-0 ${
          matchScore >= 80 ? 'text-green-500' : matchScore >= 50 ? 'text-amber-400' : 'text-red-400'
        }`}>{matchScore}%</span>
      </div>

    </div>
  )
}

// ─── Legacy aliases kept so existing imports don't break ─────────────────
export function PrimarySensorCell(props: CellProps) { return <SensorCard {...props} /> }
export function CompactSensorRow(props: CellProps)  { return <SensorCard {...props} /> }
