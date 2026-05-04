import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionStatus, TelemetryPayload } from '../types/telemetry'

const WS_URL = 'ws://localhost:8000/ws/telemetry'
const RECONNECT_DELAY_MS = 3_000

export interface UseWebSocketReturn {
  status: ConnectionStatus
  data: TelemetryPayload | null
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [data, setData] = useState<TelemetryPayload | null>(null)

  const wsRef      = useRef<WebSocket | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    clearTimer()
    setStatus('connecting')

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) setStatus('connected')
    }

    ws.onmessage = (evt: MessageEvent) => {
      if (!mountedRef.current) return
      try {
        setData(JSON.parse(evt.data) as TelemetryPayload)
      } catch {
        // malformed frame — ignore
      }
    }

    ws.onerror = () => {
      if (mountedRef.current) setStatus('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('disconnected')
      timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimer()
      wsRef.current?.close()
    }
  }, [connect])

  return { status, data }
}
