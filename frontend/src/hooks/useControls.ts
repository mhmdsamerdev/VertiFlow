import { useEffect, useRef, useState } from 'react'
import { ActuatorId, ActuatorMode } from '../types/telemetry'

const API_BASE = 'http://localhost:8000'

export const CONFIRM_MS  = 4_000
export const FEEDBACK_MS = 2_000

export type CommandPhase = 'idle' | 'confirming' | 'pending' | 'confirmed' | 'error'

export interface CommandState {
  phase:        CommandPhase
  requestedAt?: number
  error?:       string
}

export type CommandMap = Record<ActuatorId, CommandState>

const ACTUATOR_IDS: ActuatorId[] = ['oxygen_pump', 'led_array', 'nutrient_doser']
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

  // Reset state when zone changes
  useEffect(() => {
    ACTUATOR_IDS.forEach(id => clearTimer(id))
    setCommands(Object.fromEntries(ACTUATOR_IDS.map(id => [id, IDLE])) as CommandMap)
  }, [zoneId])

  // Cleanup on unmount
  useEffect(() => () => {
    Object.values(timers.current).forEach(t => t && clearTimeout(t))
  }, [])

  function requestToggle(id: ActuatorId) {
    clearTimer(id)
    setCmd(id, { phase: 'confirming', requestedAt: Date.now() })
    timers.current[id] = setTimeout(() => setCmd(id, IDLE), CONFIRM_MS)
  }

  function cancelToggle(id: ActuatorId) {
    clearTimer(id)
    setCmd(id, IDLE)
  }

  async function confirmToggle(id: ActuatorId, newState: boolean, mode: ActuatorMode = 'manual') {
    clearTimer(id)
    setCmd(id, { phase: 'pending' })
    try {
      const res = await fetch(`${API_BASE}/controls/${zoneId}/command`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ actuator: id, state: newState, mode }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCmd(id, { phase: 'confirmed' })
      timers.current[id] = setTimeout(() => setCmd(id, IDLE), FEEDBACK_MS)
    } catch (err) {
      setCmd(id, { phase: 'error', error: err instanceof Error ? err.message : 'Command failed' })
      timers.current[id] = setTimeout(() => setCmd(id, IDLE), 3_000)
    }
  }

  async function setAutoMode(id: ActuatorId, currentState: boolean) {
    clearTimer(id)
    setCmd(id, { phase: 'pending' })
    try {
      const res = await fetch(`${API_BASE}/controls/${zoneId}/command`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ actuator: id, state: currentState, mode: 'auto' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCmd(id, { phase: 'confirmed' })
      timers.current[id] = setTimeout(() => setCmd(id, IDLE), FEEDBACK_MS)
    } catch (err) {
      setCmd(id, { phase: 'error', error: err instanceof Error ? err.message : 'Command failed' })
      timers.current[id] = setTimeout(() => setCmd(id, IDLE), 3_000)
    }
  }

  return { commands, requestToggle, cancelToggle, confirmToggle, setAutoMode }
}
