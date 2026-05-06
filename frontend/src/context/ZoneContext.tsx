import React, { createContext, useContext, useState } from 'react'
import { Farm, Zone } from '../types/farm'
import { FARMS } from '../config/zones'

// ─── Context shape ────────────────────────────────────────────────────────────
interface ZoneContextValue {
  farms:      Farm[]
  activeFarm: Farm
  activeZone: Zone
  setActiveFarm: (farmId: string) => void
  setActiveZone: (zoneId: string) => void
}

const ZoneContext = createContext<ZoneContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ZoneProvider({ children }: { children: React.ReactNode }) {
  const [activeFarmId, setActiveFarmId] = useState<string>(FARMS[0].id)
  const [activeZoneId, setActiveZoneId] = useState<string>(FARMS[0].zones[0].id)

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

  return (
    <ZoneContext.Provider value={{ farms: FARMS, activeFarm, activeZone, setActiveFarm, setActiveZone }}>
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
