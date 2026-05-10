import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react'
import { Farm, Zone, GrowCycle, HarvestRecord } from '../types/farm'
import { GoldenState } from '../types/telemetry'
import {
  farmApi, zoneApi, cycleApi, thresholdApi,
  ApiFarm, ApiZone, ApiCycle,
  thresholdsToGoldenState,
} from '../api/config'

// ─── Default Golden State (Butterhead Lettuce) — used until DB loads ──────────
const DEFAULT_RECIPE: GoldenState = {
  ph:              { target: 6.2,  warnMin: 5.8,  warnMax: 6.8,  critMin: 5.0,  critMax: 7.5  },
  ec:              { target: 1.8,  warnMin: 1.4,  warnMax: 2.2,  critMin: 0.8,  critMax: 3.0  },
  air_temp:        { target: 24.0, warnMin: 20.0, warnMax: 28.0, critMin: 15.0, critMax: 33.0 },
  humidity:        { target: 65.0, warnMin: 55.0, warnMax: 75.0, critMin: 40.0, critMax: 90.0 },
  soil_moisture:   { target: 70.0, warnMin: 50.0, warnMax: 85.0, critMin: 30.0, critMax: 95.0 },
  light_intensity: { target: 500,  warnMin: 350,  warnMax: 650,  critMin: 200,  critMax: 900  },
  co2:             { target: 900,  warnMin: 600,  warnMax: 1200, critMin: 400,  critMax: 1500 },
}

// ─── Converters ───────────────────────────────────────────────────────────────

function apiZoneToZone(az: ApiZone, recipe: GoldenState = DEFAULT_RECIPE): Zone {
  return {
    id:          az.id,
    name:        az.name,
    description: az.description,
    cropName:    az.crop_name,
    systemType:  az.system_type,
    layerIndex:  az.layer_index,
    recipe,
  }
}

function apiFarmToFarm(af: ApiFarm, zones: Zone[]): Farm {
  return { id: af.id, name: af.name, location: af.location, demoMode: af.demo_mode, zones }
}

