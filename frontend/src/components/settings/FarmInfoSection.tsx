import React, { useState } from 'react'
import {
  Building2, MapPin, FileText, Plus, Edit2, Trash2,
  ChevronDown, ChevronRight, Loader2, Save, X, Leaf,
  ToggleRight, ToggleLeft, Activity, Beaker
} from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'

const SYSTEM_TYPES = [
  { value: 'nft',       label: 'NFT (Nutrient Film Technique)' },
  { value: 'dwc',       label: 'DWC (Deep Water Culture)'      },
  { value: 'aeroponic', label: 'Aeroponic'                     },
  { value: 'flood',     label: 'Flood & Drain'                 },
  { value: 'kratky',    label: 'Kratky (Passive DWC)'          },
  { value: 'media',     label: 'Media Bed'                     },
]

interface FarmForm { name: string; location: string; description: string }
interface ZoneForm { name: string; description: string; crop_name: string; system_type: string }
const emptyFarm = (): FarmForm => ({ name: '', location: '', description: '' })
const emptyZone = (): ZoneForm => ({ name: '', description: '', crop_name: '', system_type: 'nft' })

export function FarmInfoSection() {
  const {
    farms, activeFarm, activeZone,
    setActiveFarm, setActiveZone,
    addFarm, updateFarm, updateFarmDemoMode, deleteFarm,
    addZone, updateZone, deleteZone,
  } = useZoneContext()

  const [expandedFarm, setExpandedFarm] = useState<string | null>(activeFarm?.id ?? null)
  const [editingFarm,  setEditingFarm]  = useState<string | null>(null)
  const [editingZone,  setEditingZone]  = useState<string | null>(null)
  const [showAddFarm,  setShowAddFarm]  = useState(false)
  const [showAddZone,  setShowAddZone]  = useState<string | null>(null)
  const [saving, setSaving]            = useState(false)
  const [farmForm,  setFarmForm]  = useState<FarmForm>(emptyFarm)
  const [zoneForm,  setZoneForm]  = useState<ZoneForm>(emptyZone)

  // ── Helpers ────────────────────────────────────────────────────────────────
  async function withSaving(fn: () => Promise<void>) {
    setSaving(true)
    try { await fn() } catch (e) { console.error(e) } finally { setSaving(false) }
  }

  // ── Farm handlers ──────────────────────────────────────────────────────────
  function startEditFarm(farmId: string) {
    const f = farms.find(x => x.id === farmId)
    if (!f) return
    setFarmForm({ name: f.name, location: f.location, description: '' })
    setEditingFarm(farmId)
  }

  async function handleSaveFarm(farmId: string) {
    await withSaving(() => updateFarm(farmId, farmForm))
    setEditingFarm(null)
  }

  async function handleDeleteFarm(farmId: string) {
    if (!confirm('Delete this farm and all its zones?')) return
    await withSaving(() => deleteFarm(farmId))
  }

  async function handleToggleLiveMode(farmId: string, currentIsDemo: boolean) {
    await withSaving(() => updateFarmDemoMode(farmId, !currentIsDemo))
  }

  async function handleAddFarm() {
    if (!farmForm.name.trim()) return
    await withSaving(() => addFarm(farmForm.name, farmForm.location, farmForm.description))
    setShowAddFarm(false)
    setFarmForm(emptyFarm())
  }

  // ── Zone handlers ──────────────────────────────────────────────────────────
  function startEditZone(zoneId: string, farmId: string) {
    const zone = farms.find(f => f.id === farmId)?.zones.find(z => z.id === zoneId)
    if (!zone) return
    setZoneForm({ name: zone.name, description: zone.description, crop_name: zone.cropName, system_type: 'nft' })
    setEditingZone(zoneId)
  }

  async function handleSaveZone(zoneId: string) {
    await withSaving(() => updateZone(zoneId, zoneForm))
    setEditingZone(null)
  }

  async function handleDeleteZone(zoneId: string) {
    if (!confirm('Delete this zone? Telemetry history will be preserved.')) return
    await withSaving(() => deleteZone(zoneId))
  }

  async function handleAddZone(farmId: string) {
    if (!zoneForm.name.trim()) return
    await withSaving(() => addZone(farmId, zoneForm))
    setShowAddZone(null)
    setZoneForm(emptyZone())
  }

  const inputCls = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50'
  const smallInputCls = 'bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50'

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Farm Information</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Manage your farms and growing zones. All changes sync immediately to the live system.
        </p>
      </div>

      {/* Add Farm */}
      <button
        onClick={() => setShowAddFarm(true)}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
      >
        <Plus size={16} /> Add New Farm
      </button>

      {/* Add Farm Form */}
      {showAddFarm && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">New Farm</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Farm Name *</label>
              <input type="text" value={farmForm.name} onChange={e => setFarmForm({ ...farmForm, name: e.target.value })}
                placeholder="e.g., My Vertical Farm" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Location</label>
              <input type="text" value={farmForm.location} onChange={e => setFarmForm({ ...farmForm, location: e.target.value })}
                placeholder="e.g., Greenhouse A" className={inputCls} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
            <textarea value={farmForm.description} onChange={e => setFarmForm({ ...farmForm, description: e.target.value })}
              placeholder="Optional description…" rows={2}
              className={`${inputCls} resize-none`} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddFarm} disabled={saving || !farmForm.name.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Create Farm
            </button>
            <button onClick={() => { setShowAddFarm(false); setFarmForm(emptyFarm()) }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Farms List */}
      <div className="space-y-4">
        {farms.map(farm => {
          const isExpanded = expandedFarm === farm.id
          const isEditing  = editingFarm === farm.id

          return (
            <div key={farm.id} className="card overflow-hidden">
              {/* Farm Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 cursor-pointer"
                onClick={() => setExpandedFarm(isExpanded ? null : farm.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? <ChevronDown size={16} className="text-zinc-500 shrink-0" /> : <ChevronRight size={16} className="text-zinc-500 shrink-0" />}
                  <Building2 size={16} className="text-zinc-400 shrink-0" />
                  {isEditing ? (
                    <div className="flex gap-2 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                      <input type="text" value={farmForm.name}
                        onChange={e => setFarmForm({ ...farmForm, name: e.target.value })}
                        className={smallInputCls} placeholder="Farm name" />
                      <input type="text" value={farmForm.location}
                        onChange={e => setFarmForm({ ...farmForm, location: e.target.value })}
                        className={smallInputCls} placeholder="Location" />
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-zinc-200 truncate">{farm.name}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1 shrink-0">
                        <MapPin size={10} />{farm.location}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSaveFarm(farm.id)} disabled={saving}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      </button>
                      <button onClick={() => setEditingFarm(null)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditFarm(farm.id)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteFarm(farm.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Zones */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-4">
                  {/* System Mode Toggle */}
                  <div className="mb-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={farm.demoMode ? "text-amber-500" : "text-green-500"} />
                        <h4 className="text-sm font-semibold text-zinc-200">System Data Mode</h4>
                      </div>
                      <button
                        onClick={() => handleToggleLiveMode(farm.id, farm.demoMode)}
                        disabled={saving}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          farm.demoMode 
                            ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750' 
                            : 'bg-green-500/10 text-green-400 border border-green-500/20'
                        }`}
                      >
                        {farm.demoMode ? <ToggleLeft size={18} /> : <ToggleRight size={18} />}
                        {farm.demoMode ? "Switch to Live" : "Live Mode ON"}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {farm.demoMode 
                        ? "Currently in Demo Mode. Sensors are showing simulated mock data. Use this for testing and demonstration."
                        : "Currently in Live Mode. Showing genuine telemetry from connected devices. Unconnected sensors will show 'No Reading'."}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        farm.demoMode ? "bg-amber-500/10 text-amber-500" : "bg-green-500/10 text-green-500"
                      }`}>
                        {farm.demoMode ? "Demo / Mock Data" : "Live Production Data"}
                      </span>
                      {farm.demoMode && (
                        <span className="text-[10px] text-zinc-600 italic">
                          Recommended for system exploration
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Zones ({farm.zones.length})
                    </span>
                    <button onClick={() => { setShowAddZone(farm.id); setZoneForm(emptyZone()) }}
                      className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors">
                      <Plus size={12} /> Add Zone
                    </button>
                  </div>

                  {/* Add Zone Form */}
                  {showAddZone === farm.id && (
                    <div className="card p-3 mb-3 bg-zinc-900/50">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Zone Name *</label>
                          <input type="text" value={zoneForm.name}
                            onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                            placeholder="e.g., Zone Alpha"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Description</label>
                          <input type="text" value={zoneForm.description}
                            onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                            placeholder="e.g., NFT Rack 01"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">Crop</label>
                          <input type="text" value={zoneForm.crop_name}
                            onChange={e => setZoneForm({ ...zoneForm, crop_name: e.target.value })}
                            placeholder="e.g., Butterhead Lettuce"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-500 mb-1">System Type</label>
                          <select value={zoneForm.system_type}
                            onChange={e => setZoneForm({ ...zoneForm, system_type: e.target.value })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50">
                            {SYSTEM_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddZone(farm.id)} disabled={saving || !zoneForm.name.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors disabled:opacity-50">
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Zone
                        </button>
                        <button onClick={() => { setShowAddZone(null); setZoneForm(emptyZone()) }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Zone items */}
                  <div className="space-y-2">
                    {farm.zones.map(zone => {
                      const isEditingZone = editingZone === zone.id
                      const isActive = activeZone?.id === zone.id
                      return (
                        <div key={zone.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isActive ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-900/30 border-zinc-800'
                          }`}>
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-green-500' : 'bg-zinc-700'}`} />
                            {isEditingZone ? (
                              <div className="flex gap-2 flex-wrap flex-1">
                                <input type="text" value={zoneForm.name}
                                  onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                  className={smallInputCls} placeholder="Zone name" />
                                <input type="text" value={zoneForm.description}
                                  onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                                  className={smallInputCls} placeholder="Description" />
                                <input type="text" value={zoneForm.crop_name}
                                  onChange={e => setZoneForm({ ...zoneForm, crop_name: e.target.value })}
                                  className={smallInputCls} placeholder="Crop" />
                                <select value={zoneForm.system_type}
                                  onChange={e => setZoneForm({ ...zoneForm, system_type: e.target.value })}
                                  className={smallInputCls}>
                                  {SYSTEM_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-zinc-300">{zone.name}</p>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                  <FileText size={10} />{zone.description}
                                  {zone.cropName && <><span className="text-zinc-700">·</span><Leaf size={10} />{zone.cropName}</>}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {isEditingZone ? (
                              <>
                                <button onClick={() => handleSaveZone(zone.id)} disabled={saving}
                                  className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors">
                                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                </button>
                                <button onClick={() => setEditingZone(null)}
                                  className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors">
                                  <X size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditZone(zone.id, farm.id)}
                                  className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteZone(zone.id)}
                                  className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {farm.zones.length === 0 && (
                      <p className="text-xs text-zinc-600 text-center py-3">No zones yet — add your first zone above</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {farms.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">
            No farms configured yet — click "Add New Farm" to get started
          </div>
        )}
      </div>
    </div>
  )
}
