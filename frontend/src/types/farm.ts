import { GoldenState } from './telemetry'

// ─── Zone ─────────────────────────────────────────────────────────────────────
export interface Zone {
  id:          string      // "zone-alpha"
  name:        string      // "Zone Alpha"
  description: string      // "NFT Rack 01"
  cropName:    string      // "Butterhead Lettuce"
  recipe:      GoldenState
}

// ─── Farm ─────────────────────────────────────────────────────────────────────
export interface Farm {
  id:       string   // "farm-001"
  name:     string   // "Farm 001"
  location: string   // "Greenhouse A"
  zones:    Zone[]
}
