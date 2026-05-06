import React from 'react'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Battery, CheckCircle2, Wifi } from 'lucide-react'
import {
  SensorReadings,
  SensorHealthMap,
  SensorValidation,
  ValidationResult,
  SensorHealthEntry,
} from '../../types/telemetry'
import { SENSOR_META } from './SensorCard'

// ─── Sensor display order ─────────────────────────────────────────────────────
const SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'co2', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity',
]

const SENSOR_LABELS: Record<keyof SensorReadings, string> = {
  ph: 'pH Level', ec: 'EC / Nutrient', air_temp: 'Air Temp',
  humidity: 'Ambient Humidity', soil_moisture: 'Soil Moisture',
  light_intensity: 'Light', co2: 'CO₂ Level',
}

// ─── Signal bars ──────────────────────────────────────────────────────────────
function SignalBars({ signal }: { signal: number }) {
  const bars  = signal > 75 ? 4 : signal > 50 ? 3 : signal > 25 ? 2 : 1
  const color = bars >= 3 ? '#22c55e' : bars === 2 ? '#fbbf24' : '#ef4444'
  return (
    <div className="flex items-end gap-[3px]">
      {[1, 2, 3, 4].map(b => (
        <div
          key={b}
          className="w-2 rounded-sm transition-colors"
          style={{ height: `${b * 3 + 3}px`, backgroundColor: b <= bars ? color : 'rgba(63,63,70,0.7)' }}
        />
      ))}
    </div>
  )
}

// ─── Per-sensor health card ───────────────────────────────────────────────────
interface CardProps {
  sensorKey:  keyof SensorReadings
  value:      number | null
  health:     SensorHealthEntry
  validation: ValidationResult
  index:      number
}

