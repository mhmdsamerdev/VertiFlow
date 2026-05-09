import { apiFetch } from './client'
import { GoldenState } from '../types/telemetry'

// ─── API shapes (mirror backend Pydantic responses) ───────────────────────────

export interface ApiFarm {
  id: string
  name: string
  location: string
  description: string
  created_at: string
}

export interface ApiZone {
  id: string
  farm_id: string
  name: string
  description: string
  crop_name: string
  system_type: string
  layer_index: number
  created_at: string
}

export interface ApiThreshold {
  zone_id: string
  sensor_type: string
  target: number
  warn_min: number
  warn_max: number
  crit_min: number
  crit_max: number
  updated_at: string
}

export interface ApiDevice {
  id: string
  zone_id: string
  name: string
  type: string
  hardware_type: string | null
  sensor_type: string | null
  status: string
  signal_strength: number | null
  firmware_version: string | null
  calibration_offset: number
  calibration_slope: number
  last_seen: string | null
  created_at: string
  api_key?: string
}

export interface ApiDeviceCredentials {
  device_id: string
  name?: string
  api_key: string
  api_key_updated_at: string
}

export interface ApiRule {
  id: string
  zone_id: string
  name: string
  description: string
  enabled: boolean
  conditions: RuleCondition[]
  actions: RuleAction[]
  trigger_count: number
  last_triggered: string | null
  created_at: string
}

export interface RuleCondition {
  sensor_type: string
  operator: string
  value: number
}

export interface RuleAction {
  type: string
  device_id: string
  params?: Record<string, number | string>
}

export interface ApiAlertConfig {
  id: string
  zone_id: string
  name: string
  severity: string
  enabled: boolean
  conditions: Array<{ sensor_type: string; operator: string; value: number }>
  channels: string[]
  created_at: string
}

export interface ApiCycle {
  id: string
  zone_id: string
  crop_name: string
  planted_at: string
  expected_days: number
  harvest_record: {
    harvested_at: string
    yield_kg: number
    quality_grade: string
    notes: string
  } | null
  completed_at: string | null
  created_at: string
}

// ─── Farms ────────────────────────────────────────────────────────────────────

export const farmApi = {
  list: () => apiFetch<ApiFarm[]>('/config/farms'),
  create: (data: { name: string; location?: string; description?: string }) =>
    apiFetch<ApiFarm>('/config/farms', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{ name: string; location: string; description: string }>) =>
    apiFetch<ApiFarm>(`/config/farms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/config/farms/${id}`, { method: 'DELETE' }),
}

// ─── Zones ────────────────────────────────────────────────────────────────────

export const zoneApi = {
  list: (farmId?: string) =>
    apiFetch<ApiZone[]>(farmId ? `/config/zones?farm_id=${farmId}` : '/config/zones'),
  create: (data: {
    farm_id: string; name: string; description?: string
    crop_name?: string; system_type?: string; layer_index?: number
  }) => apiFetch<ApiZone>('/config/zones', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    name: string; description: string; crop_name: string
    system_type: string; layer_index: number
  }>) => apiFetch<ApiZone>(`/config/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/config/zones/${id}`, { method: 'DELETE' }),
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

export const thresholdApi = {
  get: (zoneId: string) =>
    apiFetch<ApiThreshold[]>(`/config/thresholds?zone_id=${zoneId}`),
  upsert: (zoneId: string, thresholds: Array<{
    sensor_type: string; target: number
    warn_min: number; warn_max: number; crit_min: number; crit_max: number
  }>) =>
    apiFetch<ApiThreshold[]>(`/config/thresholds/${zoneId}`, {
      method: 'PUT', body: JSON.stringify(thresholds),
    }),
}

