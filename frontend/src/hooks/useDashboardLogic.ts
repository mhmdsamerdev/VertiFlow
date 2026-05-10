import { useMemo } from 'react'
import { useZoneContext } from '../context/ZoneContext'
import { useTelemetry } from './useTelemetry'
import { SensorReadings, SensorHealthMap, GoldenState, ActuatorId } from '../types/telemetry'
import { deriveStage, daysRemaining } from '../types/farm'
import { useAlerts } from './useAlerts'
import { useAutomationLogs } from './useAutomationLogs'

export type Priority = 'critical' | 'warning' | 'info'

export interface ActionItem {
  id: string
  zoneId: string
  zoneName: string
  priority: Priority
  title: string
  message: string
  recommendation: string
  actionLabel?: string
  actionTarget?: ActuatorId
  actionValue?: boolean
}

export interface ZoneHealth {
  id: string
  name: string
  cropName: string
  score: number
  status: 'healthy' | 'warning' | 'critical'
  readings: Partial<Record<keyof SensorReadings, { value: number | null; status: 'ok' | 'warn' | 'crit' }>>
  daysToHarvest: number | null
}

export function useDashboardLogic() {
  const { data, sensorHealth, sensorValidation, recipeMatch, overallMatch } = useTelemetry()
  const { farms, activeZone, cycles } = useZoneContext()
  const { alerts } = useAlerts()
  const { logs } = useAutomationLogs()

  const allZones = useMemo(() => farms.flatMap(f => f.zones), [farms])

  const zoneHealths = useMemo(() => {
    return allZones.map(zone => {
      const readings = data?.readings
      const recipe = zone.recipe
      const health = sensorHealth
      const cycle = cycles[zone.id]
      
      let score = 100
      let penalty = 0
      const zoneReadings: ZoneHealth['readings'] = {}

      // Penalty logic
      const checkRange = (key: keyof SensorReadings, weight: number) => {
        if (!readings || !recipe[key]) return
        const val = readings[key]
        if (val === null) return // Live mode disconnected sensor - handled by offline penalty

        const { critMin, critMax, warnMin, warnMax } = recipe[key]
        
        if (val < critMin || val > critMax) {
          penalty += weight
          zoneReadings[key] = { value: val, status: 'crit' }
        } else if (val < warnMin || val > warnMax) {
          penalty += weight / 2
          zoneReadings[key] = { value: val, status: 'warn' }
        } else {
          zoneReadings[key] = { value: val, status: 'ok' }
        }
      }

      checkRange('air_temp', 15)
      checkRange('humidity', 15)
      checkRange('soil_moisture', 15)
      checkRange('ph', 15)

      // Device offline penalty
      let offlineCount = 0
      if (health) {
        Object.values(health).forEach(h => {
          if (!h.online) {
            penalty += 15 // Increased from 5
            offlineCount++
          }
        })
      }

      // If in Live Mode and everything is null/offline, score is 0
      const isLive = data?.is_demo === false
      const allNull = ['air_temp', 'humidity', 'soil_moisture', 'ph'].every(k => readings?.[k as keyof SensorReadings] === null)
      
      if (isLive && allNull) {
        score = 0
      } else {
        score = Math.max(0, 100 - penalty)
        if (penalty === 0 && !allNull) score = Math.min(100, score + 5)
      }

      const status = score > 85 ? 'healthy' : score > 60 ? 'warning' : 'critical'

      return {
        id: zone.id,
        name: zone.name,
        cropName: zone.cropName,
        score,
        status,
        readings: zoneReadings,
        daysToHarvest: cycle ? daysRemaining(cycle.plantedAt, cycle.expectedDays) : null
      } as ZoneHealth
    })
  }, [allZones, data, sensorHealth, cycles])

  const farmHealthScore = useMemo(() => {
    if (zoneHealths.length === 0) return 100
    return Math.round(zoneHealths.reduce((acc, z) => acc + z.score, 0) / zoneHealths.length)
  }, [zoneHealths])

  const minDaysToHarvest = useMemo(() => {
    const valid = zoneHealths.filter(z => z.daysToHarvest !== null && z.daysToHarvest > 0)
    if (valid.length === 0) return null
    return Math.min(...valid.map(z => z.daysToHarvest!))
  }, [zoneHealths])

  const harvestLayer = useMemo(() => {
    const valid = zoneHealths.filter(z => z.daysToHarvest !== null && z.daysToHarvest > 0)
    if (valid.length === 0) return null
    return valid.find(z => z.daysToHarvest === minDaysToHarvest) || null
  }, [zoneHealths, minDaysToHarvest])

  const actionItems = useMemo(() => {
    const items: ActionItem[] = []
    const isLive = data?.is_demo === false

    // ── 1. REAL BACKEND ALERTS (from DB, polled every 10s) ───────────────────
    if (alerts?.recent) {
      alerts.recent.slice(0, 10).forEach(alert => {
        if (alert.acknowledged) return
        const titleMap: Record<string, string> = {
          'DEVICE_OFFLINE':   'Sensor Connection Lost',
          'BATTERY_CRITICAL': 'Critical Battery Failure',
          'BATTERY_LOW':      'Battery Low Warning',
          'SYSTEM_CONFLICT':  'System Safety Conflict',
          'SENSOR_ERROR':     'Sensor Hardware Error',
          'HARVEST_READY':    'Harvest Window Open',
          'HARVEST_OVERDUE':  'Harvest Overdue',
        }
        items.push({
          id: `alert-${alert.time}-${alert.alert_type}`,
          zoneId: activeZone?.id || 'unknown',
          zoneName: activeZone?.name || 'Farm',
          priority: alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'info',
          title: titleMap[alert.alert_type] || alert.alert_type.replace(/_/g, ' '),
          message: alert.message,
          recommendation: alert.severity === 'critical' ? 'Immediate action required' : 'Review system status',
        })
      })
    }

    // ── 2. REAL-TIME SENSOR HEALTH (battery, signal) ─────────────────────────
    // These fire immediately from the live telemetry stream — no DB round-trip needed.
    if (sensorHealth && activeZone) {
      const SENSOR_LABELS: Partial<Record<keyof SensorReadings, string>> = {
        ph: 'pH', ec: 'EC', air_temp: 'Air Temp', humidity: 'Humidity',
        soil_moisture: 'Soil Moisture', light_intensity: 'Light', co2: 'CO₂',
      }
      Object.entries(sensorHealth).forEach(([key, h]) => {
        if (!h) return
        const label = SENSOR_LABELS[key as keyof SensorReadings] || key

        // Sensor offline (real-time, from telemetry health map)
        if (!h.online) {
          const existsId = `health-offline-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'critical',
              title: `${label} Sensor Offline`,
              message: `The ${label} sensor has stopped responding.`,
              recommendation: 'Check sensor power and network connection.',
            })
          }
        }

        // Battery critical (≤ 5%)
        if (h.battery !== null && h.battery <= 5) {
          const existsId = `health-batt-crit-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'critical',
              title: `${label} Battery Critical`,
              message: `${label} battery is at ${h.battery.toFixed(0)}%. Replace immediately or sensor will go offline.`,
              recommendation: 'Replace or recharge the sensor battery now.',
            })
          }
        }
        // Battery low (≤ 20%)
        else if (h.battery !== null && h.battery <= 20) {
          const existsId = `health-batt-low-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'warning',
              title: `${label} Battery Low`,
              message: `${label} battery is at ${h.battery.toFixed(0)}%. Plan a replacement soon.`,
              recommendation: 'Schedule a battery replacement or recharge before the sensor disconnects.',
            })
          }
        }

        // Weak signal (≤ 20%)
        if (h.signal !== null && h.signal <= 20 && h.online) {
          const existsId = `health-signal-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'warning',
              title: `${label} Weak Signal`,
              message: `${label} sensor signal is at ${h.signal.toFixed(0)}% — readings may become unreliable.`,
              recommendation: 'Move the sensor closer to the gateway or add a repeater.',
            })
          }
        }
      })
    }

    // ── 3. REAL-TIME SENSOR VALIDATION (spike, frozen) ───────────────────────
    if (sensorValidation && activeZone) {
      const SENSOR_LABELS: Partial<Record<keyof SensorReadings, string>> = {
        ph: 'pH', ec: 'EC', air_temp: 'Air Temp', humidity: 'Humidity',
        soil_moisture: 'Soil Moisture', light_intensity: 'Light', co2: 'CO₂',
      }
      Object.entries(sensorValidation).forEach(([key, v]) => {
        if (!v || v.status === 'ok' || v.status === 'offline') return // offline handled above
        const label = SENSOR_LABELS[key as keyof SensorReadings] || key

        if (v.status === 'spike') {
          const existsId = `val-spike-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'warning',
              title: `${label} Reading Spike Detected`,
              message: `The ${label} sensor reported an abnormal reading jump. May indicate sensor fault or physical disturbance.`,
              recommendation: 'Verify the sensor placement and check for physical interference or hardware fault.',
            })
          }
        }

        if (v.status === 'frozen') {
          const existsId = `val-frozen-${key}-${activeZone.id}`
          if (!items.find(i => i.id === existsId)) {
            items.push({
              id: existsId,
              zoneId: activeZone.id,
              zoneName: activeZone.name,
              priority: 'warning',
              title: `${label} Reading Frozen`,
              message: `The ${label} sensor has reported the exact same value for an unusually long time. Sensor may be stuck.`,
              recommendation: 'Power-cycle the sensor or clean its probe to restore accurate readings.',
            })
          }
        }
      })
    }

    // ── 4. REAL-TIME ZONE READINGS (out-of-range, missing hardware) ──────────
    zoneHealths.forEach(zh => {
      const zone = allZones.find(z => z.id === zh.id)
      if (!zone) return

      // 4a. Live Mode — no hardware connected at all
      if (isLive && zh.score === 0) {
        const exists = items.find(i => i.zoneId === zh.id && i.id.startsWith('disconnected-'))
        if (!exists) {
          items.push({
            id: `disconnected-${zh.id}`,
            zoneId: zh.id,
            zoneName: zh.name,
            priority: 'critical',
            title: 'No Hardware Connected',
            message: `${zh.name} has no sensors reporting data. All readings are unavailable.`,
            recommendation: 'Connect your IoT sensors and ensure they are powered on and within network range.',
          })
        }
        return
      }

      // 4b. Reading-specific alerts (works for both Demo and Live with real data)
      const checkReading = (
        key: keyof typeof zh.readings,
        label: string,
        unit: string,
        highAction?: ActionItem['actionTarget'],
        lowAction?: ActionItem['actionTarget'],
      ) => {
        const r = zh.readings[key]
        if (!r || r.value === null) return
        const alreadyCovered = items.find(i => i.zoneId === zh.id && i.message.toLowerCase().includes(label.toLowerCase()))
        if (alreadyCovered) return

        const val = r.value as number
        const recipe = zone.recipe[key as keyof typeof zone.recipe] as any
        const isHigh = recipe && val > recipe.target

        if (r.status === 'crit') {
          items.push({
            id: `${key}-crit-${zh.id}`,
            zoneId: zh.id,
            zoneName: zh.name,
            priority: 'critical',
            title: `${label} Critical`,
            message: `${zh.name}: ${label} is at ${val.toFixed(1)}${unit} — outside safe limits.`,
            recommendation: isHigh ? `Reduce ${label.toLowerCase()} immediately` : `Increase ${label.toLowerCase()} immediately`,
            actionTarget: isHigh ? highAction : lowAction,
            actionValue: true,
          })
        } else if (r.status === 'warn') {
          items.push({
            id: `${key}-warn-${zh.id}`,
            zoneId: zh.id,
            zoneName: zh.name,
            priority: 'warning',
            title: `${label} Out of Range`,
            message: `${zh.name}: ${label} is at ${val.toFixed(1)}${unit} — approaching limits.`,
            recommendation: isHigh ? `Monitor and consider reducing ${label.toLowerCase()}` : `Monitor and consider increasing ${label.toLowerCase()}`,
            actionTarget: isHigh ? highAction : lowAction,
            actionValue: true,
          })
        }
      }

      checkReading('air_temp',        'Temperature',   '°C',          'cooling_fan',  'heater')
      checkReading('humidity',        'Humidity',      '%',           'dehumidifier', undefined)
      checkReading('soil_moisture',   'Soil Moisture', '%',           undefined,      'water_pump')
      checkReading('ph',              'pH Level',      '',            'ph_adjuster',  'ph_adjuster')
      checkReading('light_intensity', 'Light',         ' µmol/m²/s', undefined,      'led_lights')

      // 4c. Zone-level catch-all when score is critical/warning but no specific reading flagged
      if (zh.status === 'critical' && !items.find(i => i.zoneId === zh.id)) {
        items.push({
          id: `zone-critical-${zh.id}`,
          zoneId: zh.id,
          zoneName: zh.name,
          priority: 'critical',
          title: 'Zone in Critical State',
          message: `${zh.name} health is at ${zh.score}%. Multiple parameters are outside safe limits.`,
          recommendation: 'Review all sensor readings and take corrective action immediately.',
        })
      } else if (zh.status === 'warning' && !items.find(i => i.zoneId === zh.id && i.priority !== 'info')) {
        items.push({
          id: `zone-warning-${zh.id}`,
          zoneId: zh.id,
          zoneName: zh.name,
          priority: 'warning',
          title: 'Zone Needs Attention',
          message: `${zh.name} health is at ${zh.score}%. Some parameters are drifting from optimal.`,
          recommendation: 'Check sensor readings and consider adjusting your automation rules.',
        })
      }
    })

    return items.sort((a, b) => {
      const pMap = { critical: 0, warning: 1, info: 2 }
      return pMap[a.priority] - pMap[b.priority]
    })
  }, [zoneHealths, allZones, alerts, activeZone, data?.is_demo, sensorHealth, sensorValidation])

  return {
    farmHealthScore,
    zoneHealths,
    actionItems,
    minDaysToHarvest,
    harvestLayer,
    automationLogs: logs,
    overallStatus: farmHealthScore > 85 ? 'HEALTHY' : farmHealthScore > 60 ? 'ATTENTION NEEDED' : 'CRITICAL',
    trending: (farmHealthScore > 90 ? 'stable' : farmHealthScore > 75 ? 'declining' : 'critical') as 'stable' | 'declining' | 'critical'
  }
}
