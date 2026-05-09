import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, CheckCircle2, Droplets, Fan, Flame,
  Loader2, LucideIcon, RotateCcw, Sun, TestTube2, Wind, XCircle,
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
  compact?:     boolean
}

export function ActuatorCard({
  id, entry, cmd, readings, recipe,
  onRequest, onConfirm, onCancel, onSetAuto, onSendParams,
  compact = false,
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

  if (compact) {
    return (
      <div className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
        state ? `${bgOn} ${borderOn}` : 'bg-zinc-900/40 border-zinc-800/50'
      }`}>
        <div className={`p-2.5 rounded-lg ${state ? bgOn : 'bg-zinc-800/50'}`}>
          <Icon size={18} className={state ? iconOn : 'text-zinc-600'} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-xs font-bold truncate ${state ? 'text-zinc-100' : 'text-zinc-400'}`}>{label}</h3>
            {isManual && (
              <span className="text-[8px] font-bold tracking-tighter px-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">MAN</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${state ? `${dotOn} animate-pulse shadow-[0_0_8px_currentColor]` : 'bg-zinc-700'}`} />
            <span className={`text-[10px] font-medium ${state ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {state ? onLabel : offLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === 'idle' && (
            <button
              onClick={onRequest}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                state 
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                  : 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20'
              }`}
            >
              {state ? 'OFF' : 'ON'}
            </button>
          )}
          {phase === 'confirming' && (
            <div className="flex gap-1">
              <button onClick={handleConfirm} className="p-1.5 rounded-lg bg-green-500 text-white"><CheckCircle2 size={14} /></button>
              <button onClick={onCancel} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400"><XCircle size={14} /></button>
            </div>
          )}
          {phase === 'pending' && <Loader2 size={14} className="animate-spin text-zinc-500 mr-2" />}
          {phase === 'confirmed' && <CheckCircle2 size={14} className="text-green-500 mr-2" />}
          {phase === 'error' && <AlertTriangle size={14} className="text-red-500 mr-2" />}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col rounded-2xl border transition-all duration-500 group ${
      state 
        ? `${bgOn} ${borderOn} shadow-lg shadow-black/20` 
        : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700/50'
    }`}>
      {/* ── Progress bar for confirming/pending ── */}
      <AnimatePresence>
        {(phase === 'confirming' || phase === 'pending') && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl origin-left ${
              phase === 'confirming' ? 'bg-amber-500/50' : 'bg-blue-500/50'
            }`}
            transition={{ duration: phase === 'confirming' ? CONFIRM_MS/1000 : 30, ease: 'linear' }}
          />
        )}
      </AnimatePresence>

      <div className="p-5 flex flex-col gap-4">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl transition-all duration-300 ${
              state ? `${bgOn} ring-1 ${borderOn}` : 'bg-zinc-800/50'
            }`}>
              <Icon size={18} className={state ? iconOn : 'text-zinc-600'} />
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${state ? 'text-zinc-100' : 'text-zinc-400'}`}>{label}</h3>
              <p className="text-[10px] text-zinc-600 font-medium mt-0.5">{subtitle}</p>
            </div>
          </div>
          {isManual && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold tracking-widest">
              MANUAL
            </span>
          )}
        </div>

        {/* ── Status ── */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            state ? `${dotOn} animate-pulse shadow-[0_0_10px_currentColor]` : 'bg-zinc-800 ring-1 ring-zinc-700'
          }`} />
          <span className={`text-[11px] font-bold uppercase tracking-wider ${state ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {state ? onLabel : offLabel}
          </span>
        </div>

        {/* ── Controls ── */}
        {(cfg.controls.length > 0 || (cfg.autoOff && !state)) && (
          <div className="space-y-3 py-4 border-y border-zinc-800/50">
            {cfg.controls.includes('speed') && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-zinc-500 uppercase tracking-tighter">Fan Speed</span>
                  <span className={state ? iconOn : 'text-zinc-400'}>{speed}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={speed}
                  onChange={e => setSpeed(Number(e.target.value))}
                  onMouseUp={e => { if (state) onSendParams(state, { speed: Number((e.target as HTMLInputElement).value) }) }}
                  className={`w-full h-1.5 rounded-full appearance-none bg-zinc-800 cursor-pointer accent-cyan-500`}
                />
              </div>
            )}

            {cfg.controls.includes('brightness') && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-zinc-500 uppercase tracking-tighter">Intensity</span>
                  <span className={state ? iconOn : 'text-zinc-400'}>{brightness}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  onMouseUp={e => { if (state) onSendParams(state, { brightness: Number((e.target as HTMLInputElement).value) }) }}
                  className={`w-full h-1.5 rounded-full appearance-none bg-zinc-800 cursor-pointer accent-amber-500`}
                />
              </div>
            )}

            {cfg.controls.includes('color_spectrum') && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Spectrum</span>
                <div className="flex flex-wrap gap-1.5">
                  {SPECTRUM_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleSpectrumChange(opt.toLowerCase())}
                      className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all border ${
                        spectrum === opt.toLowerCase()
                          ? 'bg-zinc-100 text-zinc-900 border-zinc-100'
                          : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:border-zinc-600'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cfg.controls.includes('duration_minutes') && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Duration</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-12 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1 text-[10px] text-zinc-200 text-center"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                </div>
              </div>
            )}

            {cfg.autoOff && !state && (
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Auto-Off</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number" placeholder="—" value={autoOffMin}
                    onChange={e => setAutoOffMin(e.target.value)}
                    className="w-12 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1 text-[10px] text-zinc-200 text-center"
                  />
                  <span className="text-[10px] text-zinc-600 font-bold">MIN</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <div className="mt-2">
          {phase === 'idle' && (
            <button
              onClick={onRequest}
              className={`w-full py-2.5 rounded-xl text-[11px] font-bold tracking-wider transition-all shadow-sm ${
                state
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/50'
                  : 'bg-zinc-100 text-zinc-900 hover:bg-white'
              }`}
            >
              {state ? 'TURN OFF' : 'TURN ON'}
            </button>
          )}

          {phase === 'confirming' && (
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-[11px] font-bold tracking-wider hover:bg-green-400 transition-all shadow-lg shadow-green-500/20"
              >
                CONFIRM
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-[11px] font-bold hover:bg-zinc-700 transition-all"
              >
                CANCEL
              </button>
            </div>
          )}

          {phase === 'pending' && (
            <div className="w-full py-2.5 rounded-xl bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Communicating...</span>
            </div>
          )}

          {phase === 'confirmed' && (
            <div className="w-full py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Acknowledged</span>
            </div>
          )}

          {phase === 'error' && (
            <div className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2 px-4">
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
              <span className="text-[10px] font-bold text-red-500 truncate uppercase">{error || 'Error'}</span>
            </div>
          )}
          
          {isManual && phase === 'idle' && (
            <button
              onClick={onSetAuto}
              className="w-full mt-2 text-[9px] font-bold text-zinc-600 hover:text-zinc-400 transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={10} />
              RETURN TO AUTO
            </button>
          )}
        </div>
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="px-5 pb-5 flex flex-col gap-2">
          {warnings.map((w, i) => (
            <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${
              w.level === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span className="text-[10px] font-medium leading-tight">{w.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
