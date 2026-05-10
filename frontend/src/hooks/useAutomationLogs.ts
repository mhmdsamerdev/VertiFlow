import { useState, useEffect } from 'react'
import { useZoneContext } from '../context/ZoneContext'

export interface AutomationLog {
  time: string
  rule_id: string
  rule_name: string
  trigger_sensor: string
  trigger_value: number
  actions_triggered: any[]
  outcome: string
}

export function useAutomationLogs() {
  const { activeZone } = useZoneContext()
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLogs = async () => {
    if (!activeZone) return
    setLoading(true)
    try {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const API = import.meta.env.VITE_API_URL ?? '/api'
      const response = await fetch(`${API}/analytics/automation?zone_id=${activeZone.id}&from_ts=${from}`)
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error('Failed to fetch automation logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000)
    return () => clearInterval(interval)
  }, [activeZone?.id])

  return { logs, loading, refreshLogs: fetchLogs }
}
