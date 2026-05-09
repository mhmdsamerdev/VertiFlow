import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RotateCcw, StopCircle, Zap, History, LayoutGrid, Sliders } from 'lucide-react'
import { ActuatorId, ActuatorStates, SensorReadings } from '../../types/telemetry'
import { useZoneContext } from '../../context/ZoneContext'
import { useControls } from '../../hooks/useControls'
import { useControlHistory } from '../../hooks/useControlHistory'
import { ActuatorCard } from './ControlPanel'
import { motion, AnimatePresence } from 'framer-motion'

const ACTUATOR_IDS: ActuatorId[] = [
  'cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster',
]

interface Props {
  actuators: ActuatorStates | null
  readings:  SensorReadings | null
}

export function ControlsTab({ actuators, readings }: Props) {
  const { activeZone } = useZoneContext()
  const zoneId = activeZone?.id ?? ''
  const {
    commands, requestToggle, cancelToggle, confirmToggle,
    sendImmediate, setAutoMode, emergencyStop,
  } = useControls(zoneId)
  
  const { history, isLoading: historyLoading } = useControlHistory(zoneId)

  if (!activeZone) return null

  const manualCount = actuators
    ? ACTUATOR_IDS.filter(id => actuators[id]?.mode === 'manual').length
    : 0

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showHistory, setShowHistory] = useState(true)

  // ── E-STOP two-step arm + confirm ─────────────────────────────────────────
  const [estopArmed, setEstopArmed] = useState(false)
  const estopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (estopTimer.current) clearTimeout(estopTimer.current) }, [])

  function handleEstop() {
    if (!estopArmed) {
      setEstopArmed(true)
      estopTimer.current = setTimeout(() => setEstopArmed(false), 5_000)
    } else {
      if (estopTimer.current) clearTimeout(estopTimer.current)
      setEstopArmed(false)
      emergencyStop()
    }
  }

  function handleReturnAllToAuto() {
    ACTUATOR_IDS.forEach(id => {
      if (actuators?.[id]?.mode === 'manual') {
        setAutoMode(id, actuators![id].state)
      }
    })
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#09090b]">
      {/* ── Page header ── */}
      <header className="shrink-0 px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/20 backdrop-blur-md flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Zap size={14} className="text-amber-500" />
            </div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-tight">Zone Controls</h1>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{activeZone?.name}</span>
            <span className="text-zinc-700 select-none text-xs">/</span>
            <span className="text-[10px] text-zinc-600 font-medium">{activeZone?.cropName}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Sliders size={14} />
            </button>
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[11px] font-bold tracking-wide ${
              showHistory 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History size={13} />
            HISTORY
          </button>

          {manualCount > 0 && (
            <button
              onClick={handleReturnAllToAuto}
              className="flex items-center gap-2 text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/25 transition-all animate-pulse"
            >
              <RotateCcw size={13} />
              RESET {manualCount}
            </button>
          )}

          <button
            onClick={handleEstop}
            className={`flex items-center gap-2 text-[11px] font-bold tracking-wide px-4 py-1.5 rounded-lg border transition-all duration-300 shadow-lg ${
              estopArmed
                ? 'bg-red-500 text-white border-red-400 ring-4 ring-red-500/20'
                : 'bg-red-600/10 hover:bg-red-600/20 text-red-500 border-red-600/30'
            }`}
          >
            <StopCircle size={14} />
            {estopArmed ? 'CONFIRM STOP' : 'E-STOP'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* ── Main controls area ── */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="mb-6 flex flex-col gap-4">
            {/* ── E-STOP armed warning ── */}
            <AnimatePresence>
              {estopArmed && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/25 overflow-hidden"
                >
                  <StopCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-300">Emergency stop armed — click E-STOP again to shut down all actuators</p>
                    <p className="text-[11px] text-red-500/70 mt-0.5">All running actuators will be immediately disabled. Auto-cancels in 5 seconds.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Manual override banner ── */}
            {manualCount > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-300">
                    Manual override active on {manualCount} actuator{manualCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-amber-600/80 mt-0.5">
                    Automation rules are suspended. Click <span className="font-semibold text-amber-400">RESET {manualCount}</span> in the header to restore automatic control.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
            : "flex flex-col gap-4 max-w-4xl mx-auto"
          }>
            {ACTUATOR_IDS.map(id => (
              <ActuatorCard
                key={id}
                id={id}
                entry={actuators?.[id] ?? { state: false, mode: 'auto', params: { speed: null, brightness: null, color_spectrum: null, duration_minutes: null, dose_amount: null } }}
                cmd={commands[id]}
                readings={readings}
                recipe={activeZone.recipe}
                onRequest={() => requestToggle(id)}
                onConfirm={(s, p, a) => confirmToggle(id, s, p, a)}
                onCancel={() => cancelToggle(id)}
                onSetAuto={() => setAutoMode(id, actuators?.[id]?.state ?? false)}
                onSendParams={(s, p) => sendImmediate(id, s, p)}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        </main>

        {/* ── History Sidebar ── */}
        <AnimatePresence>
          {showHistory && (
            <motion.aside
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 border-l border-zinc-800/50 bg-zinc-900/10 backdrop-blur-sm flex flex-col"
            >
              <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={14} className="text-zinc-500" />
                  <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-widest">Command Log</span>
                </div>
                {historyLoading && <div className="w-3 h-3 border-2 border-blue-500/50 border-t-blue-500 rounded-full animate-spin" />}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-none">
                {history.length === 0 && !historyLoading && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <History size={32} className="text-zinc-600 mb-2" />
                    <p className="text-[10px] text-zinc-500">No recent activity</p>
                  </div>
                )}
                
                {history.map((entry, i) => (
                  <div key={i} className="group relative pl-4 border-l border-zinc-800 py-1">
                    <div className={`absolute left-[-4.5px] top-2 w-2 h-2 rounded-full border border-zinc-900 ${
                      entry.status === 'completed' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    }`} />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-zinc-300 capitalize">
                          {entry.actuator_id.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium ${entry.action === 'ON' ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.action}
                        </span>
                        <span className="text-zinc-700 text-[10px]">·</span>
                        <span className="text-[9px] text-zinc-500 capitalize">{entry.mode}</span>
                        {entry.status === 'pending' && (
                          <span className="text-[9px] text-amber-500/80 bg-amber-500/5 px-1 rounded">Pending...</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
