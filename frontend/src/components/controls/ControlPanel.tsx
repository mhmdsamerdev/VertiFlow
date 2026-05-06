import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, Droplets, Lightbulb, LucideIcon, Wind } from 'lucide-react'

interface Actuator {
  id:          'oxygen_pump' | 'led_array' | 'nutrient_doser'
  label:       string
  description: string
  Icon:        LucideIcon
  onColor:     string
  onDot:       string
}

const ACTUATORS: Actuator[] = [
  { id: 'oxygen_pump',    label: 'Oxygen Pump',    description: 'Root zone aeration',       Icon: Wind,     onColor: 'bg-green-500/20 border-green-500/30',  onDot: 'bg-green-500'  },
  { id: 'led_array',      label: 'LED Array',      description: 'Full-spectrum grow light', Icon: Lightbulb, onColor: 'bg-amber-400/20 border-amber-400/30',  onDot: 'bg-amber-400'  },
  { id: 'nutrient_doser', label: 'Nutrient Doser', description: 'Automated feed injection', Icon: Droplets,  onColor: 'bg-sky-500/20 border-sky-500/30',      onDot: 'bg-sky-400'    },
]

// ─── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ enabled, dotClass, trackClass, onChange }: {
  enabled: boolean; dotClass: string; trackClass: string; onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      aria-pressed={enabled}
      className={`relative w-9 h-5 rounded-full border transition-all duration-200 outline-none shrink-0 ${
        enabled ? trackClass : 'bg-zinc-800 border-zinc-700'
      }`}
    >
      <motion.div
        className={`absolute top-[3px] w-[14px] h-[14px] rounded-full transition-colors duration-200 ${enabled ? dotClass : 'bg-zinc-600'}`}
        animate={{ x: enabled ? 17 : 3 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────
type ActuatorState = Record<Actuator['id'], boolean>

export function ControlPanel() {
  const [states, setStates] = useState<ActuatorState>({
    oxygen_pump: true, led_array: true, nutrient_doser: false,
  })
  const toggle = (id: Actuator['id']) =>
    setStates(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="lp-section">
      <div className="lp-section-hd">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-zinc-600" />
          <span className="lp-section-title">Actuators</span>
        </div>
        <span className="text-[10px] text-zinc-600">Manual</span>
      </div>

      <div className="px-3 pb-3 pt-1 space-y-1">
        {ACTUATORS.map(({ id, label, description, Icon, onColor, onDot }) => {
          const on = states[id]
          return (
            <div
              key={id}
              className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                on ? 'bg-zinc-800/60' : 'hover:bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${on ? onDot : 'bg-zinc-700'}`} />
                <Icon size={13} className={on ? 'text-zinc-300' : 'text-zinc-600'} />
                <div>
                  <p className={`text-xs font-medium transition-colors ${on ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</p>
                  <p className="text-[10px] text-zinc-600">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium transition-colors ${on ? 'text-green-500' : 'text-zinc-700'}`}>
                  {on ? 'On' : 'Off'}
                </span>
                <Toggle enabled={on} dotClass={onDot} trackClass={onColor} onChange={() => toggle(id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
