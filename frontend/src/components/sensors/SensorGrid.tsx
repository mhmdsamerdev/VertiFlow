import React from 'react'
import { SensorReadings, SensorHistory, SensorHealthMap, SensorValidation } from '../../types/telemetry'
import { SensorCard } from './SensorCard'

const SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'co2', 'air_temp',
  'humidity', 'soil_moisture', 'light_intensity',
]

interface Props {
  readings:         SensorReadings | null
  history:          SensorHistory
  recipeMatch:      Partial<Record<keyof SensorReadings, number>>
  sensorHealth:     SensorHealthMap | null
  sensorValidation: SensorValidation
}

export function SensorGrid({ readings, history, recipeMatch, sensorHealth, sensorValidation }: Props) {
  return (
    <div className="flex-1 min-w-0 min-h-0 overflow-y-auto">
      <div className="p-4 grid grid-cols-2 xl:grid-cols-4 gap-3">
        {SENSOR_KEYS.map((key, i) => (
          <SensorCard
            key={key}
            sensorKey={key}
            value={readings?.[key] ?? 0}
            history={history[key] ?? []}
            matchScore={recipeMatch[key] ?? 0}
            index={i}
            isOnline={sensorHealth?.[key]?.online}
            validationStatus={sensorValidation[key]?.status}
          />
        ))}
      </div>
    </div>
  )
}
