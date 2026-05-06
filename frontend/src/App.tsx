import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, Construction, XCircle } from 'lucide-react'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { SensorGrid } from './components/sensors/SensorGrid'
import { ControlPanel } from './components/controls/ControlPanel'
import { AIInsights } from './components/insights/AIInsights'
import { RecipeMatch } from './components/insights/RecipeMatch'
import { useTelemetry } from './hooks/useTelemetry'
import { SensorReadings } from './types/telemetry'

// ─── Alert derivation ────────────────────────────────────────────────────────
const SENSOR_LABELS: Record<keyof SensorReadings, string> = {
  ph: 'pH Level', ec: 'EC / Nutrient', air_temp: 'Air Temp',
  humidity: 'Ambient Humidity', soil_moisture: 'Soil Moisture', light_intensity: 'Light', co2: 'CO₂ Level',
}

function deriveAlerts(recipeMatch: Partial<Record<keyof SensorReadings, number>>) {
  const alerts: { key: keyof SensorReadings; score: number; severity: 'critical' | 'warning' }[] = []
  for (const [key, score] of Object.entries(recipeMatch) as [keyof SensorReadings, number][]) {
    if (score < 50)       alerts.push({ key, score, severity: 'critical' })
    else if (score < 75)  alerts.push({ key, score, severity: 'warning' })
  }
  return alerts.sort((a, b) => a.score - b.score)
}

// ─── Coming soon placeholder ─────────────────────────────────────────────────
function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3">
      <Construction size={20} className="text-zinc-700" />
      <p className="text-sm text-zinc-600">{tab} — not yet commissioned</p>
    </div>
  )
}

// ─── Dashboard left panel ────────────────────────────────────────────────────
function LeftPanel({
  overallMatch,
  recipeMatch,
}: {
  overallMatch: number
  recipeMatch:  Partial<Record<keyof SensorReadings, number>>
}) {
  const alerts   = deriveAlerts(recipeMatch)
  const hasCrit  = alerts.some(a => a.severity === 'critical')
  const allGood  = alerts.length === 0

  return (
    <aside className="w-64 shrink-0 min-h-0 flex flex-col border-r border-zinc-800 overflow-y-auto bg-zinc-950">

      {/* ── System health banner ── */}
      <div className="p-3 border-b border-zinc-800">
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${
          allGood  ? 'bg-green-500/5  border-green-500/15' :
          hasCrit  ? 'bg-red-500/5    border-red-500/15'   :
                     'bg-amber-400/5  border-amber-400/15'
        }`}>
          {allGood
            ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
            : hasCrit
            ? <XCircle      size={18} className="text-red-500 shrink-0" />
            : <AlertTriangle size={18} className="text-amber-400 shrink-0" />
          }
          <div className="min-w-0">
            <p className={`text-sm font-semibold leading-tight ${
              allGood ? 'text-green-400' : hasCrit ? 'text-red-400' : 'text-amber-400'
            }`}>
              {allGood ? 'All systems nominal' : hasCrit ? `${alerts.length} critical alert${alerts.length > 1 ? 's' : ''}` : `${alerts.length} warning${alerts.length > 1 ? 's' : ''}`}
            </p>
            <p className="text-[11px] text-zinc-600 mt-0.5 truncate">NFT Rack 01 · Zone Alpha</p>
          </div>
        </div>
      </div>

      {/* ── Active alerts ── */}
      {alerts.length > 0 && (
        <div className="lp-section">
          <div className="lp-section-hd">
            <span className="lp-section-title">Active Alerts</span>
            <span className={`text-[10px] font-semibold ${hasCrit ? 'text-red-500' : 'text-amber-400'}`}>
              {alerts.length}
            </span>
          </div>
          <div className="px-3 pb-3 space-y-1.5">
            {alerts.map(({ key, score, severity }) => (
              <div key={key} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs ${
                severity === 'critical'
                  ? 'bg-red-500/8 text-red-300 ring-1 ring-inset ring-red-500/15'
                  : 'bg-amber-400/8 text-amber-300 ring-1 ring-inset ring-amber-400/15'
              }`}>
                <AlertTriangle size={11} className="shrink-0 opacity-80" />
                <span className="font-medium truncate">{SENSOR_LABELS[key]}</span>
                <span className="ml-auto font-mono text-[10px] opacity-60 shrink-0">{score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recipe match ── */}
      <RecipeMatch overallMatch={overallMatch} recipeMatch={recipeMatch} />

      {/* ── Actuators ── */}
      <ControlPanel />

      {/* ── AI insights ── */}
      <AIInsights />

    </aside>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { status, data, history, recipeMatch, overallMatch } = useTelemetry()
  const [activeTab, setActiveTab] = useState('Dashboard')

  return (
    <DashboardLayout status={status} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab !== 'Dashboard'
        ? <ComingSoon tab={activeTab} />
        : (
          <div className="flex flex-1 min-h-0">
            <LeftPanel overallMatch={overallMatch} recipeMatch={recipeMatch} />
            <SensorGrid
              readings={data?.readings ?? null}
              history={history}
              recipeMatch={recipeMatch}
            />
          </div>
        )
      }
    </DashboardLayout>
  )
}
