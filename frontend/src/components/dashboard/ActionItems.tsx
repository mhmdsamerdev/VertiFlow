import React from 'react'
import { AlertTriangle, Clock, X, Zap, CheckCircle2 } from 'lucide-react'
import { ActionItem } from '../../hooks/useDashboardLogic'
import { useControls } from '../../hooks/useControls'
import { useZoneContext } from '../../context/ZoneContext'
import { useAlerts } from '../../hooks/useAlerts'

interface Props {
  items: ActionItem[]
}

export function ActionItems({ items }: Props) {
  const { activeZone } = useZoneContext()
  const { sendImmediate } = useControls(activeZone?.id ?? '')
  const { acknowledgeAlert } = useAlerts()

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <CheckCircle2 size={40} className="text-green-500/20 mb-4" />
        <p className="text-zinc-500 font-medium">No urgent actions needed. Your farm is running smoothly.</p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-800/30">
        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          THINGS YOU NEED TO DO ({items.length} items)
        </h3>
      </div>
      
      <div className="p-6 space-y-6">
        {['critical', 'warning', 'info'].map((priority) => {
          const filtered = items.filter(i => i.priority === priority)
          if (filtered.length === 0) return null

          return (
            <div key={priority} className="space-y-4">
              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                priority === 'critical' ? 'text-red-500' : priority === 'warning' ? 'text-amber-500' : 'text-blue-500'
              }`}>
                {priority === 'critical' ? '🔴 CRITICAL (Do NOW):' : priority === 'warning' ? '🟡 WARNING (Do Soon):' : '🔵 INFO:'}
              </p>
              
              <div className="space-y-3">
                {filtered.map((item) => (
                  <div key={item.id} className={`group relative p-4 rounded-xl border transition-all hover:bg-zinc-800/30 ${
                    item.priority === 'critical' 
                      ? 'bg-red-500/5 border-red-500/20' 
                      : item.priority === 'warning' 
                      ? 'bg-amber-500/5 border-amber-500/20' 
                      : 'bg-blue-500/5 border-blue-500/20'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                          item.priority === 'critical' ? 'text-red-500' : item.priority === 'warning' ? 'text-amber-500' : 'text-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{item.zoneName}: {item.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{item.message}</p>
                          <p className="text-xs font-medium text-zinc-500 mt-1 italic">Recommendation: {item.recommendation}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.actionLabel && (
                          <button 
                            onClick={() => {
                              if (item.actionTarget) {
                                sendImmediate(item.actionTarget, item.actionValue ?? true)
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                              item.priority === 'critical'
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                                : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700'
                            }`}
                          >
                            <Zap size={12} />
                            {item.actionLabel}
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (item.id.startsWith('alert-')) {
                              acknowledgeAlert(item.id.replace('alert-', ''))
                            }
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          <X size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 transition-colors">
                          <Clock size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

