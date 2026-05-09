import React from 'react'
import {
  Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertsData } from '../../types/analytics'

const SEV_COLORS: Record<string, string> = {
  critical: '#ef4444',
  warning:  '#f59e0b',
  info:     '#3b82f6',
}

function fmtDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── Stacked bar chart ──────────────────────────────────────────────────────

interface BarProps { data: AlertsData['by_day'] }

export function AlertHistoryChart({ data }: BarProps) {
  const [isHovering, setIsHovering] = React.useState(false)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-600 text-xs">
        No alerts in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart 
        data={data} 
        margin={{ top: 4, right: 4, bottom: 0, left: -20 }} 
        barSize={14}
        onMouseLeave={() => setIsHovering(false)}
      >
        <XAxis
          dataKey="day" tickFormatter={fmtDay}
          tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: '#52525b', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          cursor={false}
          animationDuration={100}
          content={({ active, payload, label }) => {
            if (!active || !payload || !isHovering) return null
            return (
              <div className="card px-3 py-1.5 text-[10px] shadow-2xl border-zinc-700/50 bg-zinc-900/95 backdrop-blur-md">
                <p className="text-zinc-400 font-bold mb-1.5 border-b border-zinc-800 pb-1">{fmtDay(label as string)}</p>
                <div className="space-y-1">
                  {(['critical', 'warning', 'info'] as const).map(sev => {
                    const entry = payload.find(p => p.dataKey === sev)
                    if (!entry || !entry.value) return null
                    return (
                      <div key={sev} className="flex items-center justify-between gap-4">
                        <span className="capitalize" style={{ color: SEV_COLORS[sev] }}>{sev}</span>
                        <span className="font-mono text-zinc-300">{entry.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }}
        />
        {(['info', 'warning', 'critical'] as const).map(sev => (
          <Bar 
            key={sev} 
            dataKey={sev} 
            stackId="a" 
            fill={SEV_COLORS[sev]} 
            radius={sev === 'critical' ? [2, 2, 0, 0] : [0, 0, 0, 0]}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Donut breakdown ────────────────────────────────────────────────────────

interface DonutProps { breakdown: AlertsData['breakdown'] }

export function AlertBreakdownDonut({ breakdown }: DonutProps) {
  const total = breakdown.critical + breakdown.warning + breakdown.info
  const pieData = [
    { name: 'Critical', value: breakdown.critical, color: SEV_COLORS.critical },
    { name: 'Warning',  value: breakdown.warning,  color: SEV_COLORS.warning  },
    { name: 'Info',     value: breakdown.info,      color: SEV_COLORS.info     },
  ].filter(d => d.value > 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-1">
        <span className="text-2xl font-mono font-bold text-green-500">0</span>
        <span className="text-[10px] text-zinc-600">alerts</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Total label */}
      <div className="relative">
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              innerRadius={38}
              outerRadius={54}
              strokeWidth={0}
              paddingAngle={2}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const d = payload[0].payload as typeof pieData[0]
                return (
                  <div className="card px-2 py-1 text-[10px] shadow-xl">
                    <span style={{ color: d.color }}>{d.name}: {d.value}</span>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-mono font-bold text-zinc-100">{total}</span>
          <span className="text-[9px] text-zinc-600">total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1 w-full">
        {pieData.map(d => (
          <div key={d.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-[10px] text-zinc-500">{d.name}</span>
            <span className="text-[10px] font-mono text-zinc-300 ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
