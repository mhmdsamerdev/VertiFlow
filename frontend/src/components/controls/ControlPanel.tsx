import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Droplets, Lightbulb,
  Loader2, LucideIcon, Wind, XCircle,
} from 'lucide-react'
import { ActuatorId, ActuatorMode, GoldenState, SensorReadings } from '../../types/telemetry'
import { CommandState, CONFIRM_MS } from '../../hooks/useControls'

// ─── Per-actuator display config ──────────────────────────────────────────────
interface Cfg {
  label:    string
  subtitle: string
  Icon:     LucideIcon
  onLabel:  string
  offLabel: string
  iconOn:   string
  dotOn:    string
  bgOn:     string
  borderOn: string
}

const CONFIGS: Record<ActuatorId, Cfg> = {
  oxygen_pump: {
    label: 'Oxygen Pump',    subtitle: 'Root zone aeration',
    Icon: Wind,      onLabel: 'Aerating', offLabel: 'Idle',
    iconOn: 'text-green-400', dotOn: 'bg-green-400',
    bgOn: 'bg-green-500/8',  borderOn: 'border-green-500/20',
  },
  led_array: {
    label: 'LED Array',      subtitle: 'Full-spectrum grow light',
    Icon: Lightbulb, onLabel: 'Active',   offLabel: 'Off',
    iconOn: 'text-amber-400', dotOn: 'bg-amber-400',
    bgOn: 'bg-amber-400/8',  borderOn: 'border-amber-400/20',
  },
  nutrient_doser: {
    label: 'Nutrient Doser', subtitle: 'Automated feed injection',
    Icon: Droplets,  onLabel: 'Dosing',   offLabel: 'Paused',
    iconOn: 'text-sky-400', dotOn: 'bg-sky-400',
    bgOn: 'bg-sky-500/8',   borderOn: 'border-sky-500/20',
  },
}

// ─── Warning derivation ───────────────────────────────────────────────────────
interface Warning { level: 'warning' | 'critical'; message: string }

function deriveWarnings(id: ActuatorId, state: boolean, r: SensorReadings | null, recipe: GoldenState): Warning[] {
  if (!r) return []
  const w: Warning[] = []
  if (id === 'oxygen_pump' && !state) {
    const { warnMin, critMin } = recipe.soil_moisture
    if (r.soil_moisture < critMin)      w.push({ level: 'critical', message: `Soil moisture critical — ${r.soil_moisture.toFixed(0)}%` })
    else if (r.soil_moisture < warnMin) w.push({ level: 'warning',  message: `Soil moisture low — ${r.soil_moisture.toFixed(0)}%` })
  }
  if (id === 'led_array' && !state) {
    if (r.light_intensity < recipe.light_intensity.warnMin)
      w.push({ level: 'warning', message: `Light below crop optimal — ${r.light_intensity.toFixed(0)} µmol/m²/s` })
  }
  if (id === 'nutrient_doser' && !state) {
    const { warnMin, critMin } = recipe.ec
    if (r.ec < critMin)      w.push({ level: 'critical', message: `EC critically low — ${r.ec.toFixed(2)} mS/cm` })
    else if (r.ec < warnMin) w.push({ level: 'warning',  message: `EC below optimal — ${r.ec.toFixed(2)} mS/cm` })
  }
  return w
}

function deriveToggleWarning(id: ActuatorId, turningOff: boolean, r: SensorReadings | null, recipe: GoldenState): Warning | null {
  if (!turningOff || !r) return null
  if (id === 'oxygen_pump' && r.soil_moisture < recipe.soil_moisture.warnMin)
    return { level: 'warning', message: 'Soil moisture is low — aeration helps the root zone' }
  if (id === 'led_array')
    return { level: 'warning', message: 'Disabling lights will interrupt the photoperiod' }
  if (id === 'nutrient_doser' && r.ec < recipe.ec.warnMin)
    return { level: 'critical', message: 'EC is already below optimal — not recommended' }
  return null
}

// ─── ActuatorCard ─────────────────────────────────────────────────────────────
export interface ActuatorCardProps {
  id:        ActuatorId
  state:     boolean
  mode:      ActuatorMode
  cmd:       CommandState
  readings:  SensorReadings | null
  recipe:    GoldenState
  onRequest: () => void
  onConfirm: (newState: boolean) => void
  onCancel:  () => void
  onSetAuto: () => void
}

