import React, { useEffect, useMemo, useState } from 'react'
import {
  Workflow, Plus, Edit2, Trash2, Loader2, Save, X,
  ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
} from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { useSettingsContext } from '../../context/SettingsContext'
import { RuleCondition, RuleAction } from '../../api/config'
import { GoldenState } from '../../types/telemetry'

const SENSOR_KEYS = ['ph', 'ec', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity', 'co2'] as const
const SENSOR_LABELS: Record<string, string> = {
  ph: 'pH', ec: 'EC', air_temp: 'Air Temp (°C)', humidity: 'Humidity (%)',
  soil_moisture: 'Soil Moisture (%)', light_intensity: 'Light (µmol)', co2: 'CO₂ (ppm)',
}
const OPERATORS = ['>', '<', '>=', '<=', '==', '!=']
const ACTUATORS = ['cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster']
const ACTION_TYPES = ['turn_on', 'turn_off', 'send_alert']
const THRESHOLD_FIELDS = ['crit_min', 'warn_min', 'target', 'warn_max', 'crit_max'] as const
type ThresholdField = typeof THRESHOLD_FIELDS[number]
const THRESHOLD_FIELD_LABELS: Record<ThresholdField, string> = {
  crit_min: 'Crit Min',
  warn_min: 'Warn Min',
  target: 'Target',
  warn_max: 'Warn Max',
  crit_max: 'Crit Max',
}

interface ConditionDraft extends RuleCondition {
  value_mode?: 'manual' | 'threshold'
  threshold_field?: ThresholdField
}

const emptyCondition = (): ConditionDraft => ({
  sensor_type: 'air_temp',
  operator: '>',
  value: 28,
  value_mode: 'manual',
  threshold_field: 'target',
})
const emptyAction    = (): RuleAction    => ({ type: 'turn_on', device_id: 'cooling_fan' })

interface RuleForm {
  name: string
  description: string
  conditions: ConditionDraft[]
  actions: RuleAction[]
}
const emptyForm = (): RuleForm => ({
  name: '', description: '',
  conditions: [emptyCondition()],
  actions: [emptyAction()],
})

// ── Sub-components (defined outside to prevent focus loss on re-render) ─────

const ConditionRow = React.memo(({ cond, idx, onChange, onRemove, sensorThresholds }: {
  cond: ConditionDraft; idx: number
  onChange: (c: ConditionDraft) => void; onRemove: () => void
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
      {idx > 0 && <span className="text-xs text-zinc-600 font-semibold">AND</span>}
      <span className="text-xs text-zinc-500">IF</span>
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
            value={Number.isFinite(cond.value) ? cond.value : ''}
            step="0.1"
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
      <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 rounded"><X size={12} /></button>
    </div>
  )
})

const ActionRow = React.memo(({ act, onChange, onRemove }: {
  act: RuleAction; onChange: (a: RuleAction) => void; onRemove: () => void
}) => {
  const sel = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-zinc-500">THEN</span>
      <select value={act.type} onChange={e => onChange({...act, type: e.target.value})} className={sel}>
        {ACTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
      </select>
      <select value={act.device_id} onChange={e => onChange({...act, device_id: e.target.value})} className={sel}>
        {ACTUATORS.map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
      </select>
      <button onClick={onRemove} className="p-1 text-zinc-600 hover:text-red-400 rounded"><X size={12} /></button>
    </div>
  )
})

interface RuleFormBodyProps {
  form: RuleForm;
  setForm: (f: RuleForm) => void;
  selectedRecipe?: GoldenState;
}

const RuleFormBody = React.memo(({ form, setForm, selectedRecipe }: RuleFormBodyProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Rule Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            placeholder="e.g., High Temp Fan Override"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Description</label>
          <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            placeholder="Optional description"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50" />
        </div>
      </div>

      {/* Conditions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Conditions</p>
        <div className="space-y-2">
          {form.conditions.map((c, i) => (
            <ConditionRow key={i} cond={c} idx={i}
              sensorThresholds={selectedRecipe?.[c.sensor_type as keyof GoldenState]}
              onChange={nc => setForm({...form, conditions: form.conditions.map((x, j) => j === i ? nc : x)})}
              onRemove={() => {
                if (form.conditions.length === 1) return
                setForm({...form, conditions: form.conditions.filter((_, j) => j !== i)})
              }} />
          ))}
        </div>
        <button onClick={() => setForm({...form, conditions: [...form.conditions, emptyCondition()]})}
          className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <Plus size={11} /> Add condition
        </button>
      </div>

      {/* Actions */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Actions</p>
        <div className="space-y-2">
          {form.actions.map((a, i) => (
            <ActionRow key={i} act={a}
              onChange={na => setForm({...form, actions: form.actions.map((x, j) => j === i ? na : x)})}
              onRemove={() => {
                if (form.actions.length === 1) return
                setForm({...form, actions: form.actions.filter((_, j) => j !== i)})
              }} />
          ))}
        </div>
        <button onClick={() => setForm({...form, actions: [...form.actions, emptyAction()]})}
          className="mt-2 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <Plus size={11} /> Add action
        </button>
      </div>
    </div>
  )
})

export function AutomationRulesSection() {
  const { farms, activeZone } = useZoneContext()
  const { rules, rulesLoading, fetchRules, createRule, updateRule, toggleRule, deleteRule } = useSettingsContext()

  const [selectedZoneId, setSelectedZoneId] = useState(activeZone?.id ?? '')
  const [showAdd,   setShowAdd]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [form,      setForm]      = useState<RuleForm>(emptyForm())
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const allZones = React.useMemo(() => farms.flatMap(f => f.zones), [farms])
  const selectedZone = useMemo(() => allZones.find(z => z.id === selectedZoneId) ?? null, [allZones, selectedZoneId])

  // Sync selectedZoneId with activeZone from context (e.g. if switched in sidebar)
  useEffect(() => {
    if (activeZone?.id) setSelectedZoneId(activeZone.id)
  }, [activeZone?.id])

  useEffect(() => {
    if (selectedZoneId) fetchRules(selectedZoneId)
  }, [selectedZoneId, fetchRules])

  async function withSaving(fn: () => Promise<unknown>) {
    setSaving(true); setError(null)
    try {
      await fn()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save rule. Please check all fields.'
      setError(message)
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(id: string) {
    const r = rules.find(x => x.id === id)
    if (!r) return
    setError(null)
    setForm({
      name: r.name,
      description: r.description,
      conditions: r.conditions.map(c => ({ ...c, value_mode: 'manual', threshold_field: 'target' })),
      actions: r.actions,
    })
    setEditingId(id)
    setShowAdd(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !selectedZoneId) {
      setError('Rule name and zone are required.')
      return
    }
    if (form.conditions.length === 0 || form.actions.length === 0) {
      setError('At least one condition and one action are required.')
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
    await withSaving(() => createRule({
      zone_id: selectedZoneId,
      name: form.name,
      description: form.description,
      conditions: resolvedConditions,
      actions: form.actions,
    }, selectedZoneId))
    setShowAdd(false); setForm(emptyForm()); setError(null)
  }

  async function handleSave(id: string) {
    const resolvedConditions = form.conditions.map(c => ({ sensor_type: c.sensor_type, operator: c.operator, value: c.value }))
    if (resolvedConditions.some(c => !Number.isFinite(c.value))) {
      setError('All condition values must be valid numbers.')
      return
    }
    await withSaving(() => updateRule(id, {
      name: form.name,
      description: form.description,
      conditions: resolvedConditions,
      actions: form.actions,
    }, selectedZoneId))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this rule?')) return
    await withSaving(() => deleteRule(id, selectedZoneId))
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Workflow size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Automation Rules</h2>
        </div>
        <p className="text-sm text-zinc-500">Build IF-THEN rules to automate your farm's actuators based on sensor readings.</p>
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
          <Plus size={16} /> New Rule
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
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">New Automation Rule</h3>
          <RuleFormBody form={form} setForm={setForm} selectedRecipe={selectedZone?.recipe} />
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={saving || !form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Rule
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm()) }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rulesLoading ? (
        <div className="flex items-center gap-2 py-6 text-zinc-600 text-sm"><Loader2 size={14} className="animate-spin" />Loading rules…</div>
      ) : !selectedZoneId ? (
        <p className="text-sm text-zinc-600 py-6 text-center">Select a zone to view rules</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-zinc-600 py-6 text-center">No automation rules yet — create your first rule above</p>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const isEditing  = editingId === rule.id
            const isExpanded = expanded === rule.id
            return (
              <div key={rule.id} className="card overflow-hidden">
                {/* Rule header */}
                <div className="flex items-center justify-between px-4 py-3 cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : rule.id)}>
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? <ChevronDown size={14} className="text-zinc-600 shrink-0" /> : <ChevronRight size={14} className="text-zinc-600 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{rule.name}</p>
                      <p className="text-xs text-zinc-600">{rule.conditions.length} condition(s) → {rule.actions.length} action(s) · triggered {rule.trigger_count}×</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => toggleRule(rule.id, selectedZoneId)} title={rule.enabled ? 'Disable' : 'Enable'}>
                      {rule.enabled
                        ? <ToggleRight size={20} className="text-green-500" />
                        : <ToggleLeft  size={20} className="text-zinc-600" />}
                    </button>
                    <button onClick={() => startEdit(rule.id)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Expanded view or edit */}
                {(isExpanded || isEditing) && (
                  <div className="border-t border-zinc-800 p-4">
                    {isEditing ? (
                      <>
                        <RuleFormBody form={form} setForm={setForm} selectedRecipe={selectedZone?.recipe} />
                        <div className="flex gap-2 mt-4">
                          <button onClick={() => handleSave(rule.id)} disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm">Cancel</button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3 text-xs">
                        <div>
                          <p className="font-semibold text-zinc-500 uppercase tracking-wider mb-1">When…</p>
                          {rule.conditions.map((c, i) => (
                            <p key={i} className="text-zinc-300 font-mono">
                              {i > 0 ? 'AND ' : ''}{SENSOR_LABELS[c.sensor_type]} {c.operator} {c.value}
                            </p>
                          ))}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-500 uppercase tracking-wider mb-1">Do…</p>
                          {rule.actions.map((a, i) => (
                            <p key={i} className="text-zinc-300 font-mono">{a.type.replace('_', ' ')} {a.device_id.replace('_', ' ')}</p>
                          ))}
                        </div>
                        {rule.last_triggered && (
                          <p className="text-zinc-600">Last triggered: {new Date(rule.last_triggered).toLocaleString()}</p>
                        )}
                      </div>
                    )}
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
