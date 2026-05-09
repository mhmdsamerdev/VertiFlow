import { useState, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000'

export interface CommandHistoryEntry {
  time: string
  actuator_id: string
  action: string
  mode: string
  status: string
  triggered_by: string
  params?: any
}

export function useControlHistory(zoneId: string) {
  const [history, setHistory] = useState<CommandHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchHistory = useCallback(async () => {
    if (!zoneId) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/controls/${zoneId}/history?limit=10`)
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
      }
    } catch (err) {
      console.error('Failed to fetch control history:', err)
    } finally {
      setIsLoading(false)
    }
  }, [zoneId])

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [fetchHistory])

  return { history, isLoading, refreshHistory: fetchHistory }
}
