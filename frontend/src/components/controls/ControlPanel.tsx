import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Lightbulb, LucideIcon, Wind } from 'lucide-react'

interface Actuator {
  id: 'oxygen_pump' | 'led_array' | 'nutrient_doser'
  label: string
  description: string
  Icon: LucideIcon
  activeColor: string
}

const ACTUATORS: Actuator[] = [
  {
    id: 'oxygen_pump',
    label: 'Oxygen Pump',
    description: 'Root zone aeration',
    Icon: Wind,
    activeColor: 'emerald',
  },
  {
    id: 'led_array',
    label: 'LED Array',
    description: 'Full-spectrum grow light',
    Icon: Lightbulb,
    activeColor: 'amber',
  },
  {
    id: 'nutrient_doser',
    label: 'Nutrient Doser',
    description: 'Automated feed injection',
    Icon: Droplets,
    activeColor: 'sky',
  },
]

// ─── Neon toggle switch ────────────────────────────────────────────────────
interface ToggleProps {
  enabled: boolean
  color: string
  onChange: () => void
}

function NeonToggle({ enabled, color, onChange }: ToggleProps) {
  const trackOn  = color === 'amber' ? 'bg-amber-500/25 border-amber-500/40'  :
                   color === 'sky'   ? 'bg-sky-500/25 border-sky-500/40'      :
                                       'bg-emerald-500/25 border-emerald-500/40'
  const thumbOn  = color === 'amber' ? 'bg-amber-400 shadow-amber-500/70'    :
                   color === 'sky'   ? 'bg-sky-400 shadow-sky-500/70'        :
                                       'bg-emerald-400 shadow-emerald-500/70'

  return (
    <button
      onClick={onChange}
      aria-pressed={enabled}
      className={`
        relative w-10 h-5 border transition-all duration-200 outline-none shrink-0
        ${enabled
          ? trackOn
          : 'bg-slate-900 border-slate-700'}
      `}
    >
      <motion.div
        className={`absolute top-[2px] w-3 h-3 transition-colors duration-200 ${enabled ? thumbOn : 'bg-slate-600'}`}
        animate={{ x: enabled ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
      />
    </button>
  )
}

// ─── Panel ─────────────────────────────────────────────────────────────────
type ActuatorState = Record<Actuator['id'], boolean>

export function ControlPanel() {
  const [states, setStates] = useState<ActuatorState>({
    oxygen_pump:    true,
    led_array:      true,
    nutrient_doser: false,
  })

  const toggle = (id: Actuator['id']) =>
    setStates((prev: ActuatorState) => ({ ...prev, [id]: !prev[id] }))

  return (
    <section>
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 h-7 border-b border-slate-800 bg-slate-900/40">
        <span className="text-[9px] font-mono font-bold text-slate-500 tracking-[0.2em] uppercase">Actuator Control</span>
        <span className="text-[9px] font-mono text-slate-700">MANUAL</span>
      </div>

      <div className="divide-y divide-slate-800/60">
        {ACTUATORS.map(({ id, label, description, Icon, activeColor }, i) => {
          const on = states[id]
          return (
            <div
              key={id}
              className={`flex items-center justify-between px-3 py-2.5 hover:bg-slate-900/40 transition-colors ${
                on && activeColor === 'amber'   ? 'border-l border-amber-500/50'   :
                on && activeColor === 'sky'     ? 'border-l border-sky-500/50'     :
                on                             ? 'border-l border-emerald-500/50' :
                                                 ''
              }`}
            >
              {/* Left: LED + labels */}
              <div className="flex items-center gap-2.5">
                <span className={`w-1.5 h-1.5 shrink-0 ${
                  on
                    ? activeColor === 'amber' ? 'bg-amber-500' : activeColor === 'sky' ? 'bg-sky-500' : 'bg-emerald-500'
                    : 'bg-slate-700'
                }`} />
                <div>
                  <p className={`text-[10px] font-mono font-bold tracking-wider transition-colors ${
                    on
                      ? activeColor === 'amber' ? 'text-amber-300' : activeColor === 'sky' ? 'text-sky-300' : 'text-emerald-300'
                      : 'text-slate-500'
                  }`}>
                    {label.toUpperCase()}
                  </p>
                  <p className="text-[9px] font-mono text-slate-700">{description}</p>
                </div>
              </div>

              {/* Right: status text + toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-mono font-bold tracking-[0.15em] transition-colors ${
                  on
                    ? activeColor === 'amber' ? 'text-amber-500' : activeColor === 'sky' ? 'text-sky-500' : 'text-emerald-500'
                    : 'text-slate-700'
                }`}>
                  {on ? 'ENG' : 'STB'}
                </span>
                <NeonToggle enabled={on} color={activeColor} onChange={() => toggle(id)} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
