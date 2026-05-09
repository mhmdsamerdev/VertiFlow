import React, { useState } from 'react'
import {
  Cpu, Plus, Edit2, Trash2, Battery, Wifi, WifiOff, Settings,
  Thermometer, Droplets, Sun, Wind, Gauge, Activity, Beaker,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react'
import { Device, DeviceStatus, DeviceType, SensorType, SensorThresholds, CalibrationEntry } from './types'

// Mock data - will be replaced with API calls
const MOCK_DEVICES: Device[] = [
  { id: 'dev-001', name: 'pH Sensor A1', type: 'sensor', zoneId: 'zone-alpha', status: 'online', batteryLevel: 85, lastSeen: new Date().toISOString(), firmwareVersion: '1.2.3' },
  { id: 'dev-002', name: 'EC Monitor B1', type: 'sensor', zoneId: 'zone-beta', status: 'online', batteryLevel: 72, lastSeen: new Date().toISOString(), firmwareVersion: '1.2.3' },
  { id: 'dev-003', name: 'Temp/Humidity Node', type: 'sensor', zoneId: 'zone-alpha', status: 'warning', batteryLevel: 15, lastSeen: new Date().toISOString(), firmwareVersion: '1.1.0' },
  { id: 'dev-004', name: 'Light Sensor Array', type: 'sensor', zoneId: 'zone-gamma', status: 'online', batteryLevel: 90, lastSeen: new Date().toISOString(), firmwareVersion: '1.2.1' },
  { id: 'dev-005', name: 'CO2 Monitor', type: 'sensor', zoneId: 'zone-alpha', status: 'offline', lastSeen: new Date(Date.now() - 86400000).toISOString(), firmwareVersion: '1.0.5' },
  { id: 'act-001', name: 'Main Water Pump', type: 'actuator', zoneId: 'zone-alpha', status: 'online', lastSeen: new Date().toISOString() },
  { id: 'act-002', name: 'Cooling Fan #1', type: 'actuator', zoneId: 'zone-alpha', status: 'online', lastSeen: new Date().toISOString() },
  { id: 'gw-001', name: 'Gateway Alpha', type: 'gateway', zoneId: 'zone-alpha', status: 'online', lastSeen: new Date().toISOString(), firmwareVersion: '2.1.0' },
]

const MOCK_THRESHOLDS: SensorThresholds[] = [
  { sensorType: 'ph', min: 5.0, max: 7.5, target: 6.2, warningOffset: 0.4, criticalOffset: 0.8 },
  { sensorType: 'ec', min: 0.8, max: 3.0, target: 1.8, warningOffset: 0.4, criticalOffset: 1.0 },
  { sensorType: 'air_temp', min: 15.0, max: 33.0, target: 24.0, warningOffset: 4.0, criticalOffset: 9.0 },
  { sensorType: 'humidity', min: 40.0, max: 90.0, target: 65.0, warningOffset: 10.0, criticalOffset: 25.0 },
  { sensorType: 'soil_moisture', min: 30.0, max: 95.0, target: 70.0, warningOffset: 20.0, criticalOffset: 25.0 },
  { sensorType: 'light_intensity', min: 200.0, max: 900.0, target: 500.0, warningOffset: 150.0, criticalOffset: 300.0 },
  { sensorType: 'co2', min: 400.0, max: 1500.0, target: 900.0, warningOffset: 300.0, criticalOffset: 500.0 },
]

const MOCK_CALIBRATION: CalibrationEntry[] = [
  { sensorId: 'dev-001', sensorType: 'ph', lastCalibrated: '2024-01-15T10:30:00Z', offset: 0.02, slope: 1.0 },
  { sensorId: 'dev-002', sensorType: 'ec', lastCalibrated: '2024-01-10T14:00:00Z', offset: 0.0, slope: 1.02 },
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
  ph: 'pH Level',
  ec: 'EC / Nutrients',
  air_temp: 'Air Temperature',
  humidity: 'Humidity',
  soil_moisture: 'Soil Moisture',
  light_intensity: 'Light Intensity',
  co2: 'CO₂ Level',
}

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  sensor: 'Sensor',
  actuator: 'Actuator',
  gateway: 'Gateway',
  camera: 'Camera',
}

