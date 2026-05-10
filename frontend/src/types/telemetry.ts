// ─── Connection ────────────────────────────────────────────────────────────────
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// ─── Payload shapes (mirror backend Pydantic models) ──────────────────────────
export interface SensorReadings {
  ph: number | null
  ec: number | null
  air_temp: number | null
  humidity: number | null
  soil_moisture: number | null
  light_intensity: number | null
  co2: number | null
}

export type ActuatorId   = 'cooling_fan' | 'water_pump' | 'heater' | 'dehumidifier' | 'led_lights' | 'ph_adjuster'
export type ActuatorMode = 'auto' | 'manual'

export interface ActuatorParams {
  speed:            number | null
  brightness:       number | null
  color_spectrum:   string | null
  duration_minutes: number | null
  dose_amount:      number | null
}

export interface ActuatorEntry {
  state:  boolean
  mode:   ActuatorMode
  params: ActuatorParams
}

export type ActuatorStates = Record<ActuatorId, ActuatorEntry>

export interface TelemetryPayload {
  timestamp:     string
  farm_id:       string
  zone_id:       string
  readings:      SensorReadings
  actuators:     ActuatorStates
  sensor_health: SensorHealthMap
  is_demo:       boolean
}

// ─── Sensor health ─────────────────────────────────────────────────────────────
export interface SensorHealthEntry {
  battery: number | null
  signal:  number | null
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
  value: number | null
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
