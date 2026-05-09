import React, { useState } from 'react'
import {
  FileText, Plus, Calendar, Mail, Clock, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Download, Trash2, Edit2, Eye,
  BarChart3, List, Settings, Thermometer, Droplets, Sun, Wind, Gauge, Activity, Beaker,
  AlertTriangle
} from 'lucide-react'
import { ReportSchedule, SentReport, ReportFrequency, ReportType, SensorType } from './types'

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

const FREQUENCY_LABELS: Record<ReportFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

const TYPE_LABELS: Record<ReportType, { label: string; icon: React.ElementType }> = {
  summary: { label: 'Summary', icon: BarChart3 },
  detailed: { label: 'Detailed', icon: List },
  custom: { label: 'Custom', icon: Settings },
}

// Mock data
const MOCK_SCHEDULES: ReportSchedule[] = [
  {
    id: 'rep-001',
    name: 'Weekly Farm Summary',
    enabled: true,
    frequency: 'weekly',
    reportType: 'summary',
    recipients: ['admin@vertiflow.com'],
    includeMetrics: ['ph', 'ec', 'air_temp', 'humidity'],
    lastSent: '2024-01-08T00:00:00Z',
    nextSend: '2024-01-15T00:00:00Z',
  },
  {
    id: 'rep-002',
    name: 'Daily Operations Report',
    enabled: true,
    frequency: 'daily',
    reportType: 'detailed',
    recipients: ['operations@vertiflow.com', 'manager@vertiflow.com'],
    includeMetrics: ['ph', 'ec', 'air_temp', 'humidity', 'light_intensity', 'co2'],
    lastSent: '2024-01-14T08:00:00Z',
    nextSend: '2024-01-15T08:00:00Z',
  },
  {
    id: 'rep-003',
    name: 'Monthly Compliance',
    enabled: false,
    frequency: 'monthly',
    reportType: 'detailed',
    recipients: ['compliance@vertiflow.com'],
    includeMetrics: ['ph', 'ec', 'air_temp', 'humidity', 'soil_moisture'],
    nextSend: '2024-02-01T00:00:00Z',
  },
]

const MOCK_HISTORY: SentReport[] = [
  { id: 'hist-001', scheduleId: 'rep-001', sentAt: '2024-01-08T00:00:00Z', recipients: ['admin@vertiflow.com'], type: 'summary', status: 'sent' },
  { id: 'hist-002', scheduleId: 'rep-002', sentAt: '2024-01-14T08:00:00Z', recipients: ['operations@vertiflow.com', 'manager@vertiflow.com'], type: 'detailed', status: 'sent' },
  { id: 'hist-003', scheduleId: 'rep-001', sentAt: '2024-01-01T00:00:00Z', recipients: ['admin@vertiflow.com'], type: 'summary', status: 'sent' },
  { id: 'hist-004', scheduleId: 'rep-003', sentAt: '2023-12-01T00:00:00Z', recipients: ['compliance@vertiflow.com'], type: 'detailed', status: 'failed' },
]

