// ─── Settings Types ───────────────────────────────────────────────────────────

export type SettingsSection =
  | 'farm-info'
  | 'devices-sensors'
  | 'automation-rules'
  | 'alerts'
  | 'reports'

// ─── Farm Info ────────────────────────────────────────────────────────────────
export interface FarmInfo {
  name: string
  location: string
  description: string
}

export interface ZoneInfo {
  id: string
  name: string
  farmId: string
  location: string
  description: string
}

// ─── Devices & Sensors ──────────────────────────────────────────────────────
export type DeviceType = 'sensor' | 'actuator' | 'gateway' | 'camera'
export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error' | 'warning'

export interface Device {
  id: string
  name: string
  type: DeviceType
  zoneId: string
  status: DeviceStatus
  batteryLevel?: number
  lastSeen: string
  firmwareVersion?: string
}

export type SensorType = 'ph' | 'ec' | 'air_temp' | 'humidity' | 'soil_moisture' | 'light_intensity' | 'co2'

export interface SensorThresholds {
  sensorType: SensorType
  min: number
  max: number
  target: number
  warningOffset: number
  criticalOffset: number
}

export interface CalibrationEntry {
  sensorId: string
  sensorType: SensorType
  lastCalibrated: string
  offset: number
  slope: number
}

// ─── Automation Rules ───────────────────────────────────────────────────────
export type RuleOperator = '>' | '<' | '>=' | '<=' | '==' | '!='
export type RuleActionType = 'turn_on' | 'turn_off' | 'set_value' | 'send_alert'

export interface RuleCondition {
  sensorType: SensorType
  operator: RuleOperator
  value: number
}

export interface RuleAction {
  type: RuleActionType
  deviceId: string
  params?: Record<string, number | string>
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  enabled: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  createdAt: string
  lastTriggered?: string
  triggerCount: number
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export type AlertSeverity = 'info' | 'warning' | 'critical'
export type NotificationChannel = 'email' | 'sms' | 'push' | 'webhook'

export interface AlertConfig {
  id: string
  name: string
  severity: AlertSeverity
  enabled: boolean
  conditions: {
    sensorType: SensorType
    operator: RuleOperator
    value: number
  }[]
}

export interface NotificationSettings {
  channels: NotificationChannel[]
  emailRecipients: string[]
  smsNumbers: string[]
  webhookUrl?: string
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReportType = 'analytics_24h' | 'analytics_7d' | 'analytics_30d'

export interface ReportSchedule {
  id: string
  name: string
  enabled: boolean
  frequency: ReportFrequency
  reportType: ReportType
  recipients: string[]
  includeMetrics: SensorType[]
  lastSent?: string
  nextSend: string
}

export interface SentReport {
  id: string
  scheduleId: string
  sentAt: string
  recipients: string[]
  type: ReportType
  status: 'sent' | 'failed' | 'partial'
}
