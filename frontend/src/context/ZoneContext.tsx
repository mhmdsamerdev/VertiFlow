import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react'
import { Farm, Zone, GrowCycle, HarvestRecord } from '../types/farm'
import { GoldenState } from '../types/telemetry'
import { farmApi, zoneApi, cycleApi, thresholdApi,
  ApiFarm, ApiZone, ApiCycle,
  thresholdsToGoldenState,
} from '../api/config'
import { BASE, subscribeToSpinUp, SpinUpStatus } from '../api/client'
import { useAuth } from './AuthContext'
import { supabase } from '../auth'

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
  spinUpStatus: SpinUpStatus
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
  const { profile } = useAuth()
  const [farms, setFarms]             = useState<Farm[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [cycles, setCycles]           = useState<Record<string, GrowCycle>>({})
  const [pastCycles, setPastCycles]   = useState<Record<string, GrowCycle[]>>({})
  const [activeTab, setActiveTab]     = useState('Dashboard')
  const [spinUpStatus, setSpinUpStatus] = useState<SpinUpStatus>({
    isSpinningUp: false,
    attempt: 0,
    maxAttempts: 14,
    message: ''
  })

  useEffect(() => {
    return subscribeToSpinUp(status => {
      setSpinUpStatus(status)
    })
  }, [])

  // ── Load all farms, zones, thresholds, cycles from API ───────────────────
  const refetch = useCallback(async () => {
    if (!profile) {
      setFarms([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Fetch all farms associated with this identity
      const apiFarms = await farmApi.list()
      
      if (apiFarms.length === 0) {
        setFarms([])
        setLoading(false)
        return
      }

      // If no active farm is stored or the stored one is gone, use the first one
      let currentFarmId = activeFarmId || localStorage.getItem('vflow_farm_id') || apiFarms[0].id
      let apiFarm = apiFarms.find(f => f.id === currentFarmId) || apiFarms[0]
      currentFarmId = apiFarm.id

      // Fetch zones and cycles in parallel
      const [apiZones, apiCycles] = await Promise.all([
        zoneApi.list(currentFarmId),
        cycleApi.list(),
      ])

      const thresholdResults = await Promise.all(
        apiZones.map((az: ApiZone) => thresholdApi.get(az.id).catch(() => []))
      )
      const thresholdMap = Object.fromEntries(apiZones.map((az: ApiZone, i: number) => [az.id, thresholdResults[i]]))

      const zones: Zone[] = []
      for (const az of apiZones) {
        const thresholds = thresholdMap[az.id] || []
        const recipe = thresholds.length > 0
          ? { ...DEFAULT_RECIPE, ...thresholdsToGoldenState(thresholds) } as GoldenState
          : DEFAULT_RECIPE
        zones.push(apiZoneToZone(az, recipe))
      }
      
      const builtFarms = apiFarms.map(f => {
        if (f.id === currentFarmId) {
          return apiFarmToFarm(f, zones)
        }
        return apiFarmToFarm(f, [])
      })
      setFarms(builtFarms)

      // Initialise active selections
      setActiveFarmId(currentFarmId)
      localStorage.setItem('vflow_farm_id', currentFarmId)

      setActiveZoneId(prev => {
        const activeFarmObj = builtFarms.find(f => f.id === currentFarmId)
        if (prev && activeFarmObj?.zones.some(z => z.id === prev)) return prev
        return activeFarmObj?.zones[0]?.id ?? null
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
  }, [activeFarmId, profile])

  useEffect(() => {
    refetch()
  }, [profile, refetch])

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
    const farm = await farmApi.create({ name, location, description })
    localStorage.setItem('vflow_farm_id', farm.id)

    // Update the Supabase user metadata if the user is marked as a first-time user
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.user_metadata?.is_first_time) {
        await supabase.auth.updateUser({
          data: { is_first_time: false }
        })
      }
    } catch (err) {
      console.error('Failed to update first-time metadata in Supabase', err)
    }

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
      farms, activeFarm, activeZone, loading, error, spinUpStatus,
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
