import React, { useMemo } from 'react'
import { ActionEvent } from '../../types/analytics'

const ACTUATORS = ['cooling_fan', 'water_pump', 'heater', 'dehumidifier', 'led_lights', 'ph_adjuster'] as const
type ActuatorId = typeof ACTUATORS[number]

const ACTUATOR_LABELS: Record<ActuatorId, string> = {
  cooling_fan:  'Cooling Fan',
  water_pump:   'Water Pump',
  heater:       'Heater',
  dehumidifier: 'Dehumidifier',
  led_lights:   'LED Lights',
  ph_adjuster:  'pH Adjuster',
}

const ACTUATOR_COLORS: Record<ActuatorId, string> = {
  cooling_fan:  '#06b6d4',
  water_pump:   '#3b82f6',
  heater:       '#f97316',
  dehumidifier: '#8b5cf6',
  led_lights:   '#eab308',
  ph_adjuster:  '#22c55e',
}

interface Segment { left: number; width: number; triggered_by: string }

function buildSegments(
  events: ActionEvent[],
  actuator: ActuatorId,
  fromMs: number,
  toMs: number,
): Segment[] {
  const duration = toMs - fromMs || 1
  const relevant = events.filter(e => e.actuator_id === actuator)
  const segments: Segment[] = []
  let onTime: number | null = null
  let triggeredBy = 'system'

  for (const e of relevant) {
    const t = new Date(e.time).getTime()
    if (e.action === 'ON') { onTime = t; triggeredBy = e.triggered_by }
    else if (e.action === 'OFF' && onTime !== null) {
      const left  = Math.max(0, (onTime - fromMs) / duration * 100)
      const right = Math.min(100, (t     - fromMs) / duration * 100)
      if (right > left) segments.push({ left, width: right - left, triggered_by: triggeredBy })
      onTime = null
    }
  }
  if (onTime !== null) {
    const left  = Math.max(0, (onTime - fromMs) / duration * 100)
    const width = Math.min(100 - left, (toMs - onTime) / duration * 100)
    if (width > 0) segments.push({ left, width, triggered_by: triggeredBy })
  }
  return segments
}

function fmtLabel(d: Date, longRange: boolean): string {
  return longRange
    ? d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  actions:   ActionEvent[]
  fromMs:    number
  toMs:      number
  longRange: boolean
}

export function ActuatorTimeline({ actions, fromMs, toMs, longRange }: Props) {
  const tickCount = longRange ? 5 : 6
  const ticks = useMemo(() => {
    const step = (toMs - fromMs) / (tickCount - 1)
    return Array.from({ length: tickCount }, (_, i) => fromMs + step * i)
  }, [fromMs, toMs, tickCount])

  const hasAny = actions.length > 0

  return (
    <div className="flex flex-col gap-0">
      {/* Time axis */}
      <div className="flex ml-28 mb-1">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="text-[9px] text-zinc-600 font-mono"
            style={{ flex: i < ticks.length - 1 ? 1 : 0, textAlign: i === ticks.length - 1 ? 'right' : 'left' }}
          >
            {fmtLabel(new Date(t), longRange)}
          </span>
        ))}
      </div>

      {/* Actuator rows */}
      {ACTUATORS.map(act => {
        const segments  = buildSegments(actions, act, fromMs, toMs)
        const color     = ACTUATOR_COLORS[act]

        return (
          <div key={act} className="flex items-center gap-2 h-7 border-b border-zinc-800/50 last:border-0">
            {/* Label */}
            <span className="w-28 shrink-0 text-[10px] text-zinc-500 text-right pr-2 truncate">
              {ACTUATOR_LABELS[act]}
            </span>

            {/* Track */}
            <div className="relative flex-1 h-3 bg-zinc-800/60 rounded-sm overflow-hidden">
              {!hasAny && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] text-zinc-700">no events</span>
                </div>
              )}
              {segments.map((seg, i) => (
                <div
                  key={i}
                  title={`${ACTUATOR_LABELS[act]} — ${seg.triggered_by}`}
                  className="absolute top-0 h-full rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-default"
                  style={{ left: `${seg.left}%`, width: `${seg.width}%`, backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
