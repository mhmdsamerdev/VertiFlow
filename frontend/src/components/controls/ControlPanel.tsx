import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Droplets, Lightbulb, LucideIcon, Wind } from 'lucide-react'

interface Actuator {
  id: 'oxygen_pump' | 'led_array' | 'nutrient_doser'
  label: string
  description: string
  Icon: LucideIcon
  activeColor: string
  glowClass: string
}

const ACTUATORS: Actuator[] = [
  {
    id: 'oxygen_pump',
    label: 'Oxygen Pump',
    description: 'Root zone aeration',
    Icon: Wind,
    activeColor: 'emerald',
    glowClass: 'shadow-emerald-500/40',
  },
  {
    id: 'led_array',
    label: 'LED Array',
    description: 'Full-spectrum grow light',
    Icon: Lightbulb,
    activeColor: 'amber',
    glowClass: 'shadow-amber-400/40',
  },
  {
    id: 'nutrient_doser',
    label: 'Nutrient Doser',
    description: 'Automated feed injection',
    Icon: Droplets,
    activeColor: 'sky',
    glowClass: 'shadow-sky-400/40',
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
        relative w-12 h-6 rounded-full border transition-all duration-300 outline-none
        focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
        ${enabled
          ? `${trackOn} shadow-md ${color === 'amber' ? 'focus-visible:ring-amber-500' : color === 'sky' ? 'focus-visible:ring-sky-500' : 'focus-visible:ring-emerald-500'}`
          : 'bg-slate-800 border-slate-700 focus-visible:ring-slate-500'}
      `}
    >
      <motion.div
        className={`
          absolute top-[3px] w-[18px] h-[18px] rounded-full transition-colors duration-300
          ${enabled ? `${thumbOn} shadow-md` : 'bg-slate-500'}
        `}
        animate={{ x: enabled ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
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
    <section className="glass-card p-4">
      <h2 className="text-xs font-semibold text-slate-400 tracking-widest uppercase mb-3">
        Actuator Control
      </h2>

      <div className="space-y-2">
        {ACTUATORS.map(({ id, label, description, Icon, activeColor, glowClass }, i) => {
          const on = states[id]
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 + 0.1 }}
              className={`
                group flex items-center justify-between
                p-3 rounded-lg border transition-all duration-300
                ${on
                  ? `bg-white/[0.04] border-${activeColor}-500/20 hover:border-${activeColor}-500/35`
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}
              `}
            >
              {/* Left: icon + labels */}
              <div className="flex items-center gap-3">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
                  ${on
                    ? `bg-${activeColor}-500/15 shadow-lg ${glowClass}`
                    : 'bg-white/[0.04]'}
                `}>
                  <Icon
                    size={15}
                    className={`transition-colors duration-300 ${
                      on
                        ? activeColor === 'amber' ? 'text-amber-400' : activeColor === 'sky' ? 'text-sky-400' : 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <p className={`text-sm font-medium transition-colors duration-200 ${on ? 'text-slate-100' : 'text-slate-400'}`}>
                    {label}
                  </p>
                  <p className="text-[10px] text-slate-600">{description}</p>
                </div>
              </div>

              {/* Right: status + toggle */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono font-semibold transition-colors duration-200 ${
                  on
                    ? activeColor === 'amber' ? 'text-amber-400' : activeColor === 'sky' ? 'text-sky-400' : 'text-emerald-400'
                    : 'text-slate-600'
                }`}>
                  {on ? 'ON' : 'OFF'}
                </span>
                <NeonToggle enabled={on} color={activeColor} onChange={() => toggle(id)} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
