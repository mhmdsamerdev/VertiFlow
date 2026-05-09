import React, { useState } from 'react'
import {
  Bell, Mail, MessageSquare, Smartphone, Webhook, Plus, Trash2, Edit2,
  CheckCircle2, XCircle, AlertTriangle, Info, AlertOctagon,
  Thermometer, Droplets, Sun, Wind, Gauge, Activity, Beaker,
  ChevronDown, ChevronRight, Moon, Clock
} from 'lucide-react'
import { AlertConfig, NotificationSettings, AlertSeverity, NotificationChannel, SensorType, RuleOperator } from './types'

const SENSOR_ICONS: Record<SensorType, React.ElementType> = {
  ph: Beaker,
  ec: Gauge,
  air_temp: Thermometer,
  humidity: Droplets,
  soil_moisture: Activity,
  light_intensity: Sun,
  co2: Wind,
}

const SENSOR_LABELS: Record<SensorType, string> = {
  ph: 'pH',
  ec: 'EC',
  air_temp: 'Temperature',
  humidity: 'Humidity',
  soil_moisture: 'Soil Moisture',
  light_intensity: 'Light',
  co2: 'CO₂',
}

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: React.ElementType; label: string; color: string }> = {
  info: { icon: Info, label: 'Info', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  warning: { icon: AlertTriangle, label: 'Warning', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  critical: { icon: AlertOctagon, label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
}

const CHANNEL_ICONS: Record<NotificationChannel, React.ElementType> = {
  email: Mail,
  sms: Smartphone,
  push: Bell,
  webhook: Webhook,
}

// Mock data
const MOCK_ALERTS: AlertConfig[] = [
  {
    id: 'alert-001',
    name: 'Critical Temperature',
    severity: 'critical',
    enabled: true,
    conditions: [{ sensorType: 'air_temp', operator: '>', value: 35 }],
  },
  {
    id: 'alert-002',
    name: 'Low pH Warning',
    severity: 'warning',
    enabled: true,
    conditions: [{ sensorType: 'ph', operator: '<', value: 5.5 }],
  },
  {
    id: 'alert-003',
    name: 'High Humidity',
    severity: 'warning',
    enabled: true,
    conditions: [{ sensorType: 'humidity', operator: '>', value: 85 }],
  },
  {
    id: 'alert-004',
    name: 'Sensor Offline',
    severity: 'critical',
    enabled: true,
    conditions: [{ sensorType: 'co2', operator: '==', value: -1 }],
  },
  {
    id: 'alert-005',
    name: 'Daily Summary',
    severity: 'info',
    enabled: false,
    conditions: [{ sensorType: 'light_intensity', operator: '>', value: 0 }],
  },
]

const MOCK_NOTIFICATION_SETTINGS: NotificationSettings = {
  channels: ['email', 'push'],
  emailRecipients: ['admin@vertiflow.com', 'farm@vertiflow.com'],
  smsNumbers: ['+1234567890'],
  webhookUrl: 'https://hooks.example.com/vertiflow',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
  },
}

export function AlertsSection() {
  const [alerts, setAlerts] = useState<AlertConfig[]>(MOCK_ALERTS)
  const [settings, setSettings] = useState<NotificationSettings>(MOCK_NOTIFICATION_SETTINGS)
  const [activeTab, setActiveTab] = useState<'alerts' | 'channels'>('alerts')
  const [showAddAlert, setShowAddAlert] = useState(false)
  const [editingAlert, setEditingAlert] = useState<string | null>(null)
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null)

  // Form state
  const [alertForm, setAlertForm] = useState({
    name: '',
    severity: 'warning' as AlertSeverity,
    conditions: [{ sensorType: 'air_temp' as SensorType, operator: '>' as RuleOperator, value: 0 }],
  })

  const toggleAlert = (alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId ? { ...a, enabled: !a.enabled } : a
    ))
  }

  const toggleChannel = (channel: NotificationChannel) => {
    setSettings(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }))
  }

  const handleSaveAlert = () => {
    console.log('Save alert:', alertForm)
    setShowAddAlert(false)
    setEditingAlert(null)
    setAlertForm({
      name: '',
      severity: 'warning',
      conditions: [{ sensorType: 'air_temp', operator: '>', value: 0 }],
    })
  }

  const handleDeleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const addCondition = () => {
    setAlertForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, { sensorType: 'air_temp', operator: '>', value: 0 }]
    }))
  }

  const removeCondition = (index: number) => {
    setAlertForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Alerts</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Configure alert thresholds and notification channels.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {[
          { id: 'alerts', label: 'Alert Rules', count: alerts.length },
          { id: 'channels', label: 'Notification Channels' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
            {'count' in tab && (
              <span className="ml-1.5 text-[10px] text-zinc-600">({tab.count})</span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Add Alert Button */}
          <button
            onClick={() => setShowAddAlert(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Alert
          </button>

          {/* Add/Edit Alert Form */}
          {(showAddAlert || editingAlert) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">
                {editingAlert ? 'Edit Alert' : 'New Alert'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Alert Name</label>
                  <input
                    type="text"
                    value={alertForm.name}
                    onChange={e => setAlertForm({ ...alertForm, name: e.target.value })}
                    placeholder="e.g., High Temperature Warning"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Severity</label>
                  <select
                    value={alertForm.severity}
                    onChange={e => setAlertForm({ ...alertForm, severity: e.target.value as AlertSeverity })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Conditions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Conditions</label>
                  <button
                    onClick={addCondition}
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add Condition
                  </button>
                </div>
                <div className="space-y-2">
                  {alertForm.conditions.map((condition, index) => {
                    const Icon = SENSOR_ICONS[condition.sensorType]
                    return (
                      <div key={index} className="flex gap-2 items-center">
                        <div className="p-1.5 bg-zinc-800 rounded">
                          <Icon size={12} className="text-zinc-500" />
                        </div>
                        <select
                          value={condition.sensorType}
                          onChange={e => {
                            const newConditions = [...alertForm.conditions]
                            newConditions[index] = { ...condition, sensorType: e.target.value as SensorType }
                            setAlertForm({ ...alertForm, conditions: newConditions })
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        >
                          {Object.entries(SENSOR_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={e => {
                            const newConditions = [...alertForm.conditions]
                            newConditions[index] = { ...condition, operator: e.target.value as RuleOperator }
                            setAlertForm({ ...alertForm, conditions: newConditions })
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        >
                          <option value=">">&gt; greater than</option>
                          <option value="<">&lt; less than</option>
                          <option value=">=">&ge; greater or equal</option>
                          <option value="<=">&le; less or equal</option>
                          <option value="==">= equals</option>
                          <option value="!=">&ne; not equal</option>
                        </select>
                        <input
                          type="number"
                          value={condition.value}
                          onChange={e => {
                            const newConditions = [...alertForm.conditions]
                            newConditions[index] = { ...condition, value: parseFloat(e.target.value) || 0 }
                            setAlertForm({ ...alertForm, conditions: newConditions })
                          }}
                          className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                        {alertForm.conditions.length > 1 && (
                          <button
                            onClick={() => removeCondition(index)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveAlert}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Alert
                </button>
                <button
                  onClick={() => { setShowAddAlert(false); setEditingAlert(null) }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Alerts List */}
          <div className="space-y-3">
            {alerts.map(alert => {
              const isExpanded = expandedAlert === alert.id
              const severity = SEVERITY_CONFIG[alert.severity]
              const Icon = severity.icon

              return (
                <div key={alert.id} className={`card overflow-hidden ${!alert.enabled ? 'opacity-60' : ''}`}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleAlert(alert.id) }}
                        className={`p-1.5 rounded transition-colors ${
                          alert.enabled
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {alert.enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </button>

                      <div className={`p-1.5 rounded border ${severity.color}`}>
                        <Icon size={12} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200">{alert.name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severity.color}`}>
                            {severity.label}
                          </span>
                          {!alert.enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                              DISABLED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {alert.conditions.map((c, i) => {
                          const CIcon = SENSOR_ICONS[c.sensorType]
                          return (
                            <span key={i} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                              <CIcon size={10} />
                              {c.operator}{c.value}
                            </span>
                          )
                        })}
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-zinc-500" />
                      ) : (
                        <ChevronRight size={16} className="text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAlert(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs transition-colors"
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Channels Tab */}
      {activeTab === 'channels' && (
        <div className="space-y-6">
          {/* Channels */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">Notification Channels</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['email', 'sms', 'push', 'webhook'] as NotificationChannel[]).map(channel => {
                const Icon = CHANNEL_ICONS[channel]
                const isEnabled = settings.channels.includes(channel)
                return (
                  <button
                    key={channel}
                    onClick={() => toggleChannel(channel)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isEnabled
                        ? 'bg-green-500/10 border-green-500/30 text-zinc-200'
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Icon size={18} className={isEnabled ? 'text-green-400' : 'text-zinc-600'} />
                    <span className="text-sm font-medium capitalize">{channel}</span>
                    {isEnabled && <CheckCircle2 size={14} className="ml-auto text-green-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Email Recipients */}
          {settings.channels.includes('email') && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Mail size={16} />
                Email Recipients
              </h3>
              <div className="space-y-2">
                {settings.emailRecipients.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => {
                        const newRecipients = [...settings.emailRecipients]
                        newRecipients[index] = e.target.value
                        setSettings({ ...settings, emailRecipients: newRecipients })
                      }}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                    <button
                      onClick={() => {
                        const newRecipients = settings.emailRecipients.filter((_, i) => i !== index)
                        setSettings({ ...settings, emailRecipients: newRecipients })
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setSettings({ ...settings, emailRecipients: [...settings.emailRecipients, ''] })}
                  className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 mt-2"
                >
                  <Plus size={12} />
                  Add Email
                </button>
              </div>
            </div>
          )}

          {/* SMS Numbers */}
          {settings.channels.includes('sms') && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <MessageSquare size={16} />
                SMS Numbers
              </h3>
              <div className="space-y-2">
                {settings.smsNumbers.map((number, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="tel"
                      value={number}
                      onChange={e => {
                        const newNumbers = [...settings.smsNumbers]
                        newNumbers[index] = e.target.value
                        setSettings({ ...settings, smsNumbers: newNumbers })
                      }}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                    <button
                      onClick={() => {
                        const newNumbers = settings.smsNumbers.filter((_, i) => i !== index)
                        setSettings({ ...settings, smsNumbers: newNumbers })
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setSettings({ ...settings, smsNumbers: [...settings.smsNumbers, ''] })}
                  className="flex items-center gap-2 text-xs text-green-400 hover:text-green-300 mt-2"
                >
                  <Plus size={12} />
                  Add Number
                </button>
              </div>
            </div>
          )}

          {/* Webhook URL */}
          {settings.channels.includes('webhook') && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                <Webhook size={16} />
                Webhook URL
              </h3>
              <input
                type="url"
                value={settings.webhookUrl}
                onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://hooks.example.com/vertiflow"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
              />
            </div>
          )}

          {/* Quiet Hours */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 flex items-center gap-2">
              <Moon size={16} />
              Quiet Hours
            </h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.quietHours.enabled}
                  onChange={e => setSettings({
                    ...settings,
                    quietHours: { ...settings.quietHours, enabled: e.target.checked }
                  })}
                  className="rounded border-zinc-700 bg-zinc-800 text-green-500 focus:ring-green-500/20"
                />
                <span className="text-sm text-zinc-400">Enable quiet hours</span>
              </label>
            </div>
            {settings.quietHours.enabled && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">Start</label>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-500" />
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={e => setSettings({
                        ...settings,
                        quietHours: { ...settings.quietHours, start: e.target.value }
                      })}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                </div>
                <div className="text-zinc-600">→</div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">End</label>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-500" />
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={e => setSettings({
                        ...settings,
                        quietHours: { ...settings.quietHours, end: e.target.value }
                      })}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