/** Convert API threshold array to GoldenState shape used by frontend. */
export function thresholdsToGoldenState(thresholds: ApiThreshold[]): Partial<GoldenState> {
  const gs: Partial<GoldenState> = {}
  for (const t of thresholds) {
    const k = t.sensor_type as keyof GoldenState
    gs[k] = {
      target:  t.target,
      warnMin: t.warn_min,
      warnMax: t.warn_max,
      critMin: t.crit_min,
      critMax: t.crit_max,
    }
  }
  return gs
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export const deviceApi = {
  list: (zoneId?: string) =>
    apiFetch<ApiDevice[]>(zoneId ? `/config/devices?zone_id=${zoneId}` : '/config/devices'),
  create: (data: {
    zone_id: string; name: string; type?: string; hardware_type?: string; sensor_type?: string
    firmware_version?: string; calibration_offset?: number; calibration_slope?: number
  }) => apiFetch<ApiDevice>('/config/devices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    zone_id: string; name: string; type: string; hardware_type: string; sensor_type: string; status: string
    firmware_version: string; calibration_offset: number; calibration_slope: number
  }>) => apiFetch<ApiDevice>(`/config/devices/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/config/devices/${id}`, { method: 'DELETE' }),
  getCredentials: (id: string) =>
    apiFetch<ApiDeviceCredentials>(`/config/devices/${id}/credentials`),
  resetKey: (id: string) =>
    apiFetch<ApiDeviceCredentials>(`/config/devices/${id}/reset-key`, { method: 'POST' }),
}

// ─── Automation Rules ─────────────────────────────────────────────────────────

export const ruleApi = {
  list: (zoneId?: string) =>
    apiFetch<ApiRule[]>(zoneId ? `/config/rules?zone_id=${zoneId}` : '/config/rules'),
  create: (data: {
    zone_id: string; name: string; description?: string
    enabled?: boolean; conditions?: RuleCondition[]; actions?: RuleAction[]
  }) => apiFetch<ApiRule>('/config/rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    name: string; description: string; enabled: boolean
    conditions: RuleCondition[]; actions: RuleAction[]
  }>) => apiFetch<ApiRule>(`/config/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggle: (id: string) =>
    apiFetch<ApiRule>(`/config/rules/${id}/toggle`, { method: 'PATCH' }),
  delete: (id: string) =>
    apiFetch<void>(`/config/rules/${id}`, { method: 'DELETE' }),
}

// ─── Alert Configs ────────────────────────────────────────────────────────────

export const alertConfigApi = {
  list: (zoneId?: string) =>
    apiFetch<ApiAlertConfig[]>(zoneId ? `/config/alerts?zone_id=${zoneId}` : '/config/alerts'),
  create: (data: {
    zone_id: string; name: string; severity?: string; enabled?: boolean
    conditions?: Array<{ sensor_type: string; operator: string; value: number }>
    channels?: string[]
  }) => apiFetch<ApiAlertConfig>('/config/alerts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<{
    name: string; severity: string; enabled: boolean
    conditions: Array<{ sensor_type: string; operator: string; value: number }>
    channels: string[]
  }>) => apiFetch<ApiAlertConfig>(`/config/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/config/alerts/${id}`, { method: 'DELETE' }),
}

// ─── Grow Cycles ──────────────────────────────────────────────────────────────

export const cycleApi = {
  list: (zoneId?: string) =>
    apiFetch<ApiCycle[]>(zoneId ? `/config/cycles?zone_id=${zoneId}` : '/config/cycles'),
  create: (data: {
    zone_id: string; crop_name: string; planted_at: string; expected_days: number
  }) => apiFetch<ApiCycle>('/config/cycles', { method: 'POST', body: JSON.stringify(data) }),
  harvest: (id: string, data: { yield_kg: number; quality_grade: string; notes?: string }) =>
    apiFetch<ApiCycle>(`/config/cycles/${id}/harvest`, { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<void>(`/config/cycles/${id}`, { method: 'DELETE' }),
}

// ─── Report Schedules ─────────────────────────────────────────────────────────

export interface ApiReportSchedule {
  id: string
  name: string
  enabled: boolean
  frequency: string
  report_type: string
  recipients: string[]
  metrics: string[]
  last_sent: string | null
  created_at: string
}

export const reportApi = {
  list: () =>
    apiFetch<ApiReportSchedule[]>('/config/reports/schedules'),
  create: (data: {
    name: string; enabled?: boolean; frequency?: string; report_type?: string
    recipients?: string[]; metrics?: string[]
  }) => apiFetch<ApiReportSchedule>('/config/reports/schedules', {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<{
    name: string; enabled: boolean; frequency: string; report_type: string
    recipients: string[]; metrics: string[]
  }>) => apiFetch<ApiReportSchedule>(`/config/reports/schedules/${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  toggle: (id: string) =>
    apiFetch<ApiReportSchedule>(`/config/reports/schedules/${id}/toggle`, { method: 'PATCH' }),
  delete: (id: string) =>
    apiFetch<void>(`/config/reports/schedules/${id}`, { method: 'DELETE' }),
  history: () =>
    apiFetch<[]>('/config/reports/history'),
}
