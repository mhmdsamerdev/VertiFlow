import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Droplets, Fan, Flame,
  Loader2, LucideIcon, Sun, TestTube2, Wind, XCircle,
} from 'lucide-react'
import { ActuatorId, ActuatorEntry, GoldenState, SensorReadings } from '../../types/telemetry'
import { CommandParams, CommandState, CONFIRM_MS } from '../../hooks/useControls'

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
  controls: ('speed' | 'brightness' | 'color_spectrum' | 'duration_minutes' | 'dose_amount')[]
  autoOff:  boolean
}

const CONFIGS: Record<ActuatorId, Cfg> = {
  cooling_fan: {
    label: 'Cooling Fan', subtitle: 'Air temperature management',
    Icon: Fan, onLabel: 'Running', offLabel: 'Idle',
    iconOn: 'text-cyan-400', dotOn: 'bg-cyan-400',
    bgOn: 'bg-cyan-500/8', borderOn: 'border-cyan-500/20',
    controls: ['speed'], autoOff: true,
  },
  water_pump: {
    label: 'Water Pump', subtitle: 'Irrigation & root zone hydration',
    Icon: Droplets, onLabel: 'Pumping', offLabel: 'Idle',
    iconOn: 'text-blue-400', dotOn: 'bg-blue-400',
    bgOn: 'bg-blue-500/8', borderOn: 'border-blue-500/20',
    controls: ['duration_minutes'], autoOff: false,
  },
  heater: {
    label: 'Heater', subtitle: 'Zone temperature raising',
    Icon: Flame, onLabel: 'Heating', offLabel: 'Off',
    iconOn: 'text-orange-400', dotOn: 'bg-orange-400',
    bgOn: 'bg-orange-500/8', borderOn: 'border-orange-500/20',
    controls: [], autoOff: true,
  },
  dehumidifier: {
    label: 'Dehumidifier', subtitle: 'Ambient humidity reduction',
    Icon: Wind, onLabel: 'Active', offLabel: 'Off',
    iconOn: 'text-teal-400', dotOn: 'bg-teal-400',
    bgOn: 'bg-teal-500/8', borderOn: 'border-teal-500/20',
    controls: [], autoOff: true,
  },
  led_lights: {
    label: 'LED Lights', subtitle: 'Full-spectrum grow illumination',
    Icon: Sun, onLabel: 'Active', offLabel: 'Off',
    iconOn: 'text-amber-400', dotOn: 'bg-amber-400',
    bgOn: 'bg-amber-400/8', borderOn: 'border-amber-400/20',
    controls: ['brightness', 'color_spectrum'], autoOff: true,
  },
  ph_adjuster: {
    label: 'pH Adjuster', subtitle: 'Solution pH correction',
    Icon: TestTube2, onLabel: 'Dosing', offLabel: 'Standby',
    iconOn: 'text-violet-400', dotOn: 'bg-violet-400',
    bgOn: 'bg-violet-500/8', borderOn: 'border-violet-500/20',
    controls: ['dose_amount'], autoOff: false,
  },
}

const SPECTRUM_OPTIONS = ['Full', 'Veg', 'Bloom', 'Red', 'Blue'] as const

// ─── Warning derivation ───────────────────────────────────────────────────────
interface Warning { level: 'warning' | 'critical'; message: string }

function deriveWarnings(id: ActuatorId, state: boolean, r: SensorReadings | null, recipe: GoldenState): Warning[] {
  if (!r || state) return []
  const w: Warning[] = []
  switch (id) {
    case 'cooling_fan':
      if (r.air_temp > recipe.air_temp.critMax)       w.push({ level: 'critical', message: `Temperature critical — ${r.air_temp.toFixed(1)}°C` })
      else if (r.air_temp > recipe.air_temp.warnMax)  w.push({ level: 'warning',  message: `Temperature high — ${r.air_temp.toFixed(1)}°C` })
      break
    case 'heater':
      if (r.air_temp < recipe.air_temp.critMin)       w.push({ level: 'critical', message: `Temperature critical — ${r.air_temp.toFixed(1)}°C` })
      else if (r.air_temp < recipe.air_temp.warnMin)  w.push({ level: 'warning',  message: `Temperature low — ${r.air_temp.toFixed(1)}°C` })
      break
    case 'dehumidifier':
      if (r.humidity > recipe.humidity.critMax)       w.push({ level: 'critical', message: `Humidity critical — ${r.humidity.toFixed(0)}%` })
      else if (r.humidity > recipe.humidity.warnMax)  w.push({ level: 'warning',  message: `Humidity high — ${r.humidity.toFixed(0)}%` })
      break
    case 'led_lights':
      if (r.light_intensity < recipe.light_intensity.warnMin)
        w.push({ level: 'warning', message: `Light below optimal — ${r.light_intensity.toFixed(0)} µmol/m²/s` })
      break
    case 'water_pump':
      if (r.soil_moisture < recipe.soil_moisture.critMin)      w.push({ level: 'critical', message: `Soil moisture critical — ${r.soil_moisture.toFixed(0)}%` })
      else if (r.soil_moisture < recipe.soil_moisture.warnMin) w.push({ level: 'warning',  message: `Soil moisture low — ${r.soil_moisture.toFixed(0)}%` })
      break
    case 'ph_adjuster':
      if (r.ph < recipe.ph.critMin || r.ph > recipe.ph.critMax)
        w.push({ level: 'critical', message: `pH critical — ${r.ph.toFixed(2)}` })
      else if (r.ph < recipe.ph.warnMin || r.ph > recipe.ph.warnMax)
        w.push({ level: 'warning', message: `pH out of range — ${r.ph.toFixed(2)}` })
      break
  }
  return w
}

