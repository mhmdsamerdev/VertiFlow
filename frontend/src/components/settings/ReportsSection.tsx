import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText, Plus, Calendar, Mail, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Trash2, Edit2, Loader2, Save, X,
  BarChart3, List, Settings, Thermometer, Droplets, Sun, Wind,
  Gauge, Activity, Beaker,
} from 'lucide-react'
import { reportApi, ApiReportSchedule } from '../../api/config'
import { SensorType, ReportFrequency, ReportType } from './types'

const SENSOR_ICONS: Record<SensorType, React.ElementType> = {
  ph: Beaker, ec: Gauge, air_temp: Thermometer, humidity: Droplets,
  soil_moisture: Activity, light_intensity: Sun, co2: Wind,
}
const SENSOR_LABELS: Record<SensorType, string> = {
  ph: 'pH', ec: 'EC', air_temp: 'Temperature', humidity: 'Humidity',
  soil_moisture: 'Soil Moisture', light_intensity: 'Light', co2: 'CO₂',
}
const FREQ_LABELS: Record<ReportFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}
const TYPE_META: Record<ReportType, { label: string; icon: React.ElementType }> = {
  summary: { label: 'Summary', icon: BarChart3 },
  detailed: { label: 'Detailed', icon: List },
  custom: { label: 'Custom', icon: Settings },
}
const SENSOR_KEYS = Object.keys(SENSOR_LABELS) as SensorType[]

interface ScheduleForm {
  name: string; frequency: ReportFrequency; report_type: ReportType
  recipients: string[]; metrics: SensorType[]
}
const emptyForm = (): ScheduleForm => ({
  name: '', frequency: 'weekly', report_type: 'summary',
  recipients: [''], metrics: ['ph', 'ec', 'air_temp', 'humidity'],
})
function fromApi(s: ApiReportSchedule): ScheduleForm {
  return {
    name: s.name, frequency: (s.frequency as ReportFrequency),
    report_type: (s.report_type as ReportType),
    recipients: s.recipients.length ? s.recipients : [''],
    metrics: s.metrics as SensorType[],
  }
}

