import React, { useMemo, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useZoneContext } from '../../context/ZoneContext'
import { useAnalytics } from '../../hooks/useAnalytics'
import { SensorReadings } from '../../types/telemetry'
import { TIME_RANGES, TimeRange } from '../../types/analytics'
import { SENSOR_META } from '../sensors/SensorCard'
import { SensorTrendsChart } from './SensorTrendsChart'
import { StatCards } from './StatCards'
import { ActuatorTimeline } from './ActuatorTimeline'
import { AlertHistoryChart, AlertBreakdownDonut } from './AlertCharts'
import { HarvestChart } from './HarvestChart'
import { MaintenanceTable } from './MaintenanceTable'

const ALL_SENSOR_KEYS: (keyof SensorReadings)[] = [
  'ph', 'ec', 'air_temp', 'humidity', 'soil_moisture', 'light_intensity', 'co2',
]

// ── Sensor selector dropdown ───────────────────────────────────────────────

interface SensorSelectorProps {
  visible:   Set<keyof SensorReadings>
  onChange:  (k: keyof SensorReadings) => void
}

function SensorSelector({ visible, onChange }: SensorSelectorProps) {
  const [open, setOpen] = useState(false)
  const count = visible.size

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 hover:text-zinc-200 transition-colors"
      >
        Sensors
        <span className="text-[10px] font-mono text-green-400">{count}/{ALL_SENSOR_KEYS.length}</span>
        <ChevronDown size={11} className={`text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-50 card shadow-xl shadow-black/60 p-2 w-44">
          {ALL_SENSOR_KEYS.map(k => {
            const { label, Icon } = SENSOR_META[k]
            const checked = visible.has(k)
            return (
              <label
                key={k}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(k)}
                  className="accent-green-500 w-3 h-3"
                />
                <Icon size={11} className="text-zinc-500 shrink-0" />
                <span className="text-[11px] text-zinc-300">{label}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="lp-section-title px-1">{title}</h3>
      {children}
    </div>
  )
}

// ── Main tab ───────────────────────────────────────────────────────────────

export function AnalyticsTab() {
  const { activeZone } = useZoneContext()

  const [range,   setRange]   = useState<TimeRange>(TIME_RANGES[2])   // default 24H
  const [visible, setVisible] = useState<Set<keyof SensorReadings>>(
    new Set(ALL_SENSOR_KEYS)
  )

  const data = useAnalytics(activeZone?.id ?? '', range)

  const longRange = range.hours >= 168

  const { fromMs, toMs } = useMemo(() => {
    const to   = Date.now()
    const from = to - range.hours * 3_600_000
    return { fromMs: from, toMs: to }
  }, [range])

  function toggleSensor(k: keyof SensorReadings) {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(k)) { if (next.size > 1) next.delete(k) }
      else next.add(k)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky control bar ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800 bg-zinc-950">
        {/* Time range pills */}
        <div className="flex items-center gap-1">
          {TIME_RANGES.map(tr => (
            <button
              key={tr.label}
              onClick={() => setRange(tr)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                range.label === tr.label
                  ? 'bg-green-500/15 text-green-400 ring-1 ring-inset ring-green-500/25'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-800 mx-1" />

        {/* Sensor selector */}
        <SensorSelector visible={visible} onChange={toggleSensor} />

        {/* Loading indicator */}
        {data.loading && (
          <Loader2 size={12} className="text-zinc-600 animate-spin ml-auto" />
        )}
        {data.error && (
          <span className="ml-auto text-[10px] text-red-400 font-mono">DB offline — no historical data</span>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

        {/* Row 1: Trends + Stat cards */}
        <div className="flex gap-4 min-h-0">

          {/* Sensor trend charts */}
          <div className="flex-1 min-w-0 card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <span className="lp-section-title">Sensor Trends</span>
              <span className="text-[10px] text-zinc-600 font-mono">{data.readings.length} buckets</span>
            </div>
            <SensorTrendsChart
              data={data.readings}
              recipe={activeZone?.recipe}
              longRange={longRange}
              visible={visible}
            />
          </div>

          {/* Stat cards */}
          <div className="w-52 shrink-0 flex flex-col gap-1">
            <span className="lp-section-title px-1 mb-1">Period Stats</span>
            <StatCards stats={data.stats} recipe={activeZone?.recipe} visible={visible} />
          </div>
        </div>

        {/* Row 2: Actuator timeline */}
        <Section title="Actuator Activity">
          <div className="card px-4 py-3">
            <ActuatorTimeline
              actions={data.actions}
              fromMs={fromMs}
              toMs={toMs}
              longRange={longRange}
            />
          </div>
        </Section>

        {/* Row 3: Alert charts */}
        <Section title="Alert History">
          <div className="flex gap-4">
            <div className="flex-1 card px-4 py-3">
              <p className="text-[10px] text-zinc-600 mb-2">Alerts per day</p>
              <AlertHistoryChart data={data.alerts.by_day} />
            </div>
            <div className="w-44 shrink-0 card px-4 py-3 flex flex-col">
              <p className="text-[10px] text-zinc-600 mb-3">Breakdown</p>
              <AlertBreakdownDonut breakdown={data.alerts.breakdown} />
            </div>
          </div>
        </Section>

        {/* Row 4: Harvest chart (7D / 30D only) */}
        {longRange && (
          <Section title="Harvest Records">
            <div className="card px-4 py-3">
              <p className="text-[10px] text-zinc-600 mb-2">Quantity harvested (kg) by date</p>
              <HarvestChart data={data.harvests} />
            </div>
          </Section>
        )}

        {/* Row 5: Maintenance log */}
        <Section title="Maintenance Log">
          <MaintenanceTable data={data.maintenance} />
        </Section>

      </div>
    </div>
  )
}