function SensorHealthCard({ sensorKey, value, health, validation, index }: CardProps) {
  const meta = SENSOR_META[sensorKey]
  const { Icon } = meta

  const battColor = health.battery > 50 ? 'bg-green-500'  : health.battery > 20 ? 'bg-amber-400' : 'bg-red-500'
  const battText  = health.battery > 50 ? 'text-green-400' : health.battery > 20 ? 'text-amber-300' : 'text-red-400'

  const valOk    = validation.status === 'ok'
  const valColor = valOk ? 'text-green-400' : validation.status === 'offline' ? 'text-red-400' : 'text-amber-400'
  const ValIcon  = valOk ? CheckCircle2 : AlertTriangle

  return (
    <motion.div
      className="card flex flex-col gap-3 p-4"
      style={{ opacity: health.online ? 1 : 0.55 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: health.online ? 1 : 0.55, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-zinc-500 shrink-0" />
          <span className="text-xs font-medium text-zinc-300">{meta.label}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-medium ${health.online ? 'text-green-400' : 'text-red-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${health.online ? 'bg-green-500' : 'bg-red-500'}`} />
          {health.online ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Current reading */}
      <div className="font-mono tabular-nums leading-none">
        <span className="text-xl font-semibold text-zinc-100">
          {value !== null ? value.toFixed(meta.decimals) : '—'}
        </span>
        <span className="text-xs text-zinc-600 ml-1.5">{meta.unit}</span>
      </div>

      {/* Battery */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Battery size={9} />
            <span>Battery</span>
          </div>
          <span className={`text-[10px] font-mono font-medium tabular-nums ${battText}`}>
            {health.battery.toFixed(0)}%
          </span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${battColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${health.battery}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Signal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Wifi size={9} />
          <span>Signal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500">
            {health.signal > 75 ? 'Strong' : health.signal > 50 ? 'Good' : health.signal > 25 ? 'Weak' : 'Poor'}
          </span>
          <SignalBars signal={health.signal} />
        </div>
      </div>

      {/* Validation status */}
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${valColor}`}>
        <ValIcon size={10} className="shrink-0" />
        <span>{validation.message}</span>
      </div>
    </motion.div>
  )
}

// ─── Active issues derivation ─────────────────────────────────────────────────
interface Issue {
  label:    string
  detail:   string
  severity: 'critical' | 'warning'
}

function deriveIssues(
  health:     SensorHealthMap | null,
  validation: SensorValidation,
): Issue[] {
  const issues: Issue[] = []
  if (!health) return issues

  for (const key of SENSOR_KEYS) {
    const h = health[key]
    const v = validation[key]
    if (!h.online) {
      issues.push({ label: SENSOR_LABELS[key], detail: 'Sensor offline',                   severity: 'critical' })
    } else if (h.battery < 20) {
      issues.push({ label: SENSOR_LABELS[key], detail: `Battery at ${h.battery.toFixed(0)}%`, severity: 'critical' })
    } else if (h.battery < 40) {
      issues.push({ label: SENSOR_LABELS[key], detail: `Battery low — ${h.battery.toFixed(0)}%`, severity: 'warning' })
    }
    if (v && v.status !== 'ok' && v.status !== 'offline') {
      issues.push({ label: SENSOR_LABELS[key], detail: v.message, severity: 'warning' })
    }
  }
  return issues.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1))
}

// ─── Panel ────────────────────────────────────────────────────────────────────
interface Props {
  readings:         SensorReadings | null
  sensorHealth:     SensorHealthMap | null
  sensorValidation: SensorValidation
}

export function SensorsPanel({ readings, sensorHealth, sensorValidation }: Props) {
  const issues  = deriveIssues(sensorHealth, sensorValidation)
  const total   = SENSOR_KEYS.length
  const online  = sensorHealth ? Object.values(sensorHealth).filter(h => h.online).length : 0
  const lowBatt = sensorHealth ? Object.values(sensorHealth).filter(h => h.battery < 40).length : 0
  const faults  = Object.values(sensorValidation).filter(v => v && v.status !== 'ok').length

  const hasCrit = issues.some(i => i.severity === 'critical')

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {/* ── Page header ── */}
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity size={14} className="text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-200">Sensor Diagnostics</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-500">Zone Alpha</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={`w-1.5 h-1.5 rounded-full ${online === total ? 'bg-green-500' : 'bg-amber-400'}`} />
            <span className="text-zinc-400 font-medium">{online}/{total} online</span>
          </div>
          {lowBatt > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Battery size={10} className="text-amber-400" />
              <span className="text-amber-400 font-medium">{lowBatt} low battery</span>
            </div>
          )}
          {faults > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <AlertTriangle size={10} className={hasCrit ? 'text-red-500' : 'text-amber-400'} />
              <span className={`font-medium ${hasCrit ? 'text-red-400' : 'text-amber-400'}`}>
                {faults} fault{faults > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Sensor health grid ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {SENSOR_KEYS.map((key, i) => {
            const h = sensorHealth?.[key]
            const v = sensorValidation[key] ?? { status: 'ok' as const, message: 'Valid' }
            return (
              <SensorHealthCard
                key={key}
                sensorKey={key}
                value={readings?.[key] ?? null}
                health={h ?? { battery: 100, signal: 100, online: true }}
                validation={v}
                index={i}
              />
            )
          })}
        </div>

        {/* ── Active issues ── */}
        {issues.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={12} className={hasCrit ? 'text-red-500' : 'text-amber-400'} />
              <span className="text-xs font-semibold text-zinc-300">Active Issues</span>
              <span className={`ml-auto text-[10px] font-bold ${hasCrit ? 'text-red-500' : 'text-amber-400'}`}>
                {issues.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${
                    issue.severity === 'critical'
                      ? 'bg-red-500/8 text-red-300 ring-1 ring-inset ring-red-500/15'
                      : 'bg-amber-400/8 text-amber-300 ring-1 ring-inset ring-amber-400/15'
                  }`}
                >
                  <AlertTriangle size={10} className="shrink-0 opacity-80" />
                  <span className="font-medium">{issue.label}</span>
                  <span className="ml-auto text-[10px] opacity-60 shrink-0 font-mono">{issue.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
