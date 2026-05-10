import { useEffect, useRef, useState } from 'react'
import { ActuatorId } from '../types/telemetry'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export const CONFIRM_MS  = 4_000
export const FEEDBACK_MS = 2_000

export type CommandPhase = 'idle' | 'confirming' | 'pending' | 'confirmed' | 'error'

export interface CommandState {
  phase:        CommandPhase
  requestedAt?: number
  error?:       string
}

export interface CommandParams {
  speed?:            number
  brightness?:       number
  color_spectrum?:   string
  duration_minutes?: number
  dose_amount?:      number
}

export type CommandMap = Record<ActuatorId, CommandState>

const ACTUATOR_IDS: ActuatorId[] = [
  'cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster',
]
const IDLE: CommandState = { phase: 'idle' }

export function useControls(zoneId: string) {
  const [commands, setCommands] = useState<CommandMap>(
    () => Object.fromEntries(ACTUATOR_IDS.map(id => [id, IDLE])) as CommandMap
  )
  const timers = useRef<Partial<Record<ActuatorId, ReturnType<typeof setTimeout>>>>({})

  function clearTimer(id: ActuatorId) {
    const t = timers.current[id]
    if (t !== undefined) { clearTimeout(t); delete timers.current[id] }
  }

  function setCmd(id: ActuatorId, s: CommandState) {
    setCommands(prev => ({ ...prev, [id]: s }))
  }

  useEffect(() => {
    ACTUATOR_IDS.forEach(id => clearTimer(id))
    setCommands(Object.fromEntries(ACTUATOR_IDS.map(id => [id, IDLE])) as CommandMap)
  }, [zoneId])

  useEffect(() => () => {
    Object.values(timers.current).forEach(t => t && clearTimeout(t))
  }, [])

  async function _send(
    id: ActuatorId,
    state: boolean,
    mode: 'manual' | 'auto' = 'manual',
    params?: CommandParams,
    autoOffMinutes?: number,
  ): Promise<string | undefined> {
    const body: Record<string, unknown> = { actuator: id, state, mode }
    if (params)         body.params           = params
    if (autoOffMinutes) body.auto_off_minutes = autoOffMinutes
    const res = await fetch(`${API_BASE}/controls/${zoneId}/command`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.detail ?? `HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.command_id
  }

  async function _pollStatus(id: ActuatorId, commandId: string) {
    const start = Date.now()
    const timeout = 30_000 // 30 seconds timeout for acknowledgment
    
    while (Date.now() - start < timeout) {
      try {
        const res = await fetch(`${API_BASE}/controls/${zoneId}/status/${commandId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'completed') {
            _onSuccess(id)
            return
          }
        }
      } catch (e) {
        console.error('Status poll error:', e)
      }
      await new Promise(r => setTimeout(r, 1000)) // Poll every 1s
    }
    _onError(id, new Error('Command timed out waiting for device acknowledgment'))
  }

  function _onSuccess(id: ActuatorId) {
    setCmd(id, { phase: 'confirmed' })
    timers.current[id] = setTimeout(() => setCmd(id, IDLE), FEEDBACK_MS)
  }

  function _onError(id: ActuatorId, err: unknown) {
    setCmd(id, { phase: 'error', error: err instanceof Error ? err.message : 'Command failed' })
    timers.current[id] = setTimeout(() => setCmd(id, IDLE), 3_000)
  }

  function requestToggle(id: ActuatorId) {
    clearTimer(id)
    setCmd(id, { phase: 'confirming', requestedAt: Date.now() })
    timers.current[id] = setTimeout(() => setCmd(id, IDLE), CONFIRM_MS)
  }

  function cancelToggle(id: ActuatorId) {
    clearTimer(id)
    setCmd(id, IDLE)
  }

  async function confirmToggle(
    id: ActuatorId,
    newState: boolean,
    params?: CommandParams,
    autoOffMinutes?: number,
  ) {
    clearTimer(id)
    setCmd(id, { phase: 'pending' })
    try {
      const commandId = await _send(id, newState, 'manual', params, autoOffMinutes)
      if (commandId) {
        _pollStatus(id, commandId)
      } else {
        _onSuccess(id)
      }
    } catch (err) { _onError(id, err) }
  }

  async function sendImmediate(
    id: ActuatorId,
    state: boolean,
    params?: CommandParams,
  ) {
    clearTimer(id)
    setCmd(id, { phase: 'pending' })
    try {
      const commandId = await _send(id, state, 'manual', params)
      if (commandId) {
        _pollStatus(id, commandId)
      } else {
        _onSuccess(id)
      }
    } catch (err) { _onError(id, err) }
  }

  async function setAutoMode(id: ActuatorId, currentState: boolean) {
    clearTimer(id)
    setCmd(id, { phase: 'pending' })
    try {
      const commandId = await _send(id, currentState, 'auto')
      if (commandId) {
        _pollStatus(id, commandId)
      } else {
        _onSuccess(id)
      }
    } catch (err) { _onError(id, err) }
  }

  async function emergencyStop() {
    ACTUATOR_IDS.forEach(id => { clearTimer(id); setCmd(id, { phase: 'pending' }) })
    try {
      const res = await fetch(`${API_BASE}/controls/${zoneId}/emergency-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      ACTUATOR_IDS.forEach(id => {
        setCmd(id, { phase: 'confirmed' })
        timers.current[id] = setTimeout(() => setCmd(id, IDLE), FEEDBACK_MS)
      })
    } catch {
      ACTUATOR_IDS.forEach(id => {
        setCmd(id, { phase: 'error', error: 'Emergency stop failed' })
        timers.current[id] = setTimeout(() => setCmd(id, IDLE), 3_000)
      })
    }
  }

  return { commands, requestToggle, cancelToggle, confirmToggle, sendImmediate, setAutoMode, emergencyStop }
}
