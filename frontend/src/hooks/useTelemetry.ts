import { useEffect, useRef, useState } from 'react'
import { useWebSocket } from './useWebSocket'
import { useZoneContext } from '../context/ZoneContext'
import {
  ConnectionStatus,
  GoldenState,
  HistoryPoint,
  SensorHealthMap,
  SensorHistory,
  SensorReadings,
  SensorValidation,
  TelemetryPayload,
  ValidationResult,
} from '../types/telemetry'

const WS_BASE = 'ws://localhost:8000/ws/telemetry'

// ─── Fallback golden-state (zone-alpha / Butterhead Lettuce) ──────────────────
// Kept as a named export so existing call-sites that import GOLDEN_STATE
// for display purposes (e.g. default parameter values) continue to compile.
export const GOLDEN_STATE: GoldenState = {
  ph:               { target: 6.2,  warnMin: 5.8,  warnMax: 6.8,  critMin: 5.0,  critMax: 7.5  },
  ec:               { target: 1.8,  warnMin: 1.4,  warnMax: 2.2,  critMin: 0.8,  critMax: 3.0  },
  air_temp:         { target: 24.0, warnMin: 20.0, warnMax: 28.0, critMin: 15.0, critMax: 33.0 },
  humidity:         { target: 65.0, warnMin: 55.0, warnMax: 75.0, critMin: 40.0, critMax: 90.0 },
  soil_moisture:    { target: 70.0, warnMin: 50.0, warnMax: 85.0, critMin: 30.0, critMax: 95.0 },
  light_intensity:  { target: 500., warnMin: 350., warnMax: 650., critMin: 200., critMax: 900. },
  co2:              { target: 900., warnMin: 600., warnMax: 1200., critMin: 400., critMax: 1500. },
}

// ─── Validation ────────────────────────────────────────────────────────────────
const SPIKE_THRESHOLDS: Record<keyof SensorReadings, number> = {
  ph: 0.4, ec: 0.25, air_temp: 1.5, humidity: 4.0,
  soil_moisture: 4.0, light_intensity: 40.0, co2: 80.0,
}

function detectValidation(
  key: keyof SensorReadings,
  history: HistoryPoint[],
  online: boolean,
): ValidationResult {
  if (!online) return { status: 'offline', message: 'Sensor offline' }
  if (history.length >= 6) {
    const recent = history.slice(-6).map(p => p.value)
    if (Math.max(...recent) - Math.min(...recent) < 0.005)
      return { status: 'frozen', message: 'Reading frozen' }
    const prev = recent.slice(0, -1)
    const mean = prev.reduce((a, b) => a + b, 0) / prev.length
    if (Math.abs(recent[recent.length - 1] - mean) > SPIKE_THRESHOLDS[key] * 3)
      return { status: 'spike', message: 'Abnormal reading' }
  }
  return { status: 'ok', message: 'Valid' }
}

export type SensorStatus = 'nominal' | 'warning' | 'critical'

export function getSensorStatus(
  key:    keyof SensorReadings,
  value:  number,
  recipe: GoldenState = GOLDEN_STATE,
): SensorStatus {
  const t = recipe[key]
  if (value < t.critMin || value > t.critMax) return 'critical'
  if (value < t.warnMin || value > t.warnMax) return 'warning'
  return 'nominal'
}

function scoreMatch(value: number, key: keyof SensorReadings, recipe: GoldenState): number {
  const { warnMin, warnMax, critMin, critMax } = recipe[key]
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
  status:           ConnectionStatus
  data:             TelemetryPayload | null
  history:          SensorHistory
  recipeMatch:      Partial<Record<keyof SensorReadings, number>>
  overallMatch:     number
  sensorHealth:     SensorHealthMap | null
  sensorValidation: SensorValidation
}

export function useTelemetry(): UseTelemetryReturn {
  const { activeZone } = useZoneContext()
  const wsUrl = `${WS_BASE}/${activeZone.id}`
  const { status, data } = useWebSocket(wsUrl)

  const [history, setHistory]            = useState<SensorHistory>({})
  const [recipeMatch, setRecipe]         = useState<Partial<Record<keyof SensorReadings, number>>>({})
  const [overallMatch, setOverall]       = useState(0)
  const [sensorHealth, setHealth]        = useState<SensorHealthMap | null>(null)
  const [sensorValidation, setValidation] = useState<SensorValidation>({})

  const prevDataRef = useRef<TelemetryPayload | null>(null)
  const historyRef  = useRef<SensorHistory>({})

  // Reset all derived state when the active zone switches
  useEffect(() => {
    prevDataRef.current  = null
    historyRef.current   = {}
    setHistory({})
    setRecipe({})
    setOverall(0)
    setHealth(null)
    setValidation({})
  }, [activeZone.id])

  useEffect(() => {
    if (!data || data === prevDataRef.current) return
    prevDataRef.current = data

    const ts     = Date.now()
    const recipe = activeZone.recipe

    // Build next history using ref so validation can read it synchronously
    const next: SensorHistory = { ...historyRef.current }
    for (const k of Object.keys(data.readings) as (keyof SensorReadings)[]) {
      const arr: HistoryPoint[] = historyRef.current[k] ?? []
      const pt:  HistoryPoint   = { value: data.readings[k], ts }
      next[k] = arr.length >= HISTORY_SIZE ? [...arr.slice(1), pt] : [...arr, pt]
    }
    historyRef.current = next
    setHistory(next)

    // Recipe match scores against the active zone's crop recipe
    const scores: Partial<Record<keyof SensorReadings, number>> = {}
    for (const k of Object.keys(data.readings) as (keyof SensorReadings)[]) {
      scores[k] = scoreMatch(data.readings[k], k, recipe)
    }
    setRecipe(scores)
    const vals = Object.values(scores) as number[]
    setOverall(vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0)

    // Health
    if (data.sensor_health) setHealth(data.sensor_health)

    // Validation (uses freshly computed next history)
    const validation: SensorValidation = {}
    for (const k of Object.keys(data.readings) as (keyof SensorReadings)[]) {
      const h = data.sensor_health?.[k]
      validation[k] = detectValidation(k, next[k] ?? [], h?.online ?? true)
    }
    setValidation(validation)
  }, [data, activeZone.recipe])

  return { status, data, history, recipeMatch, overallMatch, sensorHealth, sensorValidation }
}