// ─── ActuatorCard ─────────────────────────────────────────────────────────────
export interface ActuatorCardProps {
  id:           ActuatorId
  entry:        ActuatorEntry
  cmd:          CommandState
  readings:     SensorReadings | null
  recipe:       GoldenState
  onRequest:    () => void
  onConfirm:    (newState: boolean, params?: CommandParams, autoOffMinutes?: number) => void
  onCancel:     () => void
  onSetAuto:    () => void
  onSendParams: (state: boolean, params: CommandParams) => void
}

export function ActuatorCard({
  id, entry, cmd, readings, recipe,
  onRequest, onConfirm, onCancel, onSetAuto, onSendParams,
}: ActuatorCardProps) {
  const cfg = CONFIGS[id]
  const { label, subtitle, Icon, onLabel, offLabel, iconOn, dotOn, bgOn, borderOn } = cfg
  const { phase, requestedAt, error } = cmd
  const { state, mode, params } = entry
  const isManual = mode === 'manual'

  // ── Local param state ──────────────────────────────────────────────────────
  const [speed,      setSpeed     ] = useState<number>(params.speed            ?? 50)
  const [brightness, setBrightness] = useState<number>(params.brightness       ?? 80)
  const [spectrum,   setSpectrum  ] = useState<string>(params.color_spectrum   ?? 'full')
  const [duration,   setDuration  ] = useState<string>(String(params.duration_minutes ?? 5))
  const [dose,       setDose      ] = useState<string>(String(params.dose_amount      ?? 1))
  const [autoOffMin, setAutoOffMin] = useState<string>('')

  const prevStateRef = useRef(state)
  useEffect(() => {
    if (state !== prevStateRef.current) {
      prevStateRef.current = state
      if (params.speed            != null) setSpeed(params.speed)
      if (params.brightness       != null) setBrightness(params.brightness)
      if (params.color_spectrum   != null) setSpectrum(params.color_spectrum)
      if (params.duration_minutes != null) setDuration(String(params.duration_minutes))
      if (params.dose_amount      != null) setDose(String(params.dose_amount))
    }
  }, [state, params])

  const warnings = deriveWarnings(id, state, readings, recipe)

  function buildParams(): CommandParams {
    const p: CommandParams = {}
    if (cfg.controls.includes('speed'))            p.speed            = speed
    if (cfg.controls.includes('brightness'))       p.brightness       = brightness
    if (cfg.controls.includes('color_spectrum'))   p.color_spectrum   = spectrum
    if (cfg.controls.includes('duration_minutes')) p.duration_minutes = Number(duration) || 5
    if (cfg.controls.includes('dose_amount'))      p.dose_amount      = Number(dose) || 1
    return p
  }

  function handleConfirm() {
    const p = buildParams()
    const hasParams = Object.keys(p).length > 0
    const autoOff = id === 'water_pump'
      ? (Number(duration) || undefined)
      : (autoOffMin ? Number(autoOffMin) : undefined)
    onConfirm(!state, hasParams ? p : undefined, autoOff)
  }

  function handleSpectrumChange(val: string) {
    setSpectrum(val)
    if (state) onSendParams(state, { color_spectrum: val })
  }

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

      <div className="p-4 flex flex-col gap-3">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${state ? bgOn : 'bg-zinc-800'}`}>
              <Icon size={14} className={state ? iconOn : 'text-zinc-600'} />
            </div>
            <div>
              <p className={`text-xs font-semibold leading-tight transition-colors ${state ? 'text-zinc-100' : 'text-zinc-400'}`}>{label}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{subtitle}</p>
            </div>
          </div>
          {isManual && (
            <span className="shrink-0 text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
              MANUAL
            </span>
          )}
        </div>

        {/* ── State dot ── */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${state ? `${dotOn} animate-pulse` : 'bg-zinc-700'}`} />
          <span className={`text-[11px] font-medium ${state ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {state ? onLabel : offLabel}
          </span>
        </div>

        {/* ── Parameter controls ── */}
        {(cfg.controls.length > 0 || (cfg.autoOff && !state)) && (
          <div className="flex flex-col gap-1.5 py-1.5 border-y border-zinc-800/50">

            {cfg.controls.includes('speed') && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500">Speed</span>
                <input
                  type="range" min={0} max={100} value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  onMouseUp={e => { if (state) onSendParams(state, { speed: Number((e.target as HTMLInputElement).value) }) }}
                  onTouchEnd={e => { if (state) onSendParams(state, { speed: Number((e.target as HTMLInputElement).value) }) }}
                  className="flex-1 h-1 rounded appearance-none bg-zinc-700 accent-cyan-400 cursor-pointer"
                />
                <span className={`w-8 shrink-0 text-right text-[10px] font-mono tabular-nums ${state ? iconOn : 'text-zinc-600'}`}>{speed}%</span>
              </div>
            )}

            {cfg.controls.includes('brightness') && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500">Brightness</span>
                <input
                  type="range" min={0} max={100} value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  onMouseUp={e => { if (state) onSendParams(state, { brightness: Number((e.target as HTMLInputElement).value) }) }}
                  onTouchEnd={e => { if (state) onSendParams(state, { brightness: Number((e.target as HTMLInputElement).value) }) }}
                  className="flex-1 h-1 rounded appearance-none bg-zinc-700 accent-amber-400 cursor-pointer"
                />
                <span className={`w-8 shrink-0 text-right text-[10px] font-mono tabular-nums ${state ? iconOn : 'text-zinc-600'}`}>{brightness}%</span>
              </div>
            )}

            {cfg.controls.includes('color_spectrum') && (
              <div className="flex items-start gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500 pt-0.5">Spectrum</span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {SPECTRUM_OPTIONS.map(opt => {
                    const val = opt.toLowerCase()
                    return (
                      <button
                        key={val}
                        onClick={() => handleSpectrumChange(val)}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                          spectrum === val
                            ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {cfg.controls.includes('duration_minutes') && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500">Duration</span>
                <input
                  type="number" min={0.5} step={0.5} value={duration}
                  onChange={e => setDuration(e.target.value)}
                  onBlur={() => { if (state) onSendParams(state, { duration_minutes: Number(duration) || 5 }) }}
                  className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-[10px] text-zinc-200 text-center focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[10px] text-zinc-600">min</span>
              </div>
            )}

            {cfg.controls.includes('dose_amount') && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500">Dose</span>
                <input
                  type="number" min={0.1} step={0.1} value={dose}
                  onChange={e => setDose(e.target.value)}
                  onBlur={() => { if (state) onSendParams(state, { dose_amount: Number(dose) || 1 }) }}
                  className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-[10px] text-zinc-200 text-center focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-[10px] text-zinc-600">mL</span>
              </div>
            )}

            {cfg.autoOff && !state && (phase === 'idle' || phase === 'confirming') && (
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] text-zinc-500">Auto-off</span>
                <input
                  type="number" min={1} step={1} placeholder="—"
                  value={autoOffMin}
                  onChange={e => setAutoOffMin(e.target.value)}
                  className="w-14 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-[10px] text-zinc-400 text-center focus:outline-none focus:border-zinc-500 placeholder:text-zinc-700"
                />
                <span className="text-[10px] text-zinc-600">min</span>
              </div>
            )}

          </div>
        )}

        {/* ── Action section ── */}
        <div className="flex flex-col gap-1.5">

          {phase === 'idle' && (
            <button
              onClick={onRequest}
              className={`w-full text-[11px] font-medium py-1.5 px-3 rounded-lg border transition-colors ${
                state
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
              }`}
            >
              {state ? 'Turn Off' : 'Turn On'}
            </button>
          )}

          {phase === 'confirming' && (
            <div className="flex gap-1.5">
              <button
                onClick={handleConfirm}
                className={`flex-1 text-[11px] font-semibold py-1.5 px-2 rounded-lg border transition-colors ${
                  state
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                }`}
              >
                {state ? 'Confirm Off' : 'Confirm On'}
              </button>
              <button
                onClick={onCancel}
                className="px-2.5 text-[11px] text-zinc-500 hover:text-zinc-300 rounded-lg border border-zinc-800 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {phase === 'pending' && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-zinc-500">
              <Loader2 size={11} className="animate-spin" />
              <span>Sending…</span>
            </div>
          )}

          {phase === 'confirmed' && (
            <div className="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-green-400">
              <CheckCircle2 size={11} />
              <span>Done</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-center justify-center gap-1 py-1.5 text-[11px] text-red-400">
              <XCircle size={11} className="shrink-0" />
              <span className="line-clamp-2 text-center">{error ?? 'Failed'}</span>
            </div>
          )}

          {isManual && phase === 'idle' && (
            <button
              onClick={onSetAuto}
              className="w-full text-[10px] text-zinc-600 hover:text-zinc-400 py-1 rounded transition-colors"
            >
              ↩ Return to Auto
            </button>
          )}

        </div>
      </div>

      {/* ── Persistent warnings ── */}
      {warnings.length > 0 && (
        <div className="border-t border-zinc-800/60 px-4 py-2.5 flex flex-col gap-1">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-1.5 text-[10px] ${w.level === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
              <AlertTriangle size={9} className="mt-px shrink-0" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
