import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Construction } from 'lucide-react'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { SensorGrid } from './components/sensors/SensorGrid'
import { ControlPanel } from './components/controls/ControlPanel'
import { AIInsights } from './components/insights/AIInsights'
import { RecipeMatch } from './components/insights/RecipeMatch'
import { useTelemetry } from './hooks/useTelemetry'

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 text-center px-6">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
        <Construction size={26} className="text-slate-500" />
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-300">{tab}</p>
        <p className="text-sm text-slate-600 mt-1">This module is coming in a future release.</p>
      </div>
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
      <div className="p-5 grid grid-cols-12 gap-4">

        {/* ── Page title row ─────────────────────────────────────── */}
        <div className="col-span-12 flex items-end justify-between mb-1">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xl font-bold text-white"
            >
              Zone Alpha
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-xs text-slate-500 mt-0.5"
            >
              Farm-001 · Vertical NFT Rack · Live telemetry stream
            </motion.p>
          </div>

          {/* Overall health badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
              ${overallMatch >= 80
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : overallMatch >= 50
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'}
            `}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              overallMatch >= 80 ? 'bg-emerald-400 animate-pulse' :
              overallMatch >= 50 ? 'bg-amber-400 animate-pulse'   :
                                   'bg-rose-400 animate-pulse'
            }`} />
            {overallMatch}% System Health
          </motion.div>
        </div>

        {/* ── Sensor grid (left, 8 cols) ──────────────────────────── */}
        <motion.div
          className="col-span-12 lg:col-span-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          <SensorGrid
            readings={data?.readings ?? null}
            history={history}
            recipeMatch={recipeMatch}
          />
        </motion.div>

        {/* ── Right panel (4 cols) ────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <RecipeMatch overallMatch={overallMatch} recipeMatch={recipeMatch} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
          >
            <ControlPanel />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.45 }}
          >
            <AIInsights />
          </motion.div>
        </div>

      </div>
      )}
    </DashboardLayout>
  )
}
