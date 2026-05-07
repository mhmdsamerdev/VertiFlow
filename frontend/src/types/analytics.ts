import { SensorReadings } from './telemetry'

// ── Time range ──────────────────────────────────────────────────────────────

export interface TimeRange {
  label:  string
  hours:  number
  bucket: string
}

export const TIME_RANGES: TimeRange[] = [
  { label: '1H',  hours: 1,   bucket: '5 minutes'  },
  { label: '6H',  hours: 6,   bucket: '15 minutes' },
  { label: '24H', hours: 24,  bucket: '1 hour'     },
  { label: '7D',  hours: 168, bucket: '6 hours'    },
  { label: '30D', hours: 720, bucket: '1 day'      },
]

// ── Sensor readings (time-bucketed) ────────────────────────────────────────

export type ReadingBucket = {
  ts: string
} & Partial<Record<keyof SensorReadings, number | null>>

// ── Period statistics ───────────────────────────────────────────────────────

export interface SensorStat {
  avg: number
  min: number
  max: number
}

export type PeriodStats = Partial<Record<keyof SensorReadings, SensorStat>>

// ── Actuator actions ────────────────────────────────────────────────────────

export interface ActionEvent {
  time:         string
  actuator_id:  string
  action:       'ON' | 'OFF'
  mode:         string
  triggered_by: string
  params:       Record<string, unknown> | null
  auto_off_at:  string | null
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface AlertDay {
  day:      string
  critical: number
  warning:  number
  info:     number
}

export interface AlertBreakdown {
  critical: number
  warning:  number
  info:     number
}

export interface AlertItem {
  time:            string
  device_id:       string
  alert_type:      string
  severity:        string
  message:         string | null
  acknowledged:    boolean
  acknowledged_at: string | null
}

export interface AlertsData {
  by_day:    AlertDay[]
  breakdown: AlertBreakdown
  recent:    AlertItem[]
}

// ── Harvests ────────────────────────────────────────────────────────────────

export interface HarvestBucket {
  date: string
  [crop_type: string]: number | string
}

export interface HarvestsData {
  buckets:    HarvestBucket[]
  crop_types: string[]
}

// ── Maintenance ─────────────────────────────────────────────────────────────

export interface MaintenanceItem {
  time:             string
  device_id:        string | null
  task_type:        string
  description:      string
  performed_by:     string
  cost:             number | null
  duration_minutes: number | null
  notes:            string | null
}

// ── Aggregated hook result ──────────────────────────────────────────────────

export interface AnalyticsData {
  readings:    ReadingBucket[]
  stats:       PeriodStats
  actions:     ActionEvent[]
  alerts:      AlertsData
  harvests:    HarvestsData
  maintenance: MaintenanceItem[]
  loading:     boolean
  error:       string | null
}
