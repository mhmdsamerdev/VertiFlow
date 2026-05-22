import { useEffect, useState } from 'react'
import { ConnectionStatus, TelemetryPayload } from '../types/telemetry'

const INITIAL_RECONNECT_DELAY_MS = 1_000
const MAX_RECONNECT_DELAY_MS = 16_000
const MAX_QUIET_ATTEMPTS = 5

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
    let ws: WebSocket | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = INITIAL_RECONNECT_DELAY_MS
    let attemptCount = 0

    function connect() {
      if (!active || url === null) return
      ws = new WebSocket(url)

      ws.onopen = () => {
        if (!active) return
        setStatus('connected')
        reconnectDelay = INITIAL_RECONNECT_DELAY_MS
        attemptCount = 0
      }

      ws.onmessage = (evt: MessageEvent) => {
        if (!active) return
        try {
          setData(JSON.parse(evt.data) as TelemetryPayload)
        } catch (error) {
          console.error("WebSocket JSON parsing error:", error)
          console.error("Received data:", evt.data)
        }
      }

      ws.onerror = () => {
        if (!active) return
        // Do not immediately flip to error, let onclose handle it or only set error after quiet attempts exceed limit
        if (attemptCount >= MAX_QUIET_ATTEMPTS) {
          setStatus('error')
        }
      }

      ws.onclose = (event: CloseEvent) => {
        if (!active) return

        console.log('[WS] close code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean, 'url:', url)

        // Clear any existing timeout timers to prevent overlapping loops
        if (timer) {
          clearTimeout(timer)
          timer = null
        }

        attemptCount++
        
        // Quiet reconnection state: keep status as 'connecting' unless max quiet attempts is exceeded
        if (attemptCount > MAX_QUIET_ATTEMPTS) {
          setStatus('disconnected')
        } else {
          setStatus('connecting')
        }

        // Exponential backoff
        const currentDelay = reconnectDelay
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)

        timer = setTimeout(connect, currentDelay)
      }
    }

    setData(null)
    if (!url) {
      setStatus('disconnected')
      return () => {
        active = false
      }
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