function apiCycleToGrowCycle(ac: ApiCycle): GrowCycle {
  return {
    id:           ac.id,
    zoneId:       ac.zone_id,
    cropName:     ac.crop_name,
    plantedAt:    ac.planted_at,
    expectedDays: ac.expected_days,
    harvestRecord: ac.harvest_record
      ? {
          harvestedAt:  ac.harvest_record.harvested_at,
          yieldKg:      ac.harvest_record.yield_kg,
          qualityGrade: ac.harvest_record.quality_grade as 'A' | 'B' | 'C',
          notes:        ac.harvest_record.notes,
        }
      : undefined,
  }
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface ZoneContextValue {
  farms:      Farm[]
  activeFarm: Farm | null
  activeZone: Zone | null
  loading:    boolean
  error:      string | null
  setActiveFarm: (farmId: string) => void
  setActiveZone: (zoneId: string) => void
  refetch: () => Promise<void>
  
  // Navigation
  activeTab: string
  setActiveTab: (tab: string) => void

  // Mutations
  addFarm:    (name: string, location: string, description?: string) => Promise<void>
  updateFarm: (id: string, data: { name?: string; location?: string; description?: string; demo_mode?: boolean }) => Promise<void>
  updateFarmDemoMode: (id: string, isDemo: boolean) => Promise<void>
  deleteFarm: (id: string) => Promise<void>
  addZone:    (farmId: string, data: {
    name: string; description?: string; crop_name?: string
    system_type?: string; layer_index?: number
  }) => Promise<void>
  updateZone: (id: string, data: {
    name?: string; description?: string; crop_name?: string
    system_type?: string; layer_index?: number
  }) => Promise<void>
  deleteZone: (id: string) => Promise<void>

  // Grow cycles
  cycles:     Record<string, GrowCycle>       // zoneId → active cycle
  pastCycles: Record<string, GrowCycle[]>     // zoneId → completed cycles
  startCycle: (zoneId: string, cropName: string, expectedDays: number) => Promise<void>
  logHarvest: (cycleId: string, data: { yield_kg: number; quality_grade: string; notes: string }) => Promise<void>
}

const ZoneContext = createContext<ZoneContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [farms, setFarms]             = useState<Farm[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [cycles, setCycles]           = useState<Record<string, GrowCycle>>({})
  const [pastCycles, setPastCycles]   = useState<Record<string, GrowCycle[]>>({})
  const [activeTab, setActiveTab]     = useState('Dashboard')

  // ── Load all farms, zones, thresholds, cycles from API ───────────────────
  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // First, check system health
      const API = import.meta.env.VITE_API_URL ?? '/api'
      const healthRes = await fetch(`${API}/health`).catch(() => null)
      if (healthRes && healthRes.ok) {
        const health = await healthRes.json()
        if (health.database === 'error') {
          setError('Database connection error. Please ensure PostgreSQL/TimescaleDB is running.')
          setLoading(false)
          return
        }
      }

      const [apiFarms, apiZones, apiCycles] = await Promise.all([
        farmApi.list(),
        zoneApi.list(),
        cycleApi.list(),
      ])

      // Build Farm[] with zones, loading thresholds per zone
      const builtFarms: Farm[] = []
      for (const af of apiFarms) {
        const farmZones = apiZones.filter(z => z.farm_id === af.id)
        const zones: Zone[] = []
        for (const az of farmZones) {
          const thresholds = await thresholdApi.get(az.id).catch(() => [])
          const recipe = thresholds.length > 0
            ? { ...DEFAULT_RECIPE, ...thresholdsToGoldenState(thresholds) } as GoldenState
            : DEFAULT_RECIPE
          zones.push(apiZoneToZone(az, recipe))
        }
        builtFarms.push(apiFarmToFarm(af, zones))
      }
      setFarms(builtFarms)

      // Restore or initialise active selections
      setActiveFarmId(prev => {
        if (prev && builtFarms.some(f => f.id === prev)) return prev
        return builtFarms[0]?.id ?? null
      })
      setActiveZoneId(prev => {
        const allZones = builtFarms.flatMap(f => f.zones)
        if (prev && allZones.some(z => z.id === prev)) return prev
        return builtFarms[0]?.zones[0]?.id ?? null
      })

      // Build cycles maps
      const active: Record<string, GrowCycle> = {}
      const past: Record<string, GrowCycle[]> = {}
      for (const ac of apiCycles) {
        const cyc = apiCycleToGrowCycle(ac)
        if (ac.completed_at) {
          past[ac.zone_id] = [cyc, ...(past[ac.zone_id] ?? [])]
        } else {
          active[ac.zone_id] = cyc
        }
      }
      setCycles(active)
      setPastCycles(past)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  // ── Derived selectors ─────────────────────────────────────────────────────
  const activeFarm = farms.find(f => f.id === activeFarmId) ?? null
  const activeZone = activeFarm?.zones.find(z => z.id === activeZoneId) ?? null

  function setActiveFarm(farmId: string) {
    const farm = farms.find(f => f.id === farmId)
    if (!farm) return
    setActiveFarmId(farmId)
    setActiveZoneId(farm.zones[0]?.id ?? null)
  }

  function setActiveZone(zoneId: string) {
    setActiveZoneId(zoneId)
    // Switch farm if zone belongs to another farm
    for (const f of farms) {
      if (f.zones.some(z => z.id === zoneId)) {
        setActiveFarmId(f.id)
        break
      }
    }
  }

  // ── Farm mutations ────────────────────────────────────────────────────────
  const addFarm = useCallback(async (name: string, location: string, description = '') => {
    await farmApi.create({ name, location, description })
    await refetch()
  }, [refetch])

  const updateFarm = useCallback(async (id: string, data: { name?: string; location?: string; description?: string; demo_mode?: boolean }) => {
    await farmApi.update(id, data)
    await refetch()
  }, [refetch])

  const updateFarmDemoMode = useCallback(async (id: string, isDemo: boolean) => {
    await farmApi.update(id, { demo_mode: isDemo })
    await refetch()
  }, [refetch])

  const deleteFarm = useCallback(async (id: string) => {
    await farmApi.delete(id)
    await refetch()
  }, [refetch])

  // ── Zone mutations ────────────────────────────────────────────────────────
  const addZone = useCallback(async (farmId: string, data: {
    name: string; description?: string; crop_name?: string
    system_type?: string; layer_index?: number
  }) => {
    await zoneApi.create({ farm_id: farmId, ...data })
    await refetch()
  }, [refetch])

  const updateZone = useCallback(async (id: string, data: {
    name?: string; description?: string; crop_name?: string
    system_type?: string; layer_index?: number
  }) => {
    await zoneApi.update(id, data)
    await refetch()
  }, [refetch])

  const deleteZone = useCallback(async (id: string) => {
    await zoneApi.delete(id)
    await refetch()
  }, [refetch])

  // ── Grow cycle mutations ──────────────────────────────────────────────────
  const startCycle = useCallback(async (zoneId: string, cropName: string, expectedDays: number) => {
    await cycleApi.create({ zone_id: zoneId, crop_name: cropName,
                            planted_at: new Date().toISOString(), expected_days: expectedDays })
    await refetch()
  }, [refetch])

  const logHarvest = useCallback(async (
    cycleId: string,
    data: { yield_kg: number; quality_grade: string; notes: string },
  ) => {
    await cycleApi.harvest(cycleId, data)
    await refetch()
  }, [refetch])

  return (
    <ZoneContext.Provider value={{
      farms, activeFarm, activeZone, loading, error,
      setActiveFarm, setActiveZone, refetch,
      activeTab, setActiveTab,
      addFarm, updateFarm, updateFarmDemoMode, deleteFarm,
      addZone, updateZone, deleteZone,
      cycles, pastCycles, startCycle, logHarvest,
    }}>
      {children}
    </ZoneContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useZoneContext(): ZoneContextValue {
  const ctx = useContext(ZoneContext)
  if (!ctx) throw new Error('useZoneContext must be used inside <ZoneProvider>')
  return ctx
}
