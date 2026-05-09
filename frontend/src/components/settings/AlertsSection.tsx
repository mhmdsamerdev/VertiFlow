import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Bell, Plus, Edit2, Trash2, Loader2, Save, X,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { useSettingsContext } from '../../context/SettingsContext'
import { GoldenState } from '../../types/telemetry'

const SENSOR_LABELS: Record<string, string> = {
  ph: 'pH', ec: 'EC', air_temp: 'Air Temp (°C)', humidity: 'Humidity (%)',
  soil_moisture: 'Soil Moisture (%)', light_intensity: 'Light (µmol)', co2: 'CO₂ (ppm)',
}
const SENSOR_KEYS = Object.keys(SENSOR_LABELS)
const OPERATORS   = ['>', '<', '>=', '<=', '==', '!=']
const SEVERITIES  = ['info', 'warning', 'critical']
const CHANNELS    = ['email', 'sms', 'push', 'webhook']
const THRESHOLD_FIELDS = ['crit_min', 'warn_min', 'target', 'warn_max', 'crit_max'] as const
type ThresholdField = typeof THRESHOLD_FIELDS[number]
const THRESHOLD_FIELD_LABELS: Record<ThresholdField, string> = {
  crit_min: 'Crit Min',
  warn_min: 'Warn Min',
  target: 'Target',
  warn_max: 'Warn Max',
  crit_max: 'Crit Max',
}

const SEVERITY_COLORS: Record<string, string> = {
  info:     'text-blue-400 bg-blue-500/10 border-blue-500/20',
  warning:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20',
}

interface Condition {
  sensor_type: string
  operator: string
  value: number
  value_mode?: 'manual' | 'threshold'
  threshold_field?: ThresholdField
}
interface AlertForm {
  name: string; severity: string; conditions: Condition[]; channels: string[]
}
const emptyForm = (): AlertForm => ({
  name: '', severity: 'warning',
  conditions: [{ sensor_type: 'air_temp', operator: '>', value: 35, value_mode: 'manual', threshold_field: 'target' }],
  channels: [],
})

