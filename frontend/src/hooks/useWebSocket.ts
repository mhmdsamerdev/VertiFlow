import { useEffect, useState } from 'react'
import { ConnectionStatus, TelemetryPayload } from '../types/telemetry'

const RECONNECT_DELAY_MS = 3_000

export interface UseWebSocketReturn {
  status: ConnectionStatus
  data: TelemetryPayload | null
}

export function useWebSocket(url: string | null): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [data, setData] = useState<TelemetryPayload | null>(null)

  useEffect(() => {
    // Closure-local flag — each effect run owns its own copy.
    // A stale onclose from a previous socket can never see this as true.
    let active = true
    let ws: WebSocket
    let timer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (!active) return
      ws = new WebSocket(url)

      ws.onopen = () => {
        if (active) setStatus('connected')
      }

      ws.onmessage = (evt: MessageEvent) => {
        if (!active) return
        try { setData(JSON.parse(evt.data) as TelemetryPayload) } catch { /* ignore malformed */ }
      }

      ws.onerror = () => {
        if (active) setStatus('error')
      }

      ws.onclose = () => {
        if (!active) return
        setStatus('disconnected')
        timer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    setData(null)
    if (!url) {
      setStatus('disconnected')
      return () => { active = false }
    }
    setStatus('connecting')
    connect()

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      ws?.close()
    }
  }, [url])

  return { status, data }
}
