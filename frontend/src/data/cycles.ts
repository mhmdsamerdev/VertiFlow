import { GrowCycle } from '../types/farm'

// ─── Seed grow cycles ─────────────────────────────────────────────────────────
// Dates are expressed as offsets from "today" so stage derivation stays correct
// regardless of when the app is run.

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(8, 0, 0, 0)
  return d.toISOString()
}

export const SEED_CYCLES: GrowCycle[] = [
  {
    id:           'cyc-alpha-1',
    zoneId:       'zone-alpha',
    cropName:     'Butterhead Lettuce',
    plantedAt:    daysAgo(24),   // 24/30 = 80 % → mature
    expectedDays: 30,
  },
  {
    id:           'cyc-beta-1',
    zoneId:       'zone-beta',
    cropName:     'Sweet Basil',
    plantedAt:    daysAgo(23),   // 23/25 = 92 % → ready 🌟
    expectedDays: 25,
  },
  {
    id:           'cyc-gamma-1',
    zoneId:       'zone-gamma',
    cropName:     'Baby Spinach',
    plantedAt:    daysAgo(3),    // 3/21  = 14 % → seedling
    expectedDays: 21,
  },
  {
    id:           'cyc-delta-1',
    zoneId:       'zone-delta',
    cropName:     'Strawberry',
    plantedAt:    daysAgo(27),   // 27/45 = 60 % → mature
    expectedDays: 45,
  },
  // zone-epsilon: no active cycle — ready to start a new one
]

export const SEED_PAST_CYCLES: GrowCycle[] = [
  {
    id:           'cyc-epsilon-0',
    zoneId:       'zone-epsilon',
    cropName:     'Microgreens',
    plantedAt:    daysAgo(28),
    expectedDays: 14,
    harvestRecord: {
      harvestedAt:  daysAgo(14),
      yieldKg:      1.4,
      qualityGrade: 'A',
      notes:        'Dense canopy. Excellent germination rate. Harvest at day 14.',
    },
  },
  {
    id:           'cyc-alpha-0',
    zoneId:       'zone-alpha',
    cropName:     'Butterhead Lettuce',
    plantedAt:    daysAgo(68),
    expectedDays: 30,
    harvestRecord: {
      harvestedAt:  daysAgo(38),
      yieldKg:      3.2,
      qualityGrade: 'B',
      notes:        'pH drifted mid-cycle. Slightly undersized heads.',
    },
  },
]
