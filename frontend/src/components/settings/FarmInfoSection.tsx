import React, { useState } from 'react'
import { Building2, MapPin, FileText, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'

interface FarmFormData {
  name: string
  location: string
  description: string
}

interface ZoneFormData {
  name: string
  location: string
  description: string
}

export function FarmInfoSection() {
  const { farms, activeFarm, activeZone, setActiveFarm, setActiveZone } = useZoneContext()
  const [expandedFarm, setExpandedFarm] = useState<string | null>(activeFarm.id)
  const [editingFarm, setEditingFarm] = useState<string | null>(null)
  const [editingZone, setEditingZone] = useState<string | null>(null)
  const [showAddFarm, setShowAddFarm] = useState(false)
  const [showAddZone, setShowAddZone] = useState<string | null>(null)

  // Form states
  const [farmForm, setFarmForm] = useState<FarmFormData>({
    name: '',
    location: '',
    description: '',
  })

  const [zoneForm, setZoneForm] = useState<ZoneFormData>({
    name: '',
    location: '',
    description: '',
  })

  const handleEditFarm = (farmId: string) => {
    const farm = farms.find(f => f.id === farmId)
    if (farm) {
      setFarmForm({
        name: farm.name,
        location: farm.location,
        description: '', // Farm doesn't have description in current model
      })
      setEditingFarm(farmId)
    }
  }

  const handleEditZone = (zoneId: string, farmId: string) => {
    const farm = farms.find(f => f.id === farmId)
    const zone = farm?.zones.find(z => z.id === zoneId)
    if (zone) {
      setZoneForm({
        name: zone.name,
        location: '', // Zone doesn't have separate location in current model
        description: zone.description,
      })
      setEditingZone(zoneId)
    }
  }

  const handleSaveFarm = (farmId: string) => {
    // Backend integration placeholder
    console.log('Save farm:', farmId, farmForm)
    setEditingFarm(null)
  }

  const handleSaveZone = (zoneId: string) => {
    // Backend integration placeholder
    console.log('Save zone:', zoneId, zoneForm)
    setEditingZone(null)
  }

  const handleDeleteFarm = (farmId: string) => {
    // Backend integration placeholder
    console.log('Delete farm:', farmId)
  }

  const handleDeleteZone = (zoneId: string) => {
    // Backend integration placeholder
    console.log('Delete zone:', zoneId)
  }

  const handleAddFarm = () => {
    // Backend integration placeholder
    console.log('Add farm:', farmForm)
    setShowAddFarm(false)
    setFarmForm({ name: '', location: '', description: '' })
  }

  const handleAddZone = (farmId: string) => {
    // Backend integration placeholder
    console.log('Add zone to farm:', farmId, zoneForm)
    setShowAddZone(null)
    setZoneForm({ name: '', location: '', description: '' })
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} className="text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-100">Farm Information</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Manage your farms and growing zones. Changes will be synchronized across the platform.
        </p>
      </div>

      {/* Add Farm Button */}
      <button
        onClick={() => setShowAddFarm(true)}
        className="mb-6 flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors text-sm font-medium"
      >
        <Plus size={16} />
        Add New Farm
      </button>

      {/* Add Farm Form */}
      {showAddFarm && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">New Farm</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Farm Name</label>
              <input
                type="text"
                value={farmForm.name}
                onChange={e => setFarmForm({ ...farmForm, name: e.target.value })}
                placeholder="e.g., Farm 003"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Location</label>
              <input
                type="text"
                value={farmForm.location}
                onChange={e => setFarmForm({ ...farmForm, location: e.target.value })}
                placeholder="e.g., Greenhouse C"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-zinc-500 mb-1.5">Description</label>
            <textarea
              value={farmForm.description}
              onChange={e => setFarmForm({ ...farmForm, description: e.target.value })}
              placeholder="Optional description..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddFarm}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors"
            >
              Create Farm
            </button>
            <button
              onClick={() => { setShowAddFarm(false); setFarmForm({ name: '', location: '', description: '' }) }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Farms List */}
      <div className="space-y-4">
        {farms.map(farm => {
          const isExpanded = expandedFarm === farm.id
          const isEditing = editingFarm === farm.id

          return (
            <div key={farm.id} className="card overflow-hidden">
              {/* Farm Header */}
              <div
                className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 cursor-pointer"
                onClick={() => setExpandedFarm(isExpanded ? null : farm.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-zinc-500" />
                  ) : (
                    <ChevronRight size={16} className="text-zinc-500" />
                  )}
                  <Building2 size={16} className="text-zinc-400" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={farmForm.name}
                      onChange={e => setFarmForm({ ...farmForm, name: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                  ) : (
                    <span className="font-medium text-zinc-200">{farm.name}</span>
                  )}
                  <span className="text-xs text-zinc-600">·</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={farmForm.location}
                      onChange={e => setFarmForm({ ...farmForm, location: e.target.value })}
                      onClick={e => e.stopPropagation()}
                      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-green-500/50"
                    />
                  ) : (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <MapPin size={10} />
                      {farm.location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleSaveFarm(farm.id) }}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingFarm(null) }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleEditFarm(farm.id) }}
                        className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                        title="Edit farm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteFarm(farm.id) }}
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete farm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Zones List */}
              {isExpanded && (
                <div className="border-t border-zinc-800">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Zones ({farm.zones.length})
                      </span>
                      <button
                        onClick={() => setShowAddZone(farm.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                      >
                        <Plus size={12} />
                        Add Zone
                      </button>
                    </div>

                    {/* Add Zone Form */}
                    {showAddZone === farm.id && (
                      <div className="card p-3 mb-3 bg-zinc-900/50">
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Zone Name</label>
                            <input
                              type="text"
                              value={zoneForm.name}
                              onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                              placeholder="e.g., Zone Theta"
                              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-500 mb-1">Description</label>
                            <input
                              type="text"
                              value={zoneForm.description}
                              onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                              placeholder="e.g., NFT Rack 02"
                              className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddZone(farm.id)}
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setShowAddZone(null); setZoneForm({ name: '', location: '', description: '' }) }}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded text-xs transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Zones */}
                    <div className="space-y-2">
                      {farm.zones.map(zone => {
                        const isEditingZone = editingZone === zone.id
                        return (
                          <div
                            key={zone.id}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              activeZone.id === zone.id
                                ? 'bg-green-500/5 border-green-500/20'
                                : 'bg-zinc-900/30 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                activeZone.id === zone.id ? 'bg-green-500' : 'bg-zinc-700'
                              }`} />
                              {isEditingZone ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={zoneForm.name}
                                    onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                                  />
                                  <input
                                    type="text"
                                    value={zoneForm.description}
                                    onChange={e => setZoneForm({ ...zoneForm, description: e.target.value })}
                                    className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-green-500/50"
                                  />
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-zinc-300">{zone.name}</p>
                                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                                    <FileText size={10} />
                                    {zone.description} · {zone.cropName}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {isEditingZone ? (
                                <>
                                  <button
                                    onClick={() => handleSaveZone(zone.id)}
                                    className="p-1.5 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingZone(null)}
                                    className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditZone(zone.id, farm.id)}
                                    className="p-1.5 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                                    title="Edit zone"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteZone(zone.id)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                    title="Delete zone"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
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
