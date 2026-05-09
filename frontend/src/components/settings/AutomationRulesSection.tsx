import React, { useState } from 'react'
import {
  Workflow, Plus, Play, Pause, Trash2, Edit2, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, TestTube, AlertTriangle, Clock,
  Thermometer, Droplets, Sun, Wind, Gauge, Activity, Beaker,
  Power, Fan, Droplet, Flame, Lightbulb
} from 'lucide-react'
import { AutomationRule, RuleCondition, RuleAction, SensorType, RuleOperator } from './types'

// Mock data
const MOCK_RULES: AutomationRule[] = [
  {
    id: 'rule-001',
    name: 'High Temp Cooling',
    description: 'Turn on cooling fan when temperature exceeds threshold',
    enabled: true,
    conditions: [{ sensorType: 'air_temp', operator: '>', value: 26 }],
    actions: [{ type: 'turn_on', deviceId: 'act-001', params: { speed: 80 } }],
    createdAt: '2024-01-01T00:00:00Z',
    lastTriggered: '2024-01-15T14:30:00Z',
    triggerCount: 42,
  },
  {
    id: 'rule-002',
    name: 'Low Humidity Alert',
    description: 'Send alert when humidity drops below safe levels',
    enabled: true,
    conditions: [{ sensorType: 'humidity', operator: '<', value: 50 }],
    actions: [{ type: 'send_alert', deviceId: 'system', params: { severity: 'warning' } }],
    createdAt: '2024-01-02T00:00:00Z',
    lastTriggered: '2024-01-14T08:15:00Z',
    triggerCount: 7,
  },
  {
    id: 'rule-003',
    name: 'Night Light Schedule',
    description: 'Turn off grow lights during night hours',
    enabled: false,
    conditions: [{ sensorType: 'light_intensity', operator: '>', value: 0 }],
    actions: [{ type: 'turn_off', deviceId: 'act-002' }],
    createdAt: '2024-01-05T00:00:00Z',
    triggerCount: 0,
  },
  {
    id: 'rule-004',
    name: 'pH Auto-Correction',
    description: 'Dose pH adjuster when pH drifts out of range',
    enabled: true,
    conditions: [
      { sensorType: 'ph', operator: '<', value: 6.0 },
    ],
    actions: [{ type: 'turn_on', deviceId: 'act-ph', params: { dose_amount: 0.5 } }],
    createdAt: '2024-01-08T00:00:00Z',
    lastTriggered: '2024-01-10T11:20:00Z',
    triggerCount: 3,
  },
  {
    id: 'rule-005',
    name: 'Emergency Heater',
    description: 'Activate heater when temperature drops critically low',
    enabled: true,
    conditions: [{ sensorType: 'air_temp', operator: '<', value: 15 }],
    actions: [{ type: 'turn_on', deviceId: 'act-heater' }],
    createdAt: '2024-01-10T00:00:00Z',
    triggerCount: 0,
  },
]

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

const OPERATOR_LABELS: Record<RuleOperator, string> = {
  '>': '> greater than',
  '<': '< less than',
  '>=': '≥ greater or equal',
  '<=': '≤ less or equal',
  '==': '= equals',
  '!=': '≠ not equal',
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  turn_on: Power,
  turn_off: Power,
  set_value: Gauge,
  send_alert: AlertTriangle,
}

function ConditionBadge({ condition }: { condition: RuleCondition }) {
  const Icon = SENSOR_ICONS[condition.sensorType]
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-300">
      <Icon size={10} />
      {SENSOR_LABELS[condition.sensorType]} {condition.operator} {condition.value}
    </span>
  )
}

