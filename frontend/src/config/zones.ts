import { Farm } from '../types/farm'

// ─── Farm 001 — Greenhouse A ──────────────────────────────────────────────────
// ─── Farm 002 — Greenhouse B ──────────────────────────────────────────────────
//
// When a real API is available, replace FARMS with a fetch from
//   GET /api/farms  →  Farm[]
// The Farm / Zone / GoldenState shapes are intentionally identical to the API contract.

export const FARMS: Farm[] = [
  {
    id:       'farm-001',
    name:     'Farm 001',
    location: 'Greenhouse A',
    zones: [
      {
        id:          'zone-alpha',
        name:        'Zone Alpha',
        description: 'NFT Rack 01',
        cropName:    'Butterhead Lettuce',
        recipe: {
          ph:              { target: 6.2,  warnMin: 5.8,  warnMax: 6.8,   critMin: 5.0,  critMax: 7.5   },
          ec:              { target: 1.8,  warnMin: 1.4,  warnMax: 2.2,   critMin: 0.8,  critMax: 3.0   },
          air_temp:        { target: 24.0, warnMin: 20.0, warnMax: 28.0,  critMin: 15.0, critMax: 33.0  },
          humidity:        { target: 65.0, warnMin: 55.0, warnMax: 75.0,  critMin: 40.0, critMax: 90.0  },
          soil_moisture:   { target: 70.0, warnMin: 50.0, warnMax: 85.0,  critMin: 30.0, critMax: 95.0  },
          light_intensity: { target: 500., warnMin: 350., warnMax: 650.,  critMin: 200., critMax: 900.  },
          co2:             { target: 900., warnMin: 600., warnMax: 1200., critMin: 400., critMax: 1500. },
        },
      },
      {
        id:          'zone-beta',
        name:        'Zone Beta',
        description: 'DWC Tank 01',
        cropName:    'Sweet Basil',
        recipe: {
          ph:              { target: 6.5,  warnMin: 6.0,  warnMax: 7.0,   critMin: 5.5,  critMax: 7.5   },
          ec:              { target: 1.6,  warnMin: 1.2,  warnMax: 2.0,   critMin: 0.8,  critMax: 2.5   },
          air_temp:        { target: 26.0, warnMin: 22.0, warnMax: 30.0,  critMin: 18.0, critMax: 35.0  },
          humidity:        { target: 60.0, warnMin: 50.0, warnMax: 70.0,  critMin: 35.0, critMax: 85.0  },
          soil_moisture:   { target: 65.0, warnMin: 45.0, warnMax: 80.0,  critMin: 25.0, critMax: 95.0  },
          light_intensity: { target: 600., warnMin: 450., warnMax: 750.,  critMin: 250., critMax: 1000. },
          co2:             { target: 1000., warnMin: 700., warnMax: 1300., critMin: 400., critMax: 1500. },
        },
      },
      {
        id:          'zone-gamma',
        name:        'Zone Gamma',
        description: 'Aeroponic Tower 01',
        cropName:    'Baby Spinach',
        recipe: {
          ph:              { target: 6.3,  warnMin: 6.0,  warnMax: 6.8,   critMin: 5.5,  critMax: 7.5   },
          ec:              { target: 2.0,  warnMin: 1.6,  warnMax: 2.4,   critMin: 1.0,  critMax: 3.0   },
          air_temp:        { target: 22.0, warnMin: 18.0, warnMax: 26.0,  critMin: 13.0, critMax: 30.0  },
          humidity:        { target: 70.0, warnMin: 60.0, warnMax: 80.0,  critMin: 45.0, critMax: 90.0  },
          soil_moisture:   { target: 75.0, warnMin: 55.0, warnMax: 88.0,  critMin: 35.0, critMax: 95.0  },
          light_intensity: { target: 350., warnMin: 200., warnMax: 500.,  critMin: 100., critMax: 700.  },
          co2:             { target: 800., warnMin: 550., warnMax: 1100., critMin: 350., critMax: 1400. },
        },
      },
    ],
  },
  {
    id:       'farm-002',
    name:     'Farm 002',
    location: 'Greenhouse B',
    zones: [
      {
        id:          'zone-delta',
        name:        'Zone Delta',
        description: 'Flood & Drain Bed 01',
        cropName:    'Strawberry',
        recipe: {
          ph:              { target: 6.0,  warnMin: 5.5,  warnMax: 6.5,   critMin: 5.0,  critMax: 7.0   },
          ec:              { target: 1.4,  warnMin: 1.0,  warnMax: 1.8,   critMin: 0.6,  critMax: 2.2   },
          air_temp:        { target: 20.0, warnMin: 16.0, warnMax: 24.0,  critMin: 12.0, critMax: 28.0  },
          humidity:        { target: 70.0, warnMin: 60.0, warnMax: 80.0,  critMin: 45.0, critMax: 90.0  },
          soil_moisture:   { target: 65.0, warnMin: 45.0, warnMax: 80.0,  critMin: 25.0, critMax: 95.0  },
          light_intensity: { target: 400., warnMin: 250., warnMax: 550.,  critMin: 150., critMax: 800.  },
          co2:             { target: 850., warnMin: 600., warnMax: 1100., critMin: 400., critMax: 1400. },
        },
      },
      {
        id:          'zone-epsilon',
        name:        'Zone Epsilon',
        description: 'Kratky Shelf 01',
        cropName:    'Microgreens',
        recipe: {
          ph:              { target: 6.0,  warnMin: 5.5,  warnMax: 6.5,   critMin: 5.0,  critMax: 7.0   },
          ec:              { target: 1.2,  warnMin: 0.8,  warnMax: 1.6,   critMin: 0.5,  critMax: 2.0   },
          air_temp:        { target: 23.0, warnMin: 19.0, warnMax: 27.0,  critMin: 15.0, critMax: 31.0  },
          humidity:        { target: 75.0, warnMin: 65.0, warnMax: 85.0,  critMin: 50.0, critMax: 92.0  },
          soil_moisture:   { target: 80.0, warnMin: 65.0, warnMax: 90.0,  critMin: 50.0, critMax: 100.0 },
          light_intensity: { target: 300., warnMin: 180., warnMax: 420.,  critMin: 100., critMax: 600.  },
          co2:             { target: 800., warnMin: 550., warnMax: 1050., critMin: 350., critMax: 1300. },
        },
      },
    ],
  },
]
