import { useMemo } from 'react'
import { useZoneContext } from '../context/ZoneContext'
import { useTelemetry } from './useTelemetry'
import { SensorReadings, SensorHealthMap, GoldenState, ActuatorId } from '../types/telemetry'
import { deriveStage, daysRemaining } from '../types/farm'

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
  score: number
  status: 'healthy' | 'warning' | 'critical'
  readings: Partial<Record<keyof SensorReadings, { value: number; status: 'ok' | 'warn' | 'crit' }>>
  daysToHarvest: number | null
}

export function useDashboardLogic() {
  const { data, sensorHealth, recipeMatch, overallMatch } = useTelemetry()
  const { farms, activeZone, cycles } = useZoneContext()

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

      // Device offline penalty (simplified)
      if (health) {
        Object.values(health).forEach(h => {
          if (!h.online) penalty += 5 // Max 20 overall maybe?
        })
      }

      score = Math.max(0, 100 - penalty)
      if (penalty === 0) score = Math.min(100, score + 5)

      const status = score > 85 ? 'healthy' : score > 60 ? 'warning' : 'critical'

      return {
        id: zone.id,
        name: zone.name,
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

  const actionItems = useMemo(() => {
    const items: ActionItem[] = []

    zoneHealths.forEach(zh => {
      const readings = zh.readings
      const zone = allZones.find(z => z.id === zh.id)
      if (!zone) return

      // Temp Critical
      if (readings.air_temp?.status === 'crit') {
        items.push({
          id: `temp-crit-${zh.id}`,
          zoneId: zh.id,
          zoneName: zh.name,
          priority: 'critical',
          title: `Temperature too ${readings.air_temp.value > zone.recipe.air_temp.target ? 'high' : 'low'} (${readings.air_temp.value.toFixed(1)}°C)`,
          message: `Expected: ${zone.recipe.air_temp.warnMin}-${zone.recipe.air_temp.warnMax}°C`,
          recommendation: readings.air_temp.value > zone.recipe.air_temp.target ? 'Turn on cooling fan' : 'Turn on heater',
          actionLabel: readings.air_temp.value > zone.recipe.air_temp.target ? 'Turn ON Fan' : 'Turn ON Heater',
          actionTarget: readings.air_temp.value > zone.recipe.air_temp.target ? 'cooling_fan' : 'heater',
          actionValue: true
        })
      }

      // Humidity Warning
      if (readings.humidity?.status === 'warn') {
        items.push({
          id: `humid-warn-${zh.id}`,
          zoneId: zh.id,
          zoneName: zh.name,
          priority: 'warning',
          title: `Humidity rising (${readings.humidity.value.toFixed(0)}%)`,
          message: `Expected: ${zone.recipe.humidity.warnMin}-${zone.recipe.humidity.warnMax}%`,
          recommendation: 'Increase ventilation',
          actionLabel: 'Turn on fan 50%',
          actionTarget: 'cooling_fan',
          actionValue: true
        })
      }

      // Harvest window
      if (zh.daysToHarvest !== null && zh.daysToHarvest <= 2) {
        items.push({
          id: `harvest-${zh.id}`,
          zoneId: zh.id,
          zoneName: zh.name,
          priority: 'warning',
          title: `${zone.cropName} harvest window closing`,
          message: `Ready to harvest: Last ${zh.daysToHarvest} days!`,
          recommendation: 'Expected yield: 12kg', // Hardcoded for now per mockup
          actionLabel: 'Harvest Now'
        })
      }
    })

    return items.sort((a, b) => {
      const pMap = { critical: 0, warning: 1, info: 2 }
      return pMap[a.priority] - pMap[b.priority]
    })
  }, [zoneHealths, allZones])

  return {
    farmHealthScore,
    zoneHealths,
    actionItems,
    overallStatus: farmHealthScore > 85 ? 'HEALTHY' : farmHealthScore > 60 ? 'ATTENTION NEEDED' : 'CRITICAL'
  }
}