const ConditionRow = React.memo(({ cond, idx, onChange, onRemove, sensorThresholds }: {
  cond: Condition; idx: number
  onChange: (c: Condition) => void; onRemove: () => void
  sensorThresholds?: GoldenState[keyof GoldenState]
}) => {
  const sel = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50'
  const valueMode = cond.value_mode ?? 'manual'
  const thresholdField = cond.threshold_field ?? 'target'
  const resolvedThresholdValue =
    thresholdField === 'crit_min' ? sensorThresholds?.critMin :
    thresholdField === 'warn_min' ? sensorThresholds?.warnMin :
    thresholdField === 'target' ? sensorThresholds?.target :
    thresholdField === 'warn_max' ? sensorThresholds?.warnMax :
    sensorThresholds?.critMax
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {idx > 0 && <span className="text-[10px] text-zinc-600 font-bold">AND</span>}
      <span className="text-[10px] text-zinc-500">IF</span>
      <select value={cond.sensor_type} onChange={e => onChange({...cond, sensor_type: e.target.value})} className={sel}>
        {SENSOR_KEYS.map(k => <option key={k} value={k}>{SENSOR_LABELS[k]}</option>)}
      </select>
      <select value={cond.operator} onChange={e => onChange({...cond, operator: e.target.value})} className={`${sel} w-14`}>
        {OPERATORS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange({ ...cond, value_mode: valueMode === 'manual' ? 'threshold' : 'manual' })}
          className={`px-2 py-1 rounded border text-[10px] ${
            valueMode === 'threshold'
              ? 'text-green-400 border-green-500/40 bg-green-500/10'
              : 'text-zinc-400 border-zinc-700 bg-zinc-800'
          }`}
          title="Use a threshold variable"
        >
          {valueMode === 'threshold' ? 'Var' : '#'}
        </button>
        {valueMode === 'threshold' ? (
          <select
            value={thresholdField}
            onChange={e => onChange({
              ...cond,
              value_mode: 'threshold',
              threshold_field: e.target.value as ThresholdField,
            })}
            className={`${sel} w-28`}
          >
            {THRESHOLD_FIELDS.map(field => (
              <option key={field} value={field}>{THRESHOLD_FIELD_LABELS[field]}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            step="0.1"
            value={Number.isFinite(cond.value) ? cond.value : ''}
            onChange={e => {
              const next = e.target.value
              onChange({ ...cond, value: next === '' ? NaN : parseFloat(next), value_mode: 'manual' })
            }}
            className={`${sel} w-20`}
          />
        )}
      </div>
      {valueMode === 'threshold' && (
        <span className="text-[10px] text-zinc-500 min-w-14">
          {resolvedThresholdValue ?? '—'}
        </span>
      )}
      <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400"><X size={11} /></button>
    </div>
  )
})

const AlertFormBody = React.memo(({
  form,
  setForm,
  selectedRecipe,
}: { form: AlertForm; setForm: (f: AlertForm) => void; selectedRecipe?: GoldenState }) => {
  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Alert Name *</label>
          <input type="text" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            placeholder="e.g., High Temp Critical" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Severity</label>
          <select value={form.severity}
            onChange={e => setForm({...form, severity: e.target.value})} className={inputCls}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Trigger Conditions</p>
        <div className="space-y-2">
          {form.conditions.map((c, i) => (
            <ConditionRow key={i} cond={c} idx={i}
              sensorThresholds={selectedRecipe?.[c.sensor_type as keyof GoldenState]}
              onChange={nc => setForm({...form, conditions: form.conditions.map((x,j) => j===i ? nc : x)})}
              onRemove={() => {
                if (form.conditions.length === 1) return
                setForm({...form, conditions: form.conditions.filter((_,j) => j!==i)})
              }} />
          ))}
        </div>
        <button onClick={() => setForm({...form, conditions: [...form.conditions, {
          sensor_type: 'air_temp', operator: '>', value: 30, value_mode: 'manual', threshold_field: 'target',
        }]})}
          className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
          <Plus size={11}/> Add condition
        </button>
      </div>

      {/* Channels */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Notification Channels</p>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(ch => {
            const active = form.channels.includes(ch)
            return (
              <button key={ch}
                onClick={() => setForm({...form, channels: active
                  ? form.channels.filter(c => c !== ch)
                  : [...form.channels, ch]})}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                }`}>
                {ch}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

export function AlertsSection() {
  const { farms, activeZone } = useZoneContext()
  const {
    alertConfigs, alertsLoading,
    fetchAlertConfigs, createAlertConfig, updateAlertConfig, deleteAlertConfig,
  } = useSettingsContext()

  const [selectedZoneId, setSelectedZoneId] = useState(activeZone?.id ?? '')
  const [showAdd,   setShowAdd]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<AlertForm>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const allZones = useMemo(() => farms.flatMap(f => f.zones), [farms])
  const selectedZone = useMemo(() => allZones.find(z => z.id === selectedZoneId) ?? null, [allZones, selectedZoneId])

  // Sync selectedZoneId with activeZone from context (e.g. if switched in sidebar)
  useEffect(() => {
    if (activeZone?.id) setSelectedZoneId(activeZone.id)
  }, [activeZone?.id])

  useEffect(() => {
    if (selectedZoneId) fetchAlertConfigs(selectedZoneId)
  }, [selectedZoneId, fetchAlertConfigs])

  const withSaving = useCallback(async (fn: () => Promise<unknown>) => {
    setSaving(true); setError(null)
    try {
      await fn()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save alert. Please check all fields.'
      setError(message)
      console.error(e)
    } finally {
      setSaving(false)
    }
  }, [])

  function startEdit(id: string) {
    const a = alertConfigs.find(x => x.id === id)
    if (!a) return
    setError(null)
    setForm({
      name: a.name, severity: a.severity,
      conditions: (a.conditions as Condition[]).map(c => ({ ...c, value_mode: 'manual', threshold_field: 'target' })),
      channels: a.channels,
    })
    setEditingId(id); setShowAdd(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !selectedZoneId) {
      setError('Alert name and zone are required.')
      return
    }
    if (form.conditions.length === 0) {
      setError('At least one trigger condition is required.')
      return
    }
    const resolvedConditions = form.conditions.map(c => {
      if ((c.value_mode ?? 'manual') === 'threshold') {
        const field = c.threshold_field ?? 'target'
        const sensorThresholds = selectedZone?.recipe?.[c.sensor_type as keyof GoldenState]
        const value =
          field === 'crit_min' ? sensorThresholds?.critMin :
          field === 'warn_min' ? sensorThresholds?.warnMin :
          field === 'target' ? sensorThresholds?.target :
          field === 'warn_max' ? sensorThresholds?.warnMax :
          sensorThresholds?.critMax
        return { sensor_type: c.sensor_type, operator: c.operator, value: value ?? NaN }
      }
      return { sensor_type: c.sensor_type, operator: c.operator, value: c.value }
    })
    if (resolvedConditions.some(c => !Number.isFinite(c.value))) {
      setError('One or more trigger values are invalid. Check your manual values or threshold bindings.')
      return
    }
    await withSaving(() => createAlertConfig({
      zone_id: selectedZoneId, name: form.name, severity: form.severity,
      conditions: resolvedConditions, channels: form.channels,
    }, selectedZoneId))
    setShowAdd(false); setForm(emptyForm()); setError(null)
  }

  async function handleSave(id: string) {
    const conditions = form.conditions.map(c => ({ sensor_type: c.sensor_type, operator: c.operator, value: c.value }))
    if (conditions.some(c => !Number.isFinite(c.value))) {
      setError('All trigger values must be valid numbers.')
      return
    }
    await withSaving(() => updateAlertConfig(id, {
      name: form.name, severity: form.severity,
      conditions, channels: form.channels,
    }, selectedZoneId))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this alert config?')) return
    await withSaving(() => deleteAlertConfig(id, selectedZoneId))
  }

  async function handleToggle(id: string) {
    const a = alertConfigs.find(x => x.id === id)
    if (!a) return
    await withSaving(() => updateAlertConfig(id, { enabled: !a.enabled }, selectedZoneId))
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Alerts</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Configure which sensor conditions trigger alerts and how you're notified.
        </p>
      </div>

      {/* Zone selector */}
      <div className="mb-6">
        <label className="block text-xs text-zinc-500 mb-1.5">Zone</label>
        <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)} className={inputCls}>
          <option value="">— Select a zone —</option>
          {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

      {selectedZoneId && (
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()) }}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Alert Config
        </button>
      )}
      {error && (
        <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">New Alert</h3>
          <AlertFormBody form={form} setForm={setForm} selectedRecipe={selectedZone?.recipe} />
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Create Alert
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm()) }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alertsLoading ? (
        <div className="flex items-center gap-2 py-6 text-zinc-600 text-sm">
          <Loader2 size={14} className="animate-spin"/>Loading alerts…
        </div>
      ) : !selectedZoneId ? (
        <p className="text-sm text-zinc-600 py-6 text-center">Select a zone to view alerts</p>
      ) : alertConfigs.length === 0 ? (
        <p className="text-sm text-zinc-600 py-6 text-center">No alert configs yet — create your first alert above</p>
      ) : (
        <div className="space-y-2">
          {alertConfigs.map(alert => {
            const isEditing = editingId === alert.id
            return (
              <div key={alert.id} className="card p-4">
                {isEditing ? (
                  <>
                    <AlertFormBody form={form} setForm={setForm} selectedRecipe={selectedZone?.recipe} />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleSave(alert.id)} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm">Cancel</button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{alert.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[alert.severity]}`}>
                          {alert.severity}
                        </span>
                        {!alert.enabled && (
                          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">disabled</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        {alert.conditions.map((c: Condition, i: number) => (
                          <p key={i} className="font-mono">
                            {i > 0 ? 'AND ' : ''}{SENSOR_LABELS[c.sensor_type] ?? c.sensor_type} {c.operator} {c.value}
                          </p>
                        ))}
                      </div>
                      {alert.channels.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {alert.channels.map((ch: string) => (
                            <span key={ch} className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded-full border border-zinc-700">{ch}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggle(alert.id)} title={alert.enabled ? 'Disable' : 'Enable'}>
                        {alert.enabled
                          ? <ToggleRight size={20} className="text-green-500"/>
                          : <ToggleLeft  size={20} className="text-zinc-600"/>}
                      </button>
                      <button onClick={() => startEdit(alert.id)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded">
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => handleDelete(alert.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
