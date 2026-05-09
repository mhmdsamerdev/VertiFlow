import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Plus, Leaf, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import {
  GrowCycle, GrowStage, Zone,
  deriveStage, cycleProgress, daysElapsed, daysRemaining,
} from '../../types/farm'
import { useZoneContext } from '../../context/ZoneContext'

// ─── Stage UI config ──────────────────────────────────────────────────────────
const STAGE_UI: Record<GrowStage, { label: string; color: string; dot: string }> = {
  seedling:   { label: 'Seedling',   color: 'text-green-600',  dot: 'bg-green-800'  },
  vegetative: { label: 'Vegetative', color: 'text-green-400',  dot: 'bg-green-600'  },
  mature:     { label: 'Mature',     color: 'text-green-300',  dot: 'bg-green-500'  },
  ready:      { label: 'Harvest Ready', color: 'text-amber-400', dot: 'bg-amber-400' },
}

const STAGE_ORDER: GrowStage[] = ['seedling', 'vegetative', 'mature', 'ready']

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function expectedHarvestDate(plantedAt: string, days: number) {
  const d = new Date(plantedAt)
  d.setDate(d.getDate() + days)
  return fmt(d.toISOString())
}

// ─── Stage progress timeline ──────────────────────────────────────────────────
function StageBar({ stage, progress }: { stage: GrowStage; progress: number }) {
  const activeIdx = STAGE_ORDER.indexOf(stage)
  return (
    <div>
      <div className="flex justify-between mb-2">
        {STAGE_ORDER.map((s, i) => (
          <div key={s} className="flex flex-col items-center gap-1">
            <div className={`w-2 h-2 rounded-full transition-colors ${
              i <= activeIdx ? STAGE_UI[s].dot : 'bg-zinc-700'
            }`} />
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${
              i === activeIdx ? STAGE_UI[s].color : 'text-zinc-600'
            }`}>{STAGE_UI[s].label.split(' ')[0]}</span>
          </div>
        ))}
      </div>
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-green-700 via-green-500 to-green-400"
          style={{ background: progress >= 0.88 ? 'linear-gradient(to right, #92400e, #d97706, #f59e0b)' : undefined }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-zinc-600">Day 1</span>
        <span className={`text-[10px] font-mono font-semibold ${
          progress >= 0.88 ? 'text-amber-400' : 'text-zinc-400'
        }`}>{Math.round(progress * 100)}%</span>
        <span className="text-[10px] text-zinc-600">Harvest</span>
      </div>
    </div>
  )
}

// ─── Harvest log form ─────────────────────────────────────────────────────────
function HarvestForm({ cycleId, onDone }: { cycleId: string; onDone: () => void }) {
  const { logHarvest } = useZoneContext()
  const [yieldKg, setYieldKg]   = useState('')
  const [grade,   setGrade  ]   = useState<'A' | 'B' | 'C'>('A')
  const [notes,   setNotes  ]   = useState('')

  function submit() {
    const kg = parseFloat(yieldKg)
    if (isNaN(kg) || kg <= 0) return
    logHarvest(cycleId, { yield_kg: kg, quality_grade: grade, notes })
    onDone()
  }

  return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Yield (kg)</label>
        <input
          type="number" min="0" step="0.1"
          value={yieldKg} onChange={e => setYieldKg(e.target.value)}
          placeholder="e.g. 2.5"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-green-600"
        />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Quality Grade</label>
        <div className="flex gap-2">
          {(['A', 'B', 'C'] as const).map(g => (
            <button key={g} onClick={() => setGrade(g)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                grade === g
                  ? g === 'A' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                  : g === 'B' ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                  :             'bg-red-500/15  border-red-500/40  text-red-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
              }`}>{g}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Notes</label>
        <textarea
          rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Optional observations…"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-green-600 resize-none"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={submit}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors">
          <CheckCircle2 size={13} /> Confirm Harvest
        </button>
        <button onClick={onDone}
          className="px-4 py-2 text-zinc-500 hover:text-zinc-300 rounded-lg text-sm transition-colors border border-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Start new cycle form ─────────────────────────────────────────────────────
function StartCycleForm({ zoneId, defaultCrop, onDone }: { zoneId: string; defaultCrop: string; onDone: () => void }) {
  const { startCycle } = useZoneContext()
  const [cropName, setCropName] = useState(defaultCrop)
  const [days, setDays]         = useState('30')

  function submit() {
    const d = parseInt(days)
    if (!cropName.trim() || isNaN(d) || d <= 0) return
    startCycle(zoneId, cropName.trim(), d)
    onDone()
  }

  return (
    <div className="space-y-3 pt-1">
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Crop</label>
        <input value={cropName} onChange={e => setCropName(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-600" />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Expected Duration (days)</label>
        <input type="number" min="1" value={days} onChange={e => setDays(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-600" />
      </div>
      <div className="flex gap-2">
        <button onClick={submit}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors">
          <Leaf size={13} /> Begin Cycle
        </button>
        <button onClick={onDone}
          className="px-4 py-2 text-zinc-500 hover:text-zinc-300 rounded-lg text-sm transition-colors border border-zinc-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────
interface CyclePanelProps {
  zone:           Zone
  cycle:          GrowCycle | null
  pastCycles:     GrowCycle[]
  onClose:        () => void
  onViewDashboard: (zoneId: string) => void
}

export function CyclePanel({ zone, cycle, pastCycles, onClose, onViewDashboard }: CyclePanelProps) {
  const [showHarvestForm,    setShowHarvestForm   ] = useState(false)
  const [showStartForm,      setShowStartForm     ] = useState(false)

  const stage    = cycle ? deriveStage(cycle.plantedAt, cycle.expectedDays) : null
  const progress = cycle ? cycleProgress(cycle.plantedAt, cycle.expectedDays) : 0
  const elapsed  = cycle ? daysElapsed(cycle.plantedAt) : 0
  const remaining = cycle ? daysRemaining(cycle.plantedAt, cycle.expectedDays) : 0

  // Reset sub-forms when zone changes
  React.useEffect(() => { setShowHarvestForm(false); setShowStartForm(false) }, [zone.id])

  return (
    <motion.div
      key={zone.id}
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      exit={{    x: 340, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      className="absolute right-0 top-0 bottom-0 w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto shadow-2xl shadow-black/60 z-20"
    >

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-800">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0">
            <p className="text-sm font-bold text-zinc-100 leading-tight">{zone.name}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{zone.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onViewDashboard(zone.id)}
              title="Open in Dashboard"
              className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-green-400 transition-colors">
              <ArrowRight size={11} />
            </button>
            <button onClick={onClose}
              className="p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-4">

        {/* ── Active cycle ── */}
        {cycle && stage ? (
          <>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-200 truncate">{cycle.cropName}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">Active cycle</p>
              </div>
              <span className={`badge ring-1 ring-inset ${
                stage === 'ready'      ? 'badge-warning'  :
                stage === 'mature'     ? 'badge-nominal'  :
                stage === 'vegetative' ? 'badge-nominal'  : 'badge-neutral'
              }`}>
                {STAGE_UI[stage].label}
              </span>
            </div>

            <StageBar stage={stage} progress={progress} />

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Planted',   value: fmt(cycle.plantedAt)                              },
                { label: 'Harvest',   value: expectedHarvestDate(cycle.plantedAt, cycle.expectedDays) },
                { label: 'Elapsed',   value: `${elapsed}d / ${cycle.expectedDays}d`            },
                { label: 'Remaining', value: remaining > 0 ? `${remaining} days` : 'Due now'  },
              ].map(({ label, value }) => (
                <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-zinc-200 font-mono tabular-nums">{value}</p>
                </div>
              ))}
            </div>

            {!showHarvestForm ? (
              <button onClick={() => setShowHarvestForm(true)}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                  stage === 'ready'
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }`}>
                <Clock size={13} /> Log Harvest
              </button>
            ) : (
              <HarvestForm cycleId={cycle.id} onDone={() => setShowHarvestForm(false)} />
            )}
          </>
        ) : (
          <>
            <div className="py-4 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Plus size={18} className="text-zinc-600" />
              </div>
              <p className="text-sm font-semibold text-zinc-400">No active cycle</p>
              <p className="text-xs text-zinc-600 mt-1">{zone.cropName} · {zone.description}</p>
            </div>

            {!showStartForm ? (
              <button onClick={() => setShowStartForm(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-700/20 hover:bg-green-700/30 border border-green-700/30 text-green-500 rounded-lg text-sm font-semibold transition-colors">
                <Plus size={13} /> Start New Cycle
              </button>
            ) : (
              <StartCycleForm zoneId={zone.id} defaultCrop={zone.cropName} onDone={() => setShowStartForm(false)} />
            )}
          </>
        )}

        {/* ── Past cycles ── */}
        {pastCycles.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">
              Cycle History · {pastCycles.length}
            </p>
            <div className="space-y-1.5">
              {pastCycles.map(pc => (
                <div key={pc.id} className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-zinc-300 truncate">{pc.cropName}</p>
                    <p className="text-[10px] text-zinc-600">{fmt(pc.plantedAt)}</p>
                  </div>
                  {pc.harvestRecord && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-mono font-semibold text-zinc-200">{pc.harvestRecord.yieldKg} kg</p>
                      <span className={`text-[10px] font-bold ${
                        pc.harvestRecord.qualityGrade === 'A' ? 'text-green-400' :
                        pc.harvestRecord.qualityGrade === 'B' ? 'text-amber-400' : 'text-red-400'
                      }`}>Grade {pc.harvestRecord.qualityGrade}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
