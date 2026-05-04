import React from 'react'
import { SensorReadings, SensorHistory } from '../../types/telemetry'
import { SensorCard } from './SensorCard'

const SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'water_temp', 'air_temp',
  'humidity', 'water_level', 'light_intensity', 'dissolved_oxygen',
]

interface Props {
  readings: SensorReadings | null
  history: SensorHistory
  recipeMatch: Partial<Record<keyof SensorReadings, number>>
}

export function SensorGrid({ readings, history, recipeMatch }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300 tracking-wide uppercase">
          Sensor Readings
        </h2>
        {readings && (
          <span className="text-xs text-slate-600 font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {SENSOR_KEYS.map((key, i) => (
          <SensorCard
            key={key}
            sensorKey={key}
            value={readings?.[key] ?? 0}
            history={history[key] ?? []}
            matchScore={recipeMatch[key] ?? 0}
            index={i}
          />
        ))}
      </div>
    </section>
  )
}
