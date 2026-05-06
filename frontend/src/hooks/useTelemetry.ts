import { useEffect, useRef, useState } from 'react'
import { useWebSocket } from './useWebSocket'
import {
  ConnectionStatus,
  GoldenState,
  HistoryPoint,
  SensorHistory,
  SensorReadings,
  TelemetryPayload,
} from '../types/telemetry'

// ─── Golden-state recipe targets ──────────────────────────────────────────────
export const GOLDEN_STATE: GoldenState = {
  ph:               { target: 6.2,  warnMin: 5.8,  warnMax: 6.8,  critMin: 5.0,  critMax: 7.5  },
  ec:               { target: 1.8,  warnMin: 1.4,  warnMax: 2.2,  critMin: 0.8,  critMax: 3.0  },
  air_temp:         { target: 24.0, warnMin: 20.0, warnMax: 28.0, critMin: 15.0, critMax: 33.0 },
  humidity:         { target: 65.0, warnMin: 55.0, warnMax: 75.0, critMin: 40.0, critMax: 90.0 },
  soil_moisture:    { target: 70.0, warnMin: 50.0, warnMax: 85.0, critMin: 30.0, critMax: 95.0 },
  light_intensity:  { target: 500., warnMin: 350., warnMax: 650., critMin: 200., critMax: 900. },
  co2:              { target: 900., warnMin: 600., warnMax: 1200., critMin: 400., critMax: 1500. },
}

export type SensorStatus = 'nominal' | 'warning' | 'critical'

export function getSensorStatus(key: keyof SensorReadings, value: number): SensorStatus {
  const t = GOLDEN_STATE[key]
  if (value < t.critMin || value > t.critMax) return 'critical'
  if (value < t.warnMin || value > t.warnMax) return 'warning'
  return 'nominal'
}

function scoreMatch(value: number, key: keyof SensorReadings): number {
  const { warnMin, warnMax, critMin, critMax } = GOLDEN_STATE[key]
  if (value >= warnMin && value <= warnMax) return 100
  if (value < critMin || value > critMax)   return 0
  if (value < warnMin) {
    return Math.round(((value - critMin) / (warnMin - critMin)) * 70)
  }
  return Math.round(((critMax - value) / (critMax - warnMax)) * 70)
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
const HISTORY_SIZE = 24

export interface UseTelemetryReturn {
  status: ConnectionStatus
  data: TelemetryPayload | null
  history: SensorHistory
  recipeMatch: Partial<Record<keyof SensorReadings, number>>
  overallMatch: number
}

export function useTelemetry(): UseTelemetryReturn {
  const { status, data } = useWebSocket()

  const [history, setHistory]     = useState<SensorHistory>({})
  const [recipeMatch, setRecipe]  = useState<Partial<Record<keyof SensorReadings, number>>>({})
  const [overallMatch, setOverall] = useState(0)

  const prevDataRef = useRef<TelemetryPayload | null>(null)

  useEffect(() => {
    if (!data || data === prevDataRef.current) return
    prevDataRef.current = data

    const ts = Date.now()

    setHistory((prev: SensorHistory) => {
      const next: SensorHistory = { ...prev }
      for (const k of Object.keys(data.readings) as (keyof SensorReadings)[]) {
        const arr: HistoryPoint[] = prev[k] ?? []
        const point: HistoryPoint = { value: data.readings[k], ts }
        next[k] = arr.length >= HISTORY_SIZE
          ? [...arr.slice(1), point]
          : [...arr, point]
      }
      return next
    })

    const scores: Partial<Record<keyof SensorReadings, number>> = {}
    for (const k of Object.keys(data.readings) as (keyof SensorReadings)[]) {
      scores[k] = scoreMatch(data.readings[k], k)
    }
    setRecipe(scores)

    const vals = Object.values(scores) as number[]
    setOverall(vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0)
  }, [data])

  return { status, data, history, recipeMatch, overallMatch }
}
