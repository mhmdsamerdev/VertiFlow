import React, { useEffect, useState } from 'react'
import {
  Cpu, Plus, Edit2, Trash2, Loader2, Save, X,
  Thermometer, Droplets, Sun, Wind, Activity, Zap, FlaskConical,
  SlidersHorizontal, KeyRound, RotateCcw, Wifi, Clock3, ShieldCheck,
} from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { useSettingsContext } from '../../context/SettingsContext'
import { thresholdApi, ApiThreshold } from '../../api/config'

const SENSOR_KEYS = ['ph', 'ec', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity', 'co2'] as const
type SensorKey = typeof SENSOR_KEYS[number]

const SENSOR_META: Record<SensorKey, { label: string; unit: string; icon: React.ReactNode; min: number; max: number; step: number }> = {
  ph:              { label: 'pH Level',       unit: '',          icon: <FlaskConical  size={14}/>, min: 0,    max: 14,   step: 0.1  },
  ec:              { label: 'EC / Nutrient',  unit: 'mS/cm',     icon: <Zap           size={14}/>, min: 0,    max: 5,    step: 0.1  },
  air_temp:        { label: 'Air Temp',       unit: '°C',        icon: <Thermometer   size={14}/>, min: 0,    max: 50,   step: 0.5  },
  humidity:        { label: 'Humidity',       unit: '%',         icon: <Droplets      size={14}/>, min: 0,    max: 100,  step: 1    },
  soil_moisture:   { label: 'Soil Moisture',  unit: '%',         icon: <Droplets      size={14}/>, min: 0,    max: 100,  step: 1    },
  light_intensity: { label: 'Light',          unit: 'µmol/m²/s', icon: <Sun           size={14}/>, min: 0,    max: 2000, step: 10   },
  co2:             { label: 'CO₂',            unit: 'ppm',       icon: <Wind          size={14}/>, min: 0,    max: 5000, step: 10   },
}

const ACTUATOR_KEYS = ['cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster'] as const
type ActuatorKey = typeof ACTUATOR_KEYS[number]

const ACTUATOR_META: Record<ActuatorKey, { label: string; icon: React.ReactNode }> = {
  cooling_fan:  { label: 'Fan / Ventilation', icon: <Wind size={14}/> },
  water_pump:   { label: 'Water Pump',       icon: <Droplets size={14}/> },
  heater:       { label: 'Heater',           icon: <Thermometer size={14}/> },
  dehumidifier: { label: 'Dehumidifier',     icon: <Activity size={14}/> },
  led_lights:   { label: 'Grow Lights',      icon: <Sun size={14}/> },
  ph_adjuster:  { label: 'pH Adjuster',      icon: <FlaskConical size={14}/> },
}
const THRESHOLD_FIELDS = ['crit_min', 'warn_min', 'target', 'warn_max', 'crit_max'] as const
const DEFAULT_THRESHOLDS: Record<SensorKey, Pick<ApiThreshold, 'target' | 'warn_min' | 'warn_max' | 'crit_min' | 'crit_max'>> = {
  ph:              { target: 6.2,  warn_min: 5.8,  warn_max: 6.8,  crit_min: 5.0,  crit_max: 7.5  },
  ec:              { target: 1.8,  warn_min: 1.4,  warn_max: 2.2,  crit_min: 0.8,  crit_max: 3.0  },
  air_temp:        { target: 24.0, warn_min: 20.0, warn_max: 28.0, crit_min: 15.0, crit_max: 33.0 },
  humidity:        { target: 65.0, warn_min: 55.0, warn_max: 75.0, crit_min: 40.0, crit_max: 90.0 },
  soil_moisture:   { target: 70.0, warn_min: 50.0, warn_max: 85.0, crit_min: 30.0, crit_max: 95.0 },
  light_intensity: { target: 500,  warn_min: 350,  warn_max: 650,  crit_min: 200,  crit_max: 900  },
  co2:             { target: 900,  warn_min: 600,  warn_max: 1200, crit_min: 400,  crit_max: 1500 },
}

const DEVICE_CATEGORIES = ['sensor', 'actuator', 'gateway', 'camera', 'controller', 'other'] as const
const STATUS_COLORS: Record<string, string> = {
  active:      'text-green-400 bg-green-500/10',
  pending:     'text-amber-300 bg-amber-500/10',
  inactive:    'text-amber-300 bg-amber-500/10',
  online:      'text-green-400 bg-green-500/10',
  offline:     'text-zinc-500 bg-zinc-800',
  maintenance: 'text-amber-400 bg-amber-500/10',
  error:       'text-red-400   bg-red-500/10',
}

interface DeviceForm {
  zone_id: string
  name: string
  type: string
  hardware_type: string
  sensor_type: string
  actuator_type: string
}
const emptyDevice = (zoneId = ''): DeviceForm => ({
  zone_id: zoneId,
  name: '', type: 'sensor', hardware_type: '', sensor_type: '', actuator_type: '',
})

// ── Threshold editor sub-component ───────────────────────────────────────────
function ThresholdEditor({ zoneId }: { zoneId: string }) {
  const [thresholds, setThresholds] = useState<Record<SensorKey, ApiThreshold | null>>(
    Object.fromEntries(SENSOR_KEYS.map(k => [k, null])) as Record<SensorKey, ApiThreshold | null>
  )
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    thresholdApi.get(zoneId).then(rows => {
      const map: Record<SensorKey, ApiThreshold | null> = Object.fromEntries(
        SENSOR_KEYS.map(k => [k, null])
      ) as Record<SensorKey, ApiThreshold | null>
      for (const r of rows) map[r.sensor_type as SensorKey] = r
      setThresholds(map)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [zoneId])

  function update(key: SensorKey, field: keyof ApiThreshold, val: number) {
    setThresholds(prev => ({
      ...prev,
      [key]: {
        zone_id: zoneId, sensor_type: key, updated_at: '',
        target: 0, warn_min: 0, warn_max: 0, crit_min: 0, crit_max: 0,
        ...prev[key],
        [field]: val,
      },
    }))
  }

  async function saveAll() {
    setSaving(true)
    try {
      const payload = SENSOR_KEYS
        .map(k => thresholds[k])
        .filter(Boolean)
        .map(t => ({
          sensor_type: t!.sensor_type,
          target:   t!.target,
          warn_min: t!.warn_min,
          warn_max: t!.warn_max,
          crit_min: t!.crit_min,
          crit_max: t!.crit_max,
        }))
      await thresholdApi.upsert(zoneId, payload)
    } finally { setSaving(false) }
  }

  if (!loaded) return <div className="flex items-center gap-2 py-4 text-zinc-600 text-sm"><Loader2 size={14} className="animate-spin" />Loading thresholds…</div>

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-zinc-500">Set thresholds manually or start from recommended defaults.</p>
        <button
          onClick={() => {
            setThresholds(prev => {
              const next = { ...prev }
              for (const key of SENSOR_KEYS) {
                next[key] = {
                  zone_id: zoneId,
                  sensor_type: key,
                  updated_at: '',
                  ...DEFAULT_THRESHOLDS[key],
                }
              }
              return next
            })
          }}
          className="px-3 py-1.5 text-xs rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
        >
          Apply Recommended Defaults
        </button>
      </div>
      <div className="space-y-4 mb-4">
        {SENSOR_KEYS.map(key => {
          const m = SENSOR_META[key]
          const t = thresholds[key]
          return (
            <div key={key} className="card p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-zinc-400">{m.icon}</span>
                <span className="text-sm font-semibold text-zinc-200">{m.label}</span>
                {m.unit && <span className="text-xs text-zinc-600">{m.unit}</span>}
              </div>
              <div className="grid grid-cols-5 gap-2">
                {THRESHOLD_FIELDS.map(field => (
                  <div key={field}>
                    <label className="block text-[9px] text-zinc-600 mb-1 uppercase tracking-wider">
                      {field === 'crit_min' ? 'Crit Min' : field === 'warn_min' ? 'Warn Min' :
                       field === 'target'   ? 'Target'   : field === 'warn_max' ? 'Warn Max' : 'Crit Max'}
                    </label>
                    <input
                      type="number"
                      min={m.min} max={m.max} step={m.step}
                      value={t?.[field] ?? ''}
                      onChange={e => update(key, field, parseFloat(e.target.value))}
                      placeholder="—"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={saveAll} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Thresholds
      </button>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export function DevicesSensorsSection() {
  const { farms, activeZone } = useZoneContext()
  const {
    devices, devicesLoading, fetchDevices, createDevice, updateDevice, deleteDevice,
    getDeviceCredentials, resetDeviceApiKey,
  } = useSettingsContext()

  const [activeTab,   setActiveTab]   = useState<'devices' | 'thresholds'>('devices')
  const [selectedZoneId, setSelectedZoneId] = useState(activeZone?.id ?? '')
  const [showAdd,     setShowAdd]     = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [form,        setForm]        = useState<DeviceForm>(emptyDevice(activeZone?.id ?? ''))
  const [saving,      setSaving]      = useState(false)
  const [latestCredentials, setLatestCredentials] = useState<{ deviceId: string; apiKey: string } | null>(null)

  const allZones = farms.flatMap(f => f.zones)

  useEffect(() => {
    if (selectedZoneId) fetchDevices(selectedZoneId)
  }, [selectedZoneId, fetchDevices])

  useEffect(() => {
    setForm(prev => ({ ...prev, zone_id: selectedZoneId }))
  }, [selectedZoneId])

  async function withSaving(fn: () => Promise<unknown>) {
    setSaving(true)
    try { await fn() } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  function startEdit(id: string) {
    const d = devices.find(x => x.id === id)
    if (!d) return
    setForm({
      zone_id: d.zone_id,
      name: d.name,
      type: d.type,
      hardware_type: d.hardware_type ?? '',
      sensor_type: d.sensor_type ?? '',
      actuator_type: d.actuator_type ?? '',
    })
    setEditingId(id)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.zone_id) return
    setSaving(true)
    try {
      const created = await createDevice({
        zone_id: form.zone_id,
        name: form.name,
        type: form.type,
        hardware_type: form.hardware_type || undefined,
        sensor_type: form.sensor_type || undefined,
        actuator_type: form.actuator_type || undefined,
      })
      if (created.api_key) setLatestCredentials({ deviceId: created.id, apiKey: created.api_key })
      setShowAdd(false)
      setForm(emptyDevice(selectedZoneId))
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleSave(id: string) {
    await withSaving(() => updateDevice(id, {
      zone_id: form.zone_id,
      name: form.name,
      type: form.type,
      hardware_type: form.hardware_type || undefined,
      sensor_type: form.sensor_type || undefined,
      actuator_type: form.actuator_type || undefined,
    }))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this device?')) return
    await withSaving(() => deleteDevice(id))
  }

  async function handleViewKey(id: string) {
    try {
      const res = await getDeviceCredentials(id)
      setLatestCredentials({ deviceId: res.device_id, apiKey: res.api_key })
    } catch (e) {
      console.error(e)
    }
  }

  async function handleResetKey(id: string) {
    if (!confirm('Reset API key for this device? Hardware must be reconfigured.')) return
    try {
      const res = await resetDeviceApiKey(id)
      setLatestCredentials({ deviceId: res.device_id, apiKey: res.api_key })
    } catch (e) {
      console.error(e)
    }
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Devices &amp; Sensors</h2>
        </div>
        <p className="text-sm text-zinc-500">Register IoT devices and configure sensor thresholds per zone.</p>
      </div>

      <div className="card p-4 mb-5 border border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="text-blue-400 mt-0.5" />
          <div className="text-xs text-zinc-300 space-y-1">
            <p className="font-semibold text-sm text-zinc-100">Hardware setup after registration</p>
            <p>Use the generated <span className="font-mono text-zinc-100">Device ID</span> and <span className="font-mono text-zinc-100">API Key</span> in your hardware firmware.</p>
            <p>Send HTTPS `POST` to <span className="font-mono text-zinc-100">/ingest/telemetry</span> with `device_id`, `api_key`, `zone_id`, and sensor readings every few seconds.</p>
          </div>
        </div>
      </div>

      {latestCredentials && (
        <div className="card p-4 mb-5 border border-green-500/20 bg-green-500/5">
          <p className="text-xs uppercase tracking-wide text-green-400 mb-2">Device credentials</p>
          <p className="text-sm text-zinc-200 mb-1">Device ID: <span className="font-mono">{latestCredentials.deviceId}</span></p>
          <p className="text-sm text-zinc-200">API Key: <span className="font-mono break-all">{latestCredentials.apiKey}</span></p>
        </div>
      )}

      {/* Zone selector */}
      <div className="mb-4">
        <label className="block text-xs text-zinc-500 mb-1.5">Zone</label>
        <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
          <option value="">— Select a zone —</option>
          {allZones.map(z => <option key={z.id} value={z.id}>{z.name} · {z.cropName}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-zinc-900 rounded-lg w-fit">
        {([['devices', 'Devices', <Cpu size={13}/>], ['thresholds', 'Thresholds', <SlidersHorizontal size={13}/>]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'
            }`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Devices tab ── */}
      {activeTab === 'devices' && (
        <div>
          {selectedZoneId && (
            <button onClick={() => setShowAdd(true)}
              className="mb-4 flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Register Device
            </button>
          )}

          {/* Add form */}
          {showAdd && (
            <div className="card p-4 mb-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">New Device</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="block text-xs text-zinc-500 mb-1">Zone *</label>
                  <select value={form.zone_id} onChange={e => setForm({...form, zone_id: e.target.value})} className={inputCls}>
                    <option value="">— Select zone —</option>
                    {allZones.map(z => <option key={z.id} value={z.id}>{z.name} · {z.cropName}</option>)}
                  </select></div>
                <div><label className="block text-xs text-zinc-500 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., Layer 1 Temperature Sensor" className={inputCls} /></div>
                <div><label className="block text-xs text-zinc-500 mb-1">Device Category</label>
                  <select 
                    value={form.type} 
                    onChange={e => setForm({
                      ...form, 
                      type: e.target.value, 
                      sensor_type: e.target.value === 'sensor' ? form.sensor_type : '',
                      actuator_type: e.target.value === 'actuator' ? form.actuator_type : ''
                    })} 
                    className={inputCls}
                  >
                    {DEVICE_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="block text-xs text-zinc-500 mb-1">Hardware Type</label>
                  <input type="text" value={form.hardware_type} onChange={e => setForm({...form, hardware_type: e.target.value})} placeholder="e.g., DHT22, ESP32, Sonoff 4CH" className={inputCls} /></div>
                {form.type === 'sensor' && (
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Sensor Type</label>
                    <select value={form.sensor_type} onChange={e => setForm({...form, sensor_type: e.target.value})} className={inputCls}>
                      <option value="">— None —</option>
                      {SENSOR_KEYS.map(k => <option key={k} value={k}>{SENSOR_META[k].label}</option>)}
                    </select>
                  </div>
                )}
                {form.type === 'actuator' && (
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">Actuator Type</label>
                    <select value={form.actuator_type} onChange={e => setForm({...form, actuator_type: e.target.value})} className={inputCls}>
                      <option value="">— None —</option>
                      {ACTUATOR_KEYS.map(k => <option key={k} value={k}>{ACTUATOR_META[k].label}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.zone_id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Register
                </button>
                <button onClick={() => { setShowAdd(false); setForm(emptyDevice(selectedZoneId)) }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Device list */}
          {devicesLoading ? (
            <div className="flex items-center gap-2 py-6 text-zinc-600 text-sm"><Loader2 size={14} className="animate-spin" />Loading devices…</div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-zinc-600 py-6 text-center">
              {selectedZoneId ? 'No devices registered for this zone yet' : 'Select a zone to manage devices'}
            </p>
          ) : (
            <div className="space-y-2">
              {devices.map(d => {
                const isEditing = editingId === d.id
                return (
                  <div key={d.id} className="card p-3">
                    {isEditing ? (
                      <div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <select value={form.zone_id} onChange={e => setForm({...form, zone_id: e.target.value})}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
                            {allZones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50" />
                          <select 
                            value={form.type} 
                            onChange={e => setForm({
                              ...form, 
                              type: e.target.value, 
                              sensor_type: e.target.value === 'sensor' ? form.sensor_type : '',
                              actuator_type: e.target.value === 'actuator' ? form.actuator_type : ''
                            })}
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                          >
                            {DEVICE_CATEGORIES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input type="text" value={form.hardware_type} onChange={e => setForm({...form, hardware_type: e.target.value})}
                            placeholder="Hardware type"
                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50" />
                          {form.type === 'sensor' && (
                            <select value={form.sensor_type} onChange={e => setForm({...form, sensor_type: e.target.value})}
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
                              <option value="">— None —</option>
                              {SENSOR_KEYS.map(k => <option key={k} value={k}>{SENSOR_META[k].label}</option>)}
                            </select>
                          )}
                          {form.type === 'actuator' && (
                            <select value={form.actuator_type} onChange={e => setForm({...form, actuator_type: e.target.value})}
                              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
                              <option value="">— None —</option>
                              {ACTUATOR_KEYS.map(k => <option key={k} value={k}>{ACTUATOR_META[k].label}</option>)}
                            </select>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(d.id)} disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Activity size={16} className="text-zinc-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{d.name}</p>
                            <p className="text-xs text-zinc-600">
                              {d.type}
                              {d.hardware_type ? ` · ${d.hardware_type}` : ''}
                              {d.sensor_type ? ` · ${SENSOR_META[d.sensor_type as SensorKey]?.label ?? d.sensor_type}` : ''}
                              {d.actuator_type ? ` · ${ACTUATOR_META[d.actuator_type as ActuatorKey]?.label ?? d.actuator_type}` : ''}
                            </p>
                            <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-3">
                              <span className="inline-flex items-center gap-1"><Clock3 size={11} />{d.last_seen ? new Date(d.last_seen).toLocaleString() : 'No data yet'}</span>
                              <span className="inline-flex items-center gap-1"><Wifi size={11} />{d.signal_strength ?? 0}%</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[d.status] ?? STATUS_COLORS.offline}`}>
                            {d.status}
                          </span>
                          <button onClick={() => handleViewKey(d.id)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded" title="View API key"><KeyRound size={12} /></button>
                          <button onClick={() => handleResetKey(d.id)} className="p-1.5 text-zinc-500 hover:text-amber-300 hover:bg-zinc-800 rounded" title="Reset API key"><RotateCcw size={12} /></button>
                          <button onClick={() => startEdit(d.id)} className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded"><Edit2 size={12} /></button>
                          <button onClick={() => handleDelete(d.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Thresholds tab ── */}
      {activeTab === 'thresholds' && (
        selectedZoneId
          ? <ThresholdEditor zoneId={selectedZoneId} />
          : <p className="text-sm text-zinc-600 py-6 text-center">Select a zone to configure thresholds</p>
      )}
    </div>
  )
}
