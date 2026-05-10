import React from 'react'
import { Thermometer, Droplets, Waves, FlaskConical, ChevronRight, Sliders } from 'lucide-react'
import { ZoneHealth } from '../../hooks/useDashboardLogic'
import { useZoneContext } from '../../context/ZoneContext'

interface Props {
  zoneHealths: ZoneHealth[]
}

export function ZoneSnapshots({ zoneHealths }: Props) {
  const { setActiveZone, setActiveTab } = useZoneContext()
  
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
        ZONE SNAPSHOTS
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {zoneHealths.map((zh) => (
          <div key={zh.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all group">
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">{zh.name}</h4>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{zh.cropName || 'Unknown Crop'}</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                  zh.status === 'healthy' ? 'bg-green-500/10 text-green-500' : zh.status === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {zh.status === 'healthy' ? '✓ GOOD' : zh.status === 'critical' ? '🔴 CRIT' : '△ WARN'}
                </div>
              </div>

              {/* Health Score */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-zinc-500">HEALTH</span>
                  <span className={zh.status === 'healthy' ? 'text-green-500' : zh.status === 'critical' ? 'text-red-500' : 'text-amber-500'}>
                    {zh.score}/100
                  </span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      zh.status === 'healthy' ? 'bg-green-500' : zh.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${zh.score}%` }}
                  />
                </div>
              </div>

              {/* Readings Grid */}
              <div className="grid grid-cols-2 gap-3">
                <ReadingItem icon={<Thermometer size={12} />} label="Temp" value={zh.readings.air_temp?.value !== undefined && zh.readings.air_temp.value !== null ? `${zh.readings.air_temp.value.toFixed(1)}°C` : '--°C'} status={zh.readings.air_temp?.status ?? 'ok'} />
                <ReadingItem icon={<Droplets size={12} />} label="Humid" value={zh.readings.humidity?.value !== undefined && zh.readings.humidity.value !== null ? `${zh.readings.humidity.value.toFixed(0)}%` : '--%'} status={zh.readings.humidity?.status ?? 'ok'} />
                <ReadingItem icon={<Waves size={12} />} label="Moist" value={zh.readings.soil_moisture?.value !== undefined && zh.readings.soil_moisture.value !== null ? `${zh.readings.soil_moisture.value.toFixed(0)}%` : '--%'} status={zh.readings.soil_moisture?.status ?? 'ok'} />
                <ReadingItem icon={<FlaskConical size={12} />} label="pH" value={zh.readings.ph?.value !== undefined && zh.readings.ph.value !== null ? `${zh.readings.ph.value.toFixed(1)}` : '--'} status={zh.readings.ph?.status ?? 'ok'} />
              </div>

              {/* Harvest Info */}
              <div className="pt-2 border-t border-zinc-800/50 min-h-[40px]">
                {zh.daysToHarvest !== null && zh.daysToHarvest > 0 && (
                  <>
                    <p className="text-[10px] text-zinc-500 font-medium">Days to harvest</p>
                    <p className="text-xs font-bold text-zinc-300">{zh.daysToHarvest} days</p>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => {
                    setActiveZone(zh.id)
                    setActiveTab('Analytics')
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800/50 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
                >
                  <ChevronRight size={12} />
                  Details
                </button>
                <button 
                  onClick={() => {
                    setActiveZone(zh.id)
                    setActiveTab('Controls')
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-zinc-800/50 text-[10px] font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all"
                >
                  <Sliders size={12} />
                  Ctrl
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReadingItem({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: 'ok' | 'warn' | 'crit' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-zinc-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-600 font-bold uppercase leading-none">{label}</p>
        <p className={`text-[11px] font-mono font-bold leading-none mt-1 ${
          status === 'ok' ? 'text-zinc-400' : status === 'warn' ? 'text-amber-500' : 'text-red-500'
        }`}>
          {value} {status !== 'ok' && (status === 'warn' ? '⚠️' : '🔴')}
        </p>
      </div>
    </div>
  )
}
export default ZoneSnapshots
