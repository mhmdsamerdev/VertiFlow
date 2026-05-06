import React from 'react'
import { SensorReadings, SensorHistory } from '../../types/telemetry'
import { PrimarySensorCell, CompactSensorRow } from './SensorCard'

const PRIMARY_KEYS:   (keyof SensorReadings)[] = ['ph', 'ec', 'dissolved_oxygen']
const SECONDARY_KEYS: (keyof SensorReadings)[] = ['air_temp', 'water_temp', 'humidity', 'water_level', 'light_intensity']

interface Props {
  readings:    SensorReadings | null
  history:     SensorHistory
  recipeMatch: Partial<Record<keyof SensorReadings, number>>
}

export function SensorGrid({ readings, history, recipeMatch }: Props) {
  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col border-r border-slate-800">

      {/* ── Section header ── */}
      <div className="shrink-0 flex items-center justify-between px-3 h-7 border-b border-slate-800 bg-slate-900/40">
        <span className="text-[9px] font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">
          Sensor Telemetry
        </span>
        <span className="text-[9px] font-mono text-slate-700 tabular-nums">
          {readings ? new Date().toLocaleTimeString('en-US', { hour12: false }) : '—'}
        </span>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Left column: Critical parameters with sparklines ── */}
        <div className="flex flex-col flex-1 min-h-0 border-r border-slate-800">
          <div className="shrink-0 flex items-center px-3 h-6 border-b border-slate-800/60">
            <span className="text-[8px] font-mono font-bold text-slate-700 tracking-[0.22em] uppercase">
              Critical Parameters
            </span>
          </div>
          <div className="flex flex-col flex-1 min-h-0 divide-y divide-slate-800/70">
            {PRIMARY_KEYS.map(key => (
              <PrimarySensorCell
                key={key}
                sensorKey={key}
                value={readings?.[key] ?? 0}
                history={history[key] ?? []}
                matchScore={recipeMatch[key] ?? 0}
              />
            ))}
          </div>
        </div>

        {/* ── Right column: Environmental sensors (compact rows) ── */}
        <div className="flex flex-col w-52 min-h-0 shrink-0">
          <div className="shrink-0 flex items-center px-3 h-6 border-b border-slate-800/60">
            <span className="text-[8px] font-mono font-bold text-slate-700 tracking-[0.22em] uppercase">
              Environmental
            </span>
          </div>
          <div className="flex flex-col divide-y divide-slate-800/70 overflow-y-auto">
            {SECONDARY_KEYS.map(key => (
              <CompactSensorRow
                key={key}
                sensorKey={key}
                value={readings?.[key] ?? 0}
                history={history[key] ?? []}
                matchScore={recipeMatch[key] ?? 0}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
