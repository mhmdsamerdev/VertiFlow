import React, { useState } from 'react'
import { Construction } from 'lucide-react'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { SensorGrid } from './components/sensors/SensorGrid'
import { ControlPanel } from './components/controls/ControlPanel'
import { AIInsights } from './components/insights/AIInsights'
import { RecipeMatch } from './components/insights/RecipeMatch'
import { useTelemetry } from './hooks/useTelemetry'

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <div className="flex items-center gap-2 text-slate-700">
        <Construction size={13} />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase">Module Offline</span>
      </div>
      <p className="text-[10px] font-mono text-slate-700">{tab.toUpperCase()} — NOT YET COMMISSIONED</p>
    </div>
  )
}

export default function App() {
  const { status, data, history, recipeMatch, overallMatch } = useTelemetry()
  const [activeTab, setActiveTab] = useState('Dashboard')

  return (
    <DashboardLayout status={status} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab !== 'Dashboard' && <ComingSoon tab={activeTab} />}
      {activeTab === 'Dashboard' && (
      <div className="flex flex-1 min-h-0">

        {/* ── Sensor panel (fills remaining width) ── */}
        <SensorGrid
          readings={data?.readings ?? null}
          history={history}
          recipeMatch={recipeMatch}
        />

        {/* ── Instrument column (fixed width, divided panels) ── */}
        <div className="w-72 shrink-0 min-h-0 flex flex-col divide-y divide-slate-800 overflow-y-auto">
          <RecipeMatch overallMatch={overallMatch} recipeMatch={recipeMatch} />
          <ControlPanel />
          <AIInsights />
        </div>

      </div>
      )}
    </DashboardLayout>
  )
}
