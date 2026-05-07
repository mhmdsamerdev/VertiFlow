import React from 'react'
import { AlertTriangle, Zap } from 'lucide-react'
import { ActuatorId, ActuatorModes, ActuatorStates, SensorReadings } from '../../types/telemetry'
import { useZoneContext } from '../../context/ZoneContext'
import { useControls } from '../../hooks/useControls'
import { ActuatorCard } from './ControlPanel'

const ACTUATOR_IDS: ActuatorId[] = ['oxygen_pump', 'led_array', 'nutrient_doser']

interface Props {
  actuators:     ActuatorStates | null
  actuatorModes: ActuatorModes | null
  readings:      SensorReadings | null
}

export function ControlsTab({ actuators, actuatorModes, readings }: Props) {
  const { activeZone } = useZoneContext()
  const { commands, requestToggle, cancelToggle, confirmToggle, setAutoMode } = useControls(activeZone.id)

  const manualCount = actuatorModes
    ? ACTUATOR_IDS.filter(id => actuatorModes[id] === 'manual').length
    : 0

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">

      {/* ── Page header ── */}
      <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Zap size={14} className="text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-200">Actuator Controls</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-500">{activeZone.name}</span>
          <span className="text-zinc-700 select-none">·</span>
          <span className="text-xs text-zinc-600">{activeZone.cropName}</span>
        </div>
        <div>
          {manualCount > 0 ? (
            <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-1 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
              {manualCount} MANUAL
            </span>
          ) : (
            <span className="text-[10px] font-mono tracking-widest px-2 py-1 rounded bg-zinc-800/60 text-zinc-600 border border-zinc-700/50">
              ALL AUTO
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* ── Manual override banner ── */}
        {manualCount > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">
                Manual override active on {manualCount} actuator{manualCount > 1 ? 's' : ''}
              </p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">
                Automation rules are suspended for manually controlled actuators. Use "Return to Auto" on each card to restore automatic control.
              </p>
            </div>
          </div>
        )}

        {/* ── Actuator cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {ACTUATOR_IDS.map(id => (
            <ActuatorCard
              key={id}
              id={id}
              state={actuators?.[id] ?? false}
              mode={actuatorModes?.[id] ?? 'auto'}
              cmd={commands[id]}
              readings={readings}
              recipe={activeZone.recipe}
              onRequest={() => requestToggle(id)}
              onConfirm={newState => confirmToggle(id, newState)}
              onCancel={() => cancelToggle(id)}
              onSetAuto={() => setAutoMode(id, actuators?.[id] ?? false)}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
