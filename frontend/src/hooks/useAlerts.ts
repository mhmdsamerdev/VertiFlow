import { useState, useEffect } from 'react'
import { useZoneContext } from '../context/ZoneContext'

export interface AlertHistoryItem {
  time: string
  device_id: string
  alert_type: string
  severity: 'critical' | 'warning' | 'info' | 'success'
  message: string
  acknowledged: boolean
  acknowledged_at: string | null
}

export interface AlertsResponse {
  by_day: any[]
  breakdown: Record<string, number>
  recent: AlertHistoryItem[]
}

export function useAlerts() {
  const { activeZone } = useZoneContext()
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchAlerts = async () => {
    if (!activeZone) return
    setLoading(true)
    try {
      const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Last 24h
      const response = await fetch(`http://localhost:8000/analytics/alerts?zone_id=${activeZone.id}&from_ts=${from}`)
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`http://localhost:8000/analytics/alerts/acknowledge/${alertId}`, { method: 'POST' })
      fetchAlerts()
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [activeZone?.id])

  return { alerts, loading, refreshAlerts: fetchAlerts, acknowledgeAlert }
}
