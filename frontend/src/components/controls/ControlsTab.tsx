import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, RotateCcw, StopCircle, Zap } from 'lucide-react'
import { ActuatorId, ActuatorStates, SensorReadings } from '../../types/telemetry'
import { useZoneContext } from '../../context/ZoneContext'
import { useControls } from '../../hooks/useControls'
import { ActuatorCard } from './ControlPanel'

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

  if (!activeZone) return null

  const manualCount = actuators
    ? ACTUATOR_IDS.filter(id => actuators[id]?.mode === 'manual').length
    : 0

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

  // ── Return all manual actuators to auto ───────────────────────────────────
  function handleReturnAllToAuto() {
    ACTUATOR_IDS.forEach(id => {
      if (actuators?.[id]?.mode === 'manual') {
        setAutoMode(id, actuators![id].state)
      }
    })
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {/* ── Page header ── */}
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap size={14} className="text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-200">Actuator Controls</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-500">{activeZone?.name}</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-600">{activeZone?.cropName}</span>
        </div>
        <div className="flex items-center gap-2">
          {manualCount > 0 ? (
            <button
              onClick={handleReturnAllToAuto}
              title="Return all actuators to automatic control"
              className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/20 transition-colors cursor-pointer"
            >
              <RotateCcw size={9} />
              {manualCount} MANUAL
            </button>
          ) : (
            <span className="text-[10px] font-mono tracking-widest px-2 py-1 rounded bg-zinc-800/60 text-zinc-600 border border-zinc-700/50">
              ALL AUTO
            </span>
          )}
          <button
            onClick={handleEstop}
            className={`flex items-center gap-1.5 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-lg border transition-all duration-150 ${
              estopArmed
                ? 'bg-red-500 text-white border-red-400 scale-105'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/25'
            }`}
          >
            <StopCircle size={11} />
            {estopArmed ? 'Confirm?' : 'E-STOP'}
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* ── E-STOP armed warning ── */}
        {estopArmed && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/25">
            <StopCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-300">Emergency stop armed — click E-STOP again to shut down all actuators</p>
              <p className="text-[11px] text-red-500/70 mt-0.5">All running actuators will be immediately disabled. Auto-cancels in 5 seconds.</p>
            </div>
          </div>
        )}

        {/* ── Manual override banner ── */}
        {manualCount > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Manual override active on {manualCount} actuator{manualCount > 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">
                Automation rules are suspended. Click <span className="font-semibold text-amber-400">{manualCount} MANUAL</span> in the header or use "Return to Auto" on each card to restore automatic control.
              </p>
            </div>
          </div>
        )}

        {/* ── Actuator cards ── */}
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {ACTUATOR_IDS.map(id => {
            const entry = actuators?.[id] ?? { state: false, mode: 'auto' as const, params: { speed: null, brightness: null, color_spectrum: null, duration_minutes: null, dose_amount: null } }
            return (
              <ActuatorCard
                key={id}
                id={id}
                entry={entry}
                cmd={commands[id]}
                readings={readings}
                recipe={activeZone?.recipe}
                onRequest={() => requestToggle(id)}
                onConfirm={(newState, params, autoOffMinutes) => confirmToggle(id, newState, params, autoOffMinutes)}
                onCancel={() => cancelToggle(id)}
                onSetAuto={() => setAutoMode(id, entry.state)}
                onSendParams={(state, params) => sendImmediate(id, state, params)}
              />
            )
          })}
        </div>

      </div>
    </div>
  )
}
