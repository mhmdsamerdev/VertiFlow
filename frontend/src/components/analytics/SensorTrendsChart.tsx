import React, { useState } from 'react'
import {
  Area, AreaChart, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { SensorReadings } from '../../types/telemetry'
import { ReadingBucket } from '../../types/analytics'
import { SENSOR_META } from '../sensors/SensorCard'
import { GoldenState } from '../../types/telemetry'

// ── Per-sensor accent colors ───────────────────────────────────────────────

export const SENSOR_COLORS: Record<keyof SensorReadings, string> = {
  ph:              '#22c55e',
  ec:              '#3b82f6',
  air_temp:        '#f97316',
  humidity:        '#06b6d4',
  soil_moisture:   '#8b5cf6',
  light_intensity: '#eab308',
  co2:             '#94a3b8',
}

const SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity', 'co2',
]

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface MiniChartProps {
  sensorKey: keyof SensorReadings
  data:      ReadingBucket[]
  recipe?:   GoldenState
  longRange: boolean
}

function MiniChart({ sensorKey, data, recipe, longRange }: MiniChartProps) {
  const meta    = SENSOR_META[sensorKey]
  const color   = SENSOR_COLORS[sensorKey]
  const thresh  = recipe?.[sensorKey]
  const { Icon } = meta

  const chartData = data.map(d => ({
    ts:  d.ts,
    val: d[sensorKey] != null ? Number((d[sensorKey] as number).toFixed(meta.decimals)) : null,
  }))

  const lastVal = [...chartData].reverse().find((d: { ts: string; val: number | null }) => d.val != null)?.val ?? null

  return (
    <div className="flex items-stretch gap-3 px-4 py-2 border-b border-zinc-800/60 last:border-0">

      {/* Sensor label */}
      <div className="flex flex-col justify-center gap-0.5 w-36 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <Icon size={11} className="text-zinc-500" />
          <span className="text-[11px] font-medium text-zinc-400">{meta.label}</span>
        </div>
        {lastVal != null && (
          <span className="text-xs font-mono tabular-nums text-zinc-300 pl-[14px]">
            {lastVal.toFixed(meta.decimals)}{' '}
            <span className="text-zinc-600 text-[10px]">{meta.unit}</span>
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <defs>
              <linearGradient id={`ag-${sensorKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0}    />
              </linearGradient>
            </defs>

            {/* Warn band (green = acceptable) */}
            {thresh && (
              <ReferenceArea y1={thresh.warnMin} y2={thresh.warnMax} fill={color} fillOpacity={0.06} />
            )}
            {/* Target line */}
            {thresh && (
              <ReferenceLine y={thresh.target} stroke={color} strokeOpacity={0.4} strokeDasharray="3 3" />
            )}

            <XAxis
              dataKey="ts"
              tickFormatter={longRange ? fmtDate : fmtTime}
              tick={{ fill: '#52525b', fontSize: 9 }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={['auto', 'auto']} />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const v = payload[0].value as number | null
                const t = payload[0].payload.ts as string
                return (
                  <div className="card px-2 py-1 text-[10px] shadow-xl">
                    <span className="text-zinc-500 block">{longRange ? fmtDate(t) : fmtTime(t)}</span>
                    <span className="font-mono" style={{ color }}>
                      {v != null ? `${v.toFixed(meta.decimals)} ${meta.unit}` : '—'}
                    </span>
                  </div>
                )
              }}
            />

            <Area
              type="monotone" dataKey="val"
              stroke={color} strokeWidth={1.5}
              fill={`url(#ag-${sensorKey})`}
              dot={false} isAnimationActive={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface Props {
  data:      ReadingBucket[]
  recipe?:   GoldenState
  longRange: boolean
  visible:   Set<keyof SensorReadings>
}

export function SensorTrendsChart({ data, recipe, longRange, visible }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-zinc-600 text-xs">
        No readings yet — data populates as the WebSocket streams.
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {SENSOR_KEYS.filter(k => visible.has(k)).map(k => (
        <MiniChart key={k} sensorKey={k} data={data} recipe={recipe} longRange={longRange} />
      ))}
    </div>
  )
}