function ActionBadge({ action }: { action: RuleAction }) {
  const Icon = ACTION_ICONS[action.type] || Power
  const label = action.type === 'turn_on' ? 'ON' :
    action.type === 'turn_off' ? 'OFF' :
    action.type === 'set_value' ? 'SET' : 'ALERT'

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded ${
      action.type === 'turn_on' ? 'bg-green-500/10 text-green-400' :
      action.type === 'turn_off' ? 'bg-zinc-800 text-zinc-400' :
      action.type === 'send_alert' ? 'bg-amber-400/10 text-amber-400' :
      'bg-blue-500/10 text-blue-400'
    }`}>
      <Icon size={10} />
      {label} {action.deviceId !== 'system' && `· ${action.deviceId}`}
    </span>
  )
}

export function AutomationRulesSection() {
  const [rules, setRules] = useState<AutomationRule[]>(MOCK_RULES)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [showAddRule, setShowAddRule] = useState(false)
  const [testingRule, setTestingRule] = useState<string | null>(null)
  const [editingRule, setEditingRule] = useState<string | null>(null)

  // Form state
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    conditions: [{ sensorType: 'air_temp' as SensorType, operator: '>' as RuleOperator, value: 0 }],
    actions: [{ type: 'turn_on' as RuleAction['type'], deviceId: '', params: {} }],
  })

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const testRule = (ruleId: string) => {
    setTestingRule(ruleId)
    // Simulate test
    setTimeout(() => setTestingRule(null), 2000)
  }

  const handleAddCondition = () => {
    setRuleForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, { sensorType: 'air_temp', operator: '>', value: 0 }]
    }))
  }

  const handleRemoveCondition = (index: number) => {
    setRuleForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const handleAddAction = () => {
    setRuleForm(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'turn_on', deviceId: '', params: {} }]
    }))
  }

  const handleSaveRule = () => {
    // Backend integration placeholder
    console.log('Save rule:', ruleForm)
    setShowAddRule(false)
    setEditingRule(null)
    setRuleForm({
      name: '',
      description: '',
      conditions: [{ sensorType: 'air_temp', operator: '>', value: 0 }],
      actions: [{ type: 'turn_on', deviceId: '', params: {} }],
    })
  }

  const handleDeleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId))
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Workflow size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Automation Rules</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Create IF-THEN rules to automate your farm operations. Rules are evaluated every minute.
        </p>
      </div>

      {/* Add Rule Button */}
      <button
        onClick={() => setShowAddRule(true)}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Create Rule
      </button>

      {/* Add/Edit Rule Form */}
      {(showAddRule || editingRule) && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">
            {editingRule ? 'Edit Rule' : 'New Automation Rule'}
          </h3>

          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Rule Name</label>
              <input
                type="text"
                value={ruleForm.name}
                onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g., High Temperature Cooling"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
              <input
                type="text"
                value={ruleForm.description}
                onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Brief description of what this rule does"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
              />
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">IF Conditions (all must match)</label>
              <button
                onClick={handleAddCondition}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <Plus size={12} />
                Add Condition
              </button>
            </div>
            <div className="space-y-2">
              {ruleForm.conditions.map((condition, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={condition.sensorType}
                    onChange={e => {
                      const newConditions = [...ruleForm.conditions]
                      newConditions[index] = { ...condition, sensorType: e.target.value as SensorType }
                      setRuleForm({ ...ruleForm, conditions: newConditions })
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
                      const newConditions = [...ruleForm.conditions]
                      newConditions[index] = { ...condition, operator: e.target.value as RuleOperator }
                      setRuleForm({ ...ruleForm, conditions: newConditions })
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                  >
                    {Object.entries(OPERATOR_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={condition.value}
                    onChange={e => {
                      const newConditions = [...ruleForm.conditions]
                      newConditions[index] = { ...condition, value: parseFloat(e.target.value) || 0 }
                      setRuleForm({ ...ruleForm, conditions: newConditions })
                    }}
                    className="w-24 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                  />
                  {ruleForm.conditions.length > 1 && (
                    <button
                      onClick={() => handleRemoveCondition(index)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase">THEN Actions</label>
              <button
                onClick={handleAddAction}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
              >
                <Plus size={12} />
                Add Action
              </button>
            </div>
            <div className="space-y-2">
              {ruleForm.actions.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <select
                    value={action.type}
                    onChange={e => {
                      const newActions = [...ruleForm.actions]
                      newActions[index] = { ...action, type: e.target.value as RuleAction['type'] }
                      setRuleForm({ ...ruleForm, actions: newActions })
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                  >
                    <option value="turn_on">Turn ON</option>
                    <option value="turn_off">Turn OFF</option>
                    <option value="set_value">Set Value</option>
                    <option value="send_alert">Send Alert</option>
                  </select>
                  <input
                    type="text"
                    value={action.deviceId}
                    onChange={e => {
                      const newActions = [...ruleForm.actions]
                      newActions[index] = { ...action, deviceId: e.target.value }
                      setRuleForm({ ...ruleForm, actions: newActions })
                    }}
                    placeholder="Device ID"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                  />
                  {ruleForm.actions.length > 1 && (
                    <button
                      onClick={() => {
                        const newActions = ruleForm.actions.filter((_, i) => i !== index)
                        setRuleForm({ ...ruleForm, actions: newActions })
                      }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
              onClick={handleSaveRule}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
            >
              Save Rule
            </button>
            <button
              onClick={() => { setShowAddRule(false); setEditingRule(null) }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map(rule => {
          const isExpanded = expandedRule === rule.id
          const isTesting = testingRule === rule.id

          return (
            <div key={rule.id} className={`card overflow-hidden ${!rule.enabled ? 'opacity-60' : ''}`}>
              {/* Rule Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={e => { e.stopPropagation(); toggleRule(rule.id) }}
                    className={`p-1.5 rounded transition-colors ${
                      rule.enabled
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? <Play size={14} /> : <Pause size={14} />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{rule.name}</span>
                      {!rule.enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                          DISABLED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">{rule.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Quick Preview */}
                  <div className="hidden sm:flex items-center gap-1">
                    {rule.conditions.slice(0, 2).map((c, i) => (
                      <ConditionBadge key={i} condition={c} />
                    ))}
                    <span className="text-zinc-600 mx-1">→</span>
                    {rule.actions.slice(0, 1).map((a, i) => (
                      <ActionBadge key={i} action={a} />
                    ))}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); testRule(rule.id) }}
                    disabled={isTesting}
                    className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    title="Test rule"
                  >
                    {isTesting ? (
                      <Clock size={14} className="animate-pulse" />
                    ) : (
                      <TestTube size={14} />
                    )}
                  </button>

                  {isExpanded ? (
                    <ChevronDown size={16} className="text-zinc-500" />
                  ) : (
                    <ChevronRight size={16} className="text-zinc-500" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-zinc-800 px-4 py-3">
                  {/* Conditions */}
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Conditions (IF)</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.conditions.map((c, i) => (
                        <ConditionBadge key={i} condition={c} />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase mb-2">Actions (THEN)</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.actions.map((a, i) => (
                        <ActionBadge key={i} action={a} />
                      ))}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 pt-3 border-t border-zinc-800">
                    <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                    <span>Triggered: {rule.triggerCount} times</span>
                    {rule.lastTriggered && (
                      <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setEditingRule(rule.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
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
  )
}
