import React, { createContext, useContext, useState } from 'react'
import { Farm, Zone, GrowCycle, HarvestRecord } from '../types/farm'
import { FARMS } from '../config/zones'
import { SEED_CYCLES, SEED_PAST_CYCLES } from '../data/cycles'

// ─── Context shape ────────────────────────────────────────────────────────────
interface ZoneContextValue {
  farms:      Farm[]
  activeFarm: Farm
  activeZone: Zone
  setActiveFarm: (farmId: string) => void
  setActiveZone: (zoneId: string) => void

  // ── Grow cycles ──────────────────────────────────────────────────────────────
  cycles:     Record<string, GrowCycle>       // zoneId → active cycle
  pastCycles: Record<string, GrowCycle[]>     // zoneId → completed cycles
  startCycle: (zoneId: string, cropName: string, expectedDays: number) => void
  logHarvest: (zoneId: string, record: Omit<HarvestRecord, 'harvestedAt'>) => void
}

const ZoneContext = createContext<ZoneContextValue | null>(null)

// ─── Build initial state from seed data ──────────────────────────────────────
function buildInitialCycles(): Record<string, GrowCycle> {
  return Object.fromEntries(SEED_CYCLES.map(c => [c.zoneId, c]))
}

function buildInitialPast(): Record<string, GrowCycle[]> {
  const map: Record<string, GrowCycle[]> = {}
  for (const c of SEED_PAST_CYCLES) {
    map[c.zoneId] = [...(map[c.zoneId] ?? []), c]
  }
  return map
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [activeFarmId, setActiveFarmId] = useState<string>(FARMS[0].id)
  const [activeZoneId, setActiveZoneId] = useState<string>(FARMS[0].zones[0].id)
  const [cycles,     setCycles    ] = useState<Record<string, GrowCycle>>(buildInitialCycles)
  const [pastCycles, setPastCycles] = useState<Record<string, GrowCycle[]>>(buildInitialPast)

  const activeFarm = FARMS.find(f => f.id === activeFarmId) ?? FARMS[0]
  const activeZone = activeFarm.zones.find(z => z.id === activeZoneId) ?? activeFarm.zones[0]

  function setActiveFarm(farmId: string) {
    const farm = FARMS.find(f => f.id === farmId)
    if (!farm) return
    setActiveFarmId(farmId)
    setActiveZoneId(farm.zones[0].id)
  }

  function setActiveZone(zoneId: string) {
    setActiveZoneId(zoneId)
  }

  function startCycle(zoneId: string, cropName: string, expectedDays: number) {
    const cycle: GrowCycle = {
      id:           `cyc-${zoneId}-${Date.now()}`,
      zoneId,
      cropName,
      plantedAt:    new Date().toISOString(),
      expectedDays,
    }
    setCycles(prev => ({ ...prev, [zoneId]: cycle }))
  }

  function logHarvest(zoneId: string, record: Omit<HarvestRecord, 'harvestedAt'>) {
    const active = cycles[zoneId]
    if (!active) return
    const closed: GrowCycle = {
      ...active,
      harvestRecord: { ...record, harvestedAt: new Date().toISOString() },
    }
    setCycles(prev => {
      const next = { ...prev }
      delete next[zoneId]
      return next
    })
    setPastCycles(prev => ({ ...prev, [zoneId]: [closed, ...(prev[zoneId] ?? [])] }))
  }

  return (
    <ZoneContext.Provider value={{
      farms: FARMS, activeFarm, activeZone, setActiveFarm, setActiveZone,
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