export function ActuatorCard({
  id, state, mode, cmd, readings, recipe,
  onRequest, onConfirm, onCancel, onSetAuto,
}: ActuatorCardProps) {
  const { label, subtitle, Icon, onLabel, offLabel, iconOn, dotOn, bgOn, borderOn } = CONFIGS[id]
  const { phase, requestedAt, error } = cmd
  const isManual   = mode === 'manual'
  const targetState = !state
  const warnings   = deriveWarnings(id, state, readings, recipe)
  const toggleWarn = deriveToggleWarning(id, phase === 'confirming' && state, readings, recipe)

  return (
    <div className={`relative flex flex-col rounded-xl border overflow-hidden transition-colors duration-300 ${
      state ? `${bgOn} ${borderOn}` : 'bg-zinc-900/60 border-zinc-800'
    }`}>

      {/* ── Confirmation timer bar ── */}
      <AnimatePresence>
        {phase === 'confirming' && requestedAt && (
          <motion.div
            key={requestedAt}
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-400/50 origin-left"
            initial={{ scaleX: 1 }} animate={{ scaleX: 0 }}
            transition={{ duration: CONFIRM_MS / 1000, ease: 'linear' }}
          />
        )}
      </AnimatePresence>

      <div className="p-5 flex flex-col gap-4">

        {/* ── Header: icon + name + mode badge ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${state ? bgOn : 'bg-zinc-800'}`}>
              <Icon size={16} className={state ? iconOn : 'text-zinc-600'} />
            </div>
            <div>
              <p className={`text-sm font-semibold transition-colors ${state ? 'text-zinc-100' : 'text-zinc-400'}`}>{label}</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">{subtitle}</p>
            </div>
          </div>
          {isManual && (
            <span className="shrink-0 text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
              MANUAL
            </span>
          )}
        </div>

        {/* ── State indicator ── */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${state ? dotOn : 'bg-zinc-700'}`} />
          <span className={`text-xs font-medium transition-colors ${state ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {state ? onLabel : offLabel}
          </span>
        </div>

        {/* ── Action section ── */}
        <div className="flex flex-col gap-2">

          <AnimatePresence>
            {phase === 'confirming' && toggleWarn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className={`flex items-start gap-1.5 px-2.5 py-2 rounded-lg text-[11px] overflow-hidden ${
                  toggleWarn.level === 'critical' ? 'bg-red-500/8 text-red-300' : 'bg-amber-400/8 text-amber-300'
                }`}
              >
                <AlertTriangle size={11} className="mt-px shrink-0" />
                <span>{toggleWarn.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {phase === 'idle' && (
            <button
              onClick={onRequest}
              className={`w-full text-xs font-medium py-2 px-3 rounded-lg border transition-colors ${
                state
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
              }`}
            >
              {state ? 'Turn Off' : 'Turn On'}
            </button>
          )}

          {phase === 'confirming' && (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm(targetState)}
                className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-colors ${
                  state
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                }`}
              >
                {state ? 'Confirm Off' : 'Confirm On'}
              </button>
              <button
                onClick={onCancel}
                className="px-3 text-xs text-zinc-500 hover:text-zinc-300 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {phase === 'pending' && (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-zinc-500">
              <Loader2 size={13} className="animate-spin" />
              <span>Sending command…</span>
            </div>
          )}

          {phase === 'confirmed' && (
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-green-400">
              <CheckCircle2 size={13} />
              <span>Command confirmed</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-red-400">
              <XCircle size={13} />
              <span>{error ?? 'Command failed'}</span>
            </div>
          )}

          {isManual && phase === 'idle' && (
            <button
              onClick={onSetAuto}
              className="w-full text-[11px] text-zinc-600 hover:text-zinc-400 py-1 rounded transition-colors"
            >
              ↩ Return to Auto
            </button>
          )}

        </div>
      </div>

      {/* ── Persistent warnings (actuator is off + conditions are bad) ── */}
      {warnings.length > 0 && (
        <div className="border-t border-zinc-800/60 px-5 py-3 flex flex-col gap-1.5">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-1.5 text-[11px] ${w.level === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangle size={10} className="mt-px shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
