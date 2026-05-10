import { GoldenState } from './telemetry'

// ─── Zone ─────────────────────────────────────────────────────────────────────
export interface Zone {
  id:          string      // "zone-alpha"
  name:        string      // "Zone Alpha"
  description: string      // "NFT Rack 01"
  cropName:    string      // "Butterhead Lettuce"
  systemType:  string      // "nft" | "dwc" | "aeroponic" | "flood" | "kratky" | "media"
  layerIndex:  number      // vertical layer ordering
  recipe:      GoldenState
}

// ─── Farm ─────────────────────────────────────────────────────────────────────
export interface Farm {
  id:       string   // "farm-001"
  name:     string   // "Farm 001"
  location: string   // "Greenhouse A"
  demoMode: boolean
  zones:    Zone[]
}

// ─── Grow Cycle ───────────────────────────────────────────────────────────────
export type GrowStage = 'seedling' | 'vegetative' | 'mature' | 'ready'

export interface HarvestRecord {
  harvestedAt:   string           // ISO date
  yieldKg:       number
  qualityGrade:  'A' | 'B' | 'C'
  notes:         string
}

export interface GrowCycle {
  id:             string
  zoneId:         string
  cropName:       string
  plantedAt:      string          // ISO date
  expectedDays:   number
  harvestRecord?: HarvestRecord   // present only on completed cycles
}

// ─── Grow Cycle helpers ───────────────────────────────────────────────────────
export function cycleProgress(plantedAt: string, expectedDays: number): number {
  const elapsed = (Date.now() - new Date(plantedAt).getTime()) / 86_400_000
  return Math.min(Math.max(elapsed / expectedDays, 0), 1)
}

export function deriveStage(plantedAt: string, expectedDays: number): GrowStage {
  const p = cycleProgress(plantedAt, expectedDays)
  if (p >= 0.88) return 'ready'
  if (p >= 0.52) return 'mature'
  if (p >= 0.18) return 'vegetative'
  return 'seedling'
}

export function daysElapsed(plantedAt: string): number {
  return Math.floor((Date.now() - new Date(plantedAt).getTime()) / 86_400_000)
}

export function daysRemaining(plantedAt: string, expectedDays: number): number {
  return Math.max(0, expectedDays - daysElapsed(plantedAt))
}
