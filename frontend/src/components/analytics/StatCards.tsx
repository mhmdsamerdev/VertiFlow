import React from 'react'
import { SensorReadings } from '../../types/telemetry'
import { PeriodStats } from '../../types/analytics'
import { SENSOR_META } from '../sensors/SensorCard'
import { SENSOR_COLORS } from './SensorTrendsChart'
import { GoldenState } from '../../types/telemetry'

const SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity', 'co2',
]

interface Props {
  stats:   PeriodStats
  recipe?: GoldenState
  visible: Set<keyof SensorReadings>
}

export function StatCards({ stats, recipe, visible }: Props) {
  const keys = SENSOR_KEYS.filter(k => visible.has(k))

  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto">
      {keys.map(k => {
        const meta   = SENSOR_META[k]
        const color  = SENSOR_COLORS[k]
        const s      = stats[k]
        const thresh = recipe?.[k]
        const { Icon } = meta

        const delta = s && thresh ? +(s.avg - thresh.target).toFixed(meta.decimals) : null
        const deltaColor = delta == null ? 'text-zinc-600'
          : Math.abs(delta) < 0.01 ? 'text-zinc-500'
          : delta > 0              ? 'text-amber-400'
          :                          'text-sky-400'

        return (
          <div key={k} className="card px-3 py-2.5 flex flex-col gap-1.5">
            {/* Header */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <Icon size={11} className="text-zinc-500" />
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{meta.label}</span>
              <span className="text-[10px] text-zinc-700 ml-auto">{meta.unit}</span>
            </div>

            {s ? (
              <>
                {/* Avg (big) */}
                <span className="text-xl font-mono font-semibold tabular-nums text-zinc-100 leading-none">
                  {s.avg.toFixed(meta.decimals)}
                </span>

                {/* Min / Max / Δ */}
                <div className="flex items-center gap-3 text-[10px] font-mono tabular-nums">
                  <span className="text-sky-400">↓ {s.min.toFixed(meta.decimals)}</span>
                  <span className="text-amber-400">↑ {s.max.toFixed(meta.decimals)}</span>
                  {delta != null && (
                    <span className={`ml-auto ${deltaColor}`}>
                      Δ {delta >= 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>

                {/* Range bar */}
                <div className="relative h-1 bg-zinc-800 rounded-full overflow-hidden">
                  {/* Warn band */}
                  {thresh && (
                    <div
                      className="absolute h-full opacity-30 rounded-full"
                      style={{
                        backgroundColor: color,
                        left:  `${Math.max(0, (thresh.warnMin - s.min) / (s.max - s.min || 1) * 100)}%`,
                        right: `${Math.max(0, (s.max - thresh.warnMax) / (s.max - s.min || 1) * 100)}%`,
                      }}
                    />
                  )}
                  {/* Avg marker */}
                  <div
                    className="absolute w-0.5 h-full rounded-full"
                    style={{
                      backgroundColor: color,
                      left: `${((s.avg - s.min) / (s.max - s.min || 1) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <span className="text-xs text-zinc-600">No data</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
