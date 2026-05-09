import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Cpu, Server, Wifi, WifiOff, History, Play } from 'lucide-react'
import { ruleApi, ApiRule } from '../../api/config'
import { apiFetch } from '../../api/client'
import { useZoneContext } from '../../context/ZoneContext'

interface AutomationLog {
  time: string
  rule_name: string
  trigger_sensor: string
  trigger_value: number
  actions_triggered: any[]
  outcome: string
}

export function AutomationStatus() {
  const [isOpen, setIsOpen] = useState(false)
  const { activeZone } = useZoneContext()
  const [rules, setRules] = useState<ApiRule[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !activeZone) return

    async function fetchData() {
      setLoading(true)
      try {
        const [rulesData, logsData] = await Promise.all([
          ruleApi.list(activeZone?.id),
          apiFetch<AutomationLog[]>(`/analytics/automation?zone_id=${activeZone?.id}&from_ts=${new Date(Date.now() - 24 * 3600 * 1000).toISOString()}`)
        ])
        setRules(rulesData)
        setLogs(logsData)
      } catch (err) {
        console.error('Failed to fetch automation data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, activeZone?.id])

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-zinc-400">
          <Cpu size={16} />
          <h3 className="text-xs font-black uppercase tracking-widest">AUTOMATION & SYSTEMS</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">
            <Play size={10} className="text-green-500" />
            {rules.filter(r => r.enabled).length} ACTIVE
          </div>
          {isOpen ? <ChevronUp size={16} className="text-zinc-600" /> : <ChevronDown size={16} className="text-zinc-600" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-6 pb-6 pt-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rules */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                <Server size={12} />
                ACTIVE RULES ({activeZone?.name})
              </p>
              <div className="space-y-1.5 text-[11px]">
                {rules.length === 0 ? (
                  <p className="text-zinc-600 italic">No rules defined for this zone</p>
                ) : (
                  rules.map((rule, i) => (
                    <div key={rule.id} className="flex items-center gap-2">
                      <span className="text-zinc-700">{i === rules.length - 1 ? '└─' : '├─'}</span>
                      <span className={rule.enabled ? 'text-zinc-400' : 'text-zinc-600 line-through'}>{rule.name}</span>
                      {rule.enabled ? (
                        <span className="text-green-500/50 text-[9px] font-bold bg-green-500/5 px-1 rounded ml-auto">ENABLED</span>
                      ) : (
                        <span className="text-zinc-600 text-[9px] font-bold bg-zinc-800 px-1 rounded ml-auto">DISABLED</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Systems */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                <Wifi size={12} />
                CONNECTIVITY
              </p>
              <div className="space-y-1.5 text-[11px] text-zinc-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700">├─</span>
                    <span>Backend API</span>
                  </div>
                  <span className="text-green-500 font-bold">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700">├─</span>
                    <span>Zone Controller</span>
                  </div>
                  <span className="text-green-500 font-bold">STABLE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-700">└─</span>
                    <span>Telemetry Stream</span>
                  </div>
                  <span className="text-green-500 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Logs */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/50">
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <History size={12} />
              RECENT AUTOMATION LOGS (24H)
            </p>
            <div className="max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 italic">No automation events recorded in the last 24h</p>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-zinc-800/20 border border-zinc-800/50 text-[11px]">
                      <div className="pt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-300">{log.rule_name}</span>
                          <span className="text-[9px] font-mono text-zinc-500">{new Date(log.time).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-zinc-500">
                          Triggered by <span className="text-zinc-400 font-mono">{log.trigger_sensor}</span> at <span className="text-zinc-400 font-mono">{log.trigger_value?.toFixed(1)}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {log.actions_triggered.map((act, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-400 font-medium">
                              {act.type === 'turn_on' ? '⚡ ON' : '⭕ OFF'}: {act.device_id}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutomationStatus
