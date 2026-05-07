import React from 'react'
import {
  Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { HarvestsData } from '../../types/analytics'

const CROP_PALETTE = [
  '#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#eab308', '#06b6d4', '#ec4899',
]

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface Props { data: HarvestsData }

export function HarvestChart({ data }: Props) {
  if (data.buckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-zinc-600 text-xs">
        No harvest records in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data.buckets} margin={{ top: 4, right: 4, bottom: 0, left: -18 }} barSize={16} barGap={2}>
        <XAxis
          dataKey="date" tickFormatter={fmtDate}
          tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false}
          unit=" kg"
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload) return null
            return (
              <div className="card px-2.5 py-2 text-[10px] shadow-xl space-y-0.5">
                <p className="text-zinc-500 mb-1">{fmtDate(label as string)}</p>
                {payload.map(p => (
                  <p key={p.dataKey as string} style={{ color: p.color as string }}>
                    {p.dataKey}: {(p.value as number).toFixed(2)} kg
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#71717a' }}
          iconType="circle" iconSize={7}
        />
        {data.crop_types.map((crop, i) => (
          <Bar
            key={crop}
            dataKey={crop}
            stackId="h"
            fill={CROP_PALETTE[i % CROP_PALETTE.length]}
            radius={i === data.crop_types.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