export function ReportsSection() {
  const [schedules, setSchedules] = useState<ReportSchedule[]>(MOCK_SCHEDULES)
  const [history] = useState<SentReport[]>(MOCK_HISTORY)
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules')
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)

  // Form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    frequency: 'weekly' as ReportFrequency,
    reportType: 'summary' as ReportType,
    recipients: [''],
    includeMetrics: ['ph', 'ec', 'air_temp', 'humidity'] as SensorType[],
  })

  const toggleSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.map(s =>
      s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
    ))
  }

  const toggleMetric = (metric: SensorType) => {
    setScheduleForm(prev => ({
      ...prev,
      includeMetrics: prev.includeMetrics.includes(metric)
        ? prev.includeMetrics.filter(m => m !== metric)
        : [...prev.includeMetrics, metric]
    }))
  }

  const handleSaveSchedule = () => {
    console.log('Save schedule:', scheduleForm)
    setShowAddSchedule(false)
    setEditingSchedule(null)
    setScheduleForm({
      name: '',
      frequency: 'weekly',
      reportType: 'summary',
      recipients: [''],
      includeMetrics: ['ph', 'ec', 'air_temp', 'humidity'],
    })
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(prev => prev.filter(s => s.id !== scheduleId))
  }

  const addRecipient = () => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }))
  }

  const removeRecipient = (index: number) => {
    setScheduleForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Automated Reports</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Schedule and configure automated reports. View sent report history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {[
          { id: 'schedules', label: 'Schedules', count: schedules.length },
          { id: 'history', label: 'History', count: history.length },
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
            <span className="ml-1.5 text-[10px] text-zinc-600">({tab.count})</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Schedules Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          {/* Add Schedule Button */}
          <button
            onClick={() => setShowAddSchedule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            New Schedule
          </button>

          {/* Add/Edit Schedule Form */}
          {(showAddSchedule || editingSchedule) && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">
                {editingSchedule ? 'Edit Schedule' : 'New Report Schedule'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Schedule Name</label>
                  <input
                    type="text"
                    value={scheduleForm.name}
                    onChange={e => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                    placeholder="e.g., Weekly Summary"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Frequency</label>
                  <select
                    value={scheduleForm.frequency}
                    onChange={e => setScheduleForm({ ...scheduleForm, frequency: e.target.value as ReportFrequency })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5">Report Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['summary', 'detailed', 'custom'] as ReportType[]).map(type => {
                    const { label, icon: Icon } = TYPE_LABELS[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setScheduleForm({ ...scheduleForm, reportType: type })}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          scheduleForm.reportType === type
                            ? 'bg-green-500/10 border-green-500/30 text-zinc-200'
                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Metrics */}
              <div className="mb-4">
                <label className="block text-xs text-zinc-500 mb-1.5">Include Metrics</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SENSOR_LABELS) as SensorType[]).map(metric => {
                    const Icon = SENSOR_ICONS[metric]
                    const isSelected = scheduleForm.includeMetrics.includes(metric)
                    return (
                      <button
                        key={metric}
                        onClick={() => toggleMetric(metric)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                          isSelected
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                        }`}
                      >
                        <Icon size={12} />
                        {SENSOR_LABELS[metric]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Recipients */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Email Recipients</label>
                  <button
                    onClick={addRecipient}
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Add Recipient
                  </button>
                </div>
                <div className="space-y-2">
                  {scheduleForm.recipients.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={e => {
                          const newRecipients = [...scheduleForm.recipients]
                          newRecipients[index] = e.target.value
                          setScheduleForm({ ...scheduleForm, recipients: newRecipients })
                        }}
                        placeholder="email@example.com"
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                      />
                      {scheduleForm.recipients.length > 1 && (
                        <button
                          onClick={() => removeRecipient(index)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveSchedule}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Save Schedule
                </button>
                <button
                  onClick={() => { setShowAddSchedule(false); setEditingSchedule(null) }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Schedules List */}
          <div className="space-y-3">
            {schedules.map(schedule => {
              const isExpanded = expandedSchedule === schedule.id
              const typeInfo = TYPE_LABELS[schedule.reportType]
              const TypeIcon = typeInfo.icon

              return (
                <div key={schedule.id} className={`card overflow-hidden ${!schedule.enabled ? 'opacity-60' : ''}`}>
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer"
                    onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleSchedule(schedule.id) }}
                        className={`p-1.5 rounded transition-colors ${
                          schedule.enabled
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {schedule.enabled ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      </button>

                      <div className="p-1.5 bg-zinc-800 rounded">
                        <Calendar size={14} className="text-zinc-400" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-200">{schedule.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            {FREQUENCY_LABELS[schedule.frequency]}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 flex items-center gap-1">
                            <TypeIcon size={10} />
                            {typeInfo.label}
                          </span>
                          {!schedule.enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                              PAUSED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <Mail size={10} />
                          {schedule.recipients.length} recipient{schedule.recipients.length > 1 ? 's' : ''}
                          {schedule.lastSent && (
                            <>
                              <span>·</span>
                              <span>Last sent: {new Date(schedule.lastSent).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {schedule.nextSend && (
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Clock size={12} />
                          Next: {new Date(schedule.nextSend).toLocaleDateString()}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-zinc-500" />
                      ) : (
                        <ChevronRight size={16} className="text-zinc-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 px-4 py-3">
                      {/* Metrics */}
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Included Metrics</p>
                        <div className="flex flex-wrap gap-1">
                          {schedule.includeMetrics.map(metric => {
                            const Icon = SENSOR_ICONS[metric]
                            return (
                              <span key={metric} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                                <Icon size={10} />
                                {SENSOR_LABELS[metric]}
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {/* Recipients */}
                      <div className="mb-3">
                        <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Recipients</p>
                        <div className="space-y-1">
                          {schedule.recipients.map((email, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                              <Mail size={12} />
                              {email}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-zinc-800">
                        <button
                          onClick={() => setEditingSchedule(schedule.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
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

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Report</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Sent At</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Recipients</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Type</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map(report => {
                const schedule = schedules.find(s => s.id === report.scheduleId)
                const typeInfo = TYPE_LABELS[report.type]

                return (
                  <tr key={report.id} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-300">{schedule?.name || 'Unknown'}</p>
                      <p className="text-xs text-zinc-500">{report.id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {new Date(report.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {report.recipients.length} recipient{report.recipients.length > 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                        <typeInfo.icon size={10} />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {report.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400">
                          <CheckCircle2 size={10} />
                          Sent
                        </span>
                      )}
                      {report.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400">
                          <XCircle size={10} />
                          Failed
                        </span>
                      )}
                      {report.status === 'partial' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-amber-400/10 text-amber-400">
                          <AlertTriangle size={10} />
                          Partial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors">
                        <Eye size={14} />
                      </button>
                      <button className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors ml-1">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
