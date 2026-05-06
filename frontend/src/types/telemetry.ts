// ─── Connection ────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// ─── Payload shapes (mirror backend Pydantic models) ──────────────────────────
export interface SensorReadings {
  ph: number
  ec: number
  air_temp: number
  humidity: number
  soil_moisture: number
  light_intensity: number
  co2: number
}

export interface ActuatorStates {
  oxygen_pump: boolean
  led_array: boolean
  nutrient_doser: boolean
}

export interface TelemetryPayload {
  timestamp:     string
  farm_id:       string
  zone_id:       string
  readings:      SensorReadings
  actuators:     ActuatorStates
  sensor_health: SensorHealthMap
}

// ─── Sensor health ─────────────────────────────────────────────────────────────
export interface SensorHealthEntry {
  battery: number
  signal:  number
  online:  boolean
}

export type SensorHealthMap = Record<keyof SensorReadings, SensorHealthEntry>

// ─── Validation ────────────────────────────────────────────────────────────────
export type ValidationStatus = 'ok' | 'frozen' | 'spike' | 'offline'

export interface ValidationResult {
  status:  ValidationStatus
  message: string
}

export type SensorValidation = Partial<Record<keyof SensorReadings, ValidationResult>>

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
