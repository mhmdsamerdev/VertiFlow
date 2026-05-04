// ─── Connection ────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// ─── Payload shapes (mirror backend Pydantic models) ──────────────────────────
export interface SensorReadings {
  ph: number
  ec: number
  water_temp: number
  air_temp: number
  humidity: number
  water_level: number
  light_intensity: number
  dissolved_oxygen: number
}

export interface ActuatorStates {
  oxygen_pump: boolean
  led_array: boolean
  nutrient_doser: boolean
}

export interface TelemetryPayload {
  timestamp: string
  farm_id: string
  zone_id: string
  readings: SensorReadings
  actuators: ActuatorStates
}

// ─── History buffer ────────────────────────────────────────────────────────────
export interface HistoryPoint {
  value: number
  ts: number
}

export type SensorHistory = Partial<Record<keyof SensorReadings, HistoryPoint[]>>

// ─── Golden-state recipe definition ───────────────────────────────────────────
export interface SensorThreshold {
  target: number
  warnMin: number
  warnMax: number
  critMin: number
  critMax: number
}

export type GoldenState = Record<keyof SensorReadings, SensorThreshold>

// ─── UI display metadata per sensor ───────────────────────────────────────────
export interface SensorMeta {
  key: keyof SensorReadings
  label: string
  unit: string
  decimals: number
}