function FormBody({ form, setForm }: { form: ScheduleForm; setForm: (f: ScheduleForm) => void }) {
  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Schedule Name *</label>
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Weekly Farm Summary" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Frequency</label>
          <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as ReportFrequency })} className={inputCls}>
            {(Object.keys(FREQ_LABELS) as ReportFrequency[]).map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Report Type</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TYPE_META) as ReportType[]).map(type => {
            const { label, icon: Icon } = TYPE_META[type]
            return (
              <button key={type} onClick={() => setForm({ ...form, report_type: type })}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${form.report_type === type ? 'bg-green-500/10 border-green-500/30 text-zinc-200' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                <Icon size={14} />{label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Include Metrics</label>
        <div className="flex flex-wrap gap-2">
          {SENSOR_KEYS.map(m => {
            const Icon = SENSOR_ICONS[m]; const active = form.metrics.includes(m)
            return (
              <button key={m} onClick={() => setForm({ ...form, metrics: active ? form.metrics.filter(x => x !== m) : [...form.metrics, m] })}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600'}`}>
                <Icon size={12} />{SENSOR_LABELS[m]}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-500">Email Recipients</label>
          <button onClick={() => setForm({ ...form, recipients: [...form.recipients, ''] })} className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
            <Plus size={11} />Add
          </button>
        </div>
        <div className="space-y-2">
          {form.recipients.map((email, i) => (
            <div key={i} className="flex gap-2">
              <input type="email" value={email} placeholder="email@example.com"
                onChange={e => { const r = [...form.recipients]; r[i] = e.target.value; setForm({ ...form, recipients: r }) }}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50" />
              {form.recipients.length > 1 && (
                <button onClick={() => setForm({ ...form, recipients: form.recipients.filter((_, j) => j !== i) })}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><X size={14} /></button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ReportsSection() {
  const [schedules, setSchedules] = useState<ApiReportSchedule[]>([])
  const [loading, setLoading]     = useState(false)
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules')
  const [showAdd, setShowAdd]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [form, setForm]           = useState<ScheduleForm>(emptyForm())
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setSchedules(await reportApi.list()) } catch (e) { setError(String(e)) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function withSaving(fn: () => Promise<void>) {
    setSaving(true); setError(null)
    try { await fn() } catch (e) { setError(String(e)) } finally { setSaving(false) }
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    await withSaving(async () => {
      await reportApi.create({ name: form.name, frequency: form.frequency, report_type: form.report_type, recipients: form.recipients.filter(r => r.trim()), metrics: form.metrics })
      await load()
    })
    setShowAdd(false); setForm(emptyForm())
  }

  async function handleSave(id: string) {
    await withSaving(async () => {
      await reportApi.update(id, { name: form.name, frequency: form.frequency, report_type: form.report_type, recipients: form.recipients.filter(r => r.trim()), metrics: form.metrics })
      await load()
    })
    setEditingId(null)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <FileText size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Automated Reports</h2>
        </div>
        <p className="text-sm text-zinc-500">Schedule and configure automated reports. Schedules are persisted to the database.</p>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/20 text-sm text-red-400">{error}</div>}

      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {(['schedules', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />}
          </button>
        ))}
      </div>

      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm()) }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />New Schedule
          </button>

          {showAdd && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">New Report Schedule</h3>
              <FormBody form={form} setForm={setForm} />
              <div className="flex gap-2 mt-4">
                <button onClick={handleAdd} disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Create
                </button>
                <button onClick={() => { setShowAdd(false); setForm(emptyForm()) }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-6 text-zinc-600 text-sm"><Loader2 size={14} className="animate-spin" />Loading schedules…</div>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-zinc-600 py-6 text-center">No report schedules yet — create your first above</p>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => {
                const isEditing = editingId === s.id
                const isExpanded = expanded === s.id
                const { label: typeLabel, icon: TypeIcon } = TYPE_META[s.report_type as ReportType] ?? TYPE_META.summary
                return (
                  <div key={s.id} className={`card overflow-hidden ${!s.enabled ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : s.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-1.5 rounded ${s.enabled ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}><CheckCircle2 size={14} /></div>
                        <div className="p-1.5 bg-zinc-800 rounded"><Calendar size={14} className="text-zinc-400" /></div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-200 text-sm">{s.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{FREQ_LABELS[s.frequency as ReportFrequency] ?? s.frequency}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 inline-flex items-center gap-1"><TypeIcon size={10} />{typeLabel}</span>
                            {!s.enabled && <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">PAUSED</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                            <Mail size={10} />{s.recipients.length} recipient{s.recipients.length !== 1 ? 's' : ''}
                            {s.last_sent && <><span>·</span><span>Last: {new Date(s.last_sent).toLocaleDateString()}</span></>}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown size={16} className="text-zinc-500 shrink-0" /> : <ChevronRight size={16} className="text-zinc-500 shrink-0" />}
                    </div>

                    {(isExpanded || isEditing) && (
                      <div className="border-t border-zinc-800 p-4">
                        {isEditing ? (
                          <>
                            <FormBody form={form} setForm={setForm} />
                            <div className="flex gap-2 mt-4">
                              <button onClick={() => handleSave(s.id)} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium disabled:opacity-50">
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
                              </button>
                              <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm">Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="mb-3">
                              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Included Metrics</p>
                              <div className="flex flex-wrap gap-1">
                                {(s.metrics as SensorType[]).map(m => { const Icon = SENSOR_ICONS[m]; return <span key={m} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400"><Icon size={10} />{SENSOR_LABELS[m]}</span> })}
                              </div>
                            </div>
                            <div className="mb-3">
                              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Recipients</p>
                              {s.recipients.map((e, i) => <div key={i} className="flex items-center gap-2 text-xs text-zinc-400"><Mail size={12} />{e}</div>)}
                            </div>
                            <div className="flex gap-2 pt-3 border-t border-zinc-800">
                              <button onClick={async () => { await withSaving(async () => { await reportApi.toggle(s.id); await load() }) }} disabled={saving}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors">
                                {s.enabled ? <><XCircle size={12} />Pause</> : <><CheckCircle2 size={12} />Enable</>}
                              </button>
                              <button onClick={() => { setForm(fromApi(s)); setEditingId(s.id); setExpanded(null) }}
                                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs"><Edit2 size={12} />Edit</button>
                              <button onClick={async () => { if (!confirm('Delete this schedule?')) return; await withSaving(async () => { await reportApi.delete(s.id); await load() }) }} disabled={saving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs"><Trash2 size={12} />Delete</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-8 text-center">
          <Clock size={32} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-400">Report delivery not yet configured</p>
          <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">
            Schedules are saved to the database. Email/webhook delivery will be added in a future phase.
          </p>
        </div>
      )}
    </div>
  )
}