function StatusBadge({ status, batteryLevel }: { status: DeviceStatus; batteryLevel?: number }) {
  const isLowBattery = batteryLevel !== undefined && batteryLevel < 20

  if (status === 'online' && !isLowBattery) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-green-500/10 text-green-400 ring-1 ring-inset ring-green-500/20">
        <CheckCircle2 size={10} />
        Online
      </span>
    )
  }
  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-zinc-700">
        <WifiOff size={10} />
        Offline
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/20">
        <XCircle size={10} />
        Error
      </span>
    )
  }
  if (isLowBattery || status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 ring-1 ring-inset ring-amber-400/20">
        <AlertTriangle size={10} />
        {isLowBattery ? `Low Battery ${batteryLevel}%` : 'Warning'}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 ring-1 ring-inset ring-zinc-700">
      <Settings size={10} />
      Maintenance
    </span>
  )
}

export function DevicesSensorsSection() {
  const [activeTab, setActiveTab] = useState<'devices' | 'thresholds' | 'calibration'>('devices')
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [editingThreshold, setEditingThreshold] = useState<SensorType | null>(null)
  const [calibratingSensor, setCalibratingSensor] = useState<string | null>(null)
  const [thresholdForm, setThresholdForm] = useState<SensorThresholds>({
    sensorType: 'ph', min: 0, max: 0, target: 0, warningOffset: 0, criticalOffset: 0,
  })

  const handleEditThreshold = (threshold: SensorThresholds) => {
    setThresholdForm(threshold)
    setEditingThreshold(threshold.sensorType)
  }

  const handleSaveThreshold = () => {
    // Backend integration placeholder
    console.log('Save threshold:', thresholdForm)
    setEditingThreshold(null)
  }

  const handleCalibrate = (deviceId: string) => {
    // Backend integration placeholder
    console.log('Calibrate device:', deviceId)
    setCalibratingSensor(null)
  }

  const sensors = MOCK_DEVICES.filter(d => d.type === 'sensor')
  const actuators = MOCK_DEVICES.filter(d => d.type === 'actuator')
  const gateways = MOCK_DEVICES.filter(d => d.type === 'gateway')

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Devices & Sensors</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Manage devices, configure sensor thresholds, and calibrate sensors.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {[
          { id: 'devices', label: 'Devices', count: MOCK_DEVICES.length },
          { id: 'thresholds', label: 'Thresholds', count: MOCK_THRESHOLDS.length },
          { id: 'calibration', label: 'Calibration', count: MOCK_CALIBRATION.length },
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

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="space-y-6">
          {/* Add Device Button */}
          <button
            onClick={() => setShowAddDevice(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Device
          </button>

          {/* Add Device Form */}
          {showAddDevice && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Add New Device</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Device Name</label>
                  <input
                    type="text"
                    placeholder="e.g., pH Sensor A2"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Type</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
                    <option value="sensor">Sensor</option>
                    <option value="actuator">Actuator</option>
                    <option value="gateway">Gateway</option>
                    <option value="camera">Camera</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5">Zone</label>
                  <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50">
                    <option>Zone Alpha</option>
                    <option>Zone Beta</option>
                    <option>Zone Gamma</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddDevice(false)}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Add Device
                </button>
                <button
                  onClick={() => setShowAddDevice(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Sensors */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Sensors ({sensors.length})
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {sensors.map(device => {
                const Icon = SENSOR_ICONS[device.id.includes('ph') ? 'ph' :
                  device.id.includes('EC') || device.id.includes('ec') ? 'ec' :
                  device.id.includes('Temp') ? 'air_temp' :
                  device.id.includes('Light') ? 'light_intensity' :
                  device.id.includes('CO2') ? 'co2' : 'ph']

                return (
                  <div key={device.id} className="card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-lg">
                        <Icon size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{device.name}</p>
                        <p className="text-xs text-zinc-500">{device.id} · v{device.firmwareVersion}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {device.batteryLevel && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <Battery size={12} className={device.batteryLevel < 20 ? 'text-red-400' : 'text-zinc-500'} />
                          {device.batteryLevel}%
                        </div>
                      )}
                      <StatusBadge status={device.status} batteryLevel={device.batteryLevel} />
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCalibratingSensor(device.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                          title="Calibrate"
                        >
                          <Settings size={14} />
                        </button>
                        <button
                          className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Actuators */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Actuators ({actuators.length})
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {actuators.map(device => (
                <div key={device.id} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <Activity size={16} className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{device.name}</p>
                      <p className="text-xs text-zinc-500">{device.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={device.status} />
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gateways */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Gateways ({gateways.length})
            </h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {gateways.map(device => (
                <div key={device.id} className="card p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <Wifi size={16} className="text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{device.name}</p>
                      <p className="text-xs text-zinc-500">{device.id} · v{device.firmwareVersion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={device.status} />
                    <div className="flex gap-1">
                      <button
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Thresholds Tab */}
      {activeTab === 'thresholds' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 mb-4">
            Configure warning and critical thresholds for each sensor type. These values determine when alerts are triggered.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {MOCK_THRESHOLDS.map(threshold => {
              const Icon = SENSOR_ICONS[threshold.sensorType]
              const isEditing = editingThreshold === threshold.sensorType

              return (
                <div key={threshold.sensorType} className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-zinc-400" />
                      <span className="font-medium text-zinc-200">{SENSOR_LABELS[threshold.sensorType]}</span>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={handleSaveThreshold}
                          className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={() => setEditingThreshold(null)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditThreshold(threshold)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Target</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={thresholdForm.target}
                          onChange={e => setThresholdForm({ ...thresholdForm, target: parseFloat(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                      ) : (
                        <span className="text-sm text-zinc-300 font-mono">{threshold.target}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Min</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={thresholdForm.min}
                          onChange={e => setThresholdForm({ ...thresholdForm, min: parseFloat(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                      ) : (
                        <span className="text-sm text-zinc-300 font-mono">{threshold.min}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">Max</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={thresholdForm.max}
                          onChange={e => setThresholdForm({ ...thresholdForm, max: parseFloat(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                      ) : (
                        <span className="text-sm text-zinc-300 font-mono">{threshold.max}</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                    <div>
                      <label className="block text-[10px] text-amber-400/70 uppercase mb-1">Warning Offset</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={thresholdForm.warningOffset}
                          onChange={e => setThresholdForm({ ...thresholdForm, warningOffset: parseFloat(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                      ) : (
                        <span className="text-xs text-zinc-400 font-mono">±{threshold.warningOffset}</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] text-red-400/70 uppercase mb-1">Critical Offset</label>
                      {isEditing ? (
                        <input
                          type="number"
                          value={thresholdForm.criticalOffset}
                          onChange={e => setThresholdForm({ ...thresholdForm, criticalOffset: parseFloat(e.target.value) })}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                        />
                      ) : (
                        <span className="text-xs text-zinc-400 font-mono">±{threshold.criticalOffset}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calibration Tab */}
      {activeTab === 'calibration' && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 mb-4">
            View and manage sensor calibration data. Calibrate sensors regularly for accurate readings.
          </p>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Sensor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Last Calibrated</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Offset</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Slope</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CALIBRATION.map(cal => (
                  <tr key={cal.sensorId} className="border-b border-zinc-800/50 last:border-0">
                    <td className="px-4 py-3 text-sm text-zinc-300">{cal.sensorId}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-400">{SENSOR_LABELS[cal.sensorType]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(cal.lastCalibrated).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{cal.offset.toFixed(3)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{cal.slope.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setCalibratingSensor(cal.sensorId)}
                        className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                      >
                        Calibrate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {calibratingSensor && (
            <div className="card p-4 bg-amber-400/5 border-amber-400/20">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200 mb-1">
                    Calibration Mode: {calibratingSensor}
                  </p>
                  <p className="text-xs text-zinc-500 mb-3">
                    Enter known reference values to calibrate the sensor. Follow the calibration procedure.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Reference value"
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                    <input
                      type="number"
                      placeholder="Sensor reading"
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                    <button
                      onClick={() => handleCalibrate(calibratingSensor)}
                      className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setCalibratingSensor(null)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
