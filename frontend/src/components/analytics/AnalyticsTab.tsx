import React, { useMemo, useState } from 'react'
import { ChevronDown, FileDown, Loader2 } from 'lucide-react'
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

  function handleGenerateReport() {
    const selectedSensors = ALL_SENSOR_KEYS.filter(k => visible.has(k))
    const generatedAt = new Date()
    const zoneName = activeZone?.name ?? 'Unknown Zone'

    const statRows = selectedSensors.map(sensorKey => {
      const stat = data.stats[sensorKey]
      const label = SENSOR_META[sensorKey].label
      const unit = SENSOR_META[sensorKey].unit
      if (!stat) {
        return `<tr><td>${escapeHtml(label)}</td><td colspan="3" class="muted">No data</td></tr>`
      }
      return `
        <tr>
          <td>${escapeHtml(label)}</td>
          <td>${stat.avg.toFixed(2)} ${escapeHtml(unit)}</td>
          <td>${stat.min.toFixed(2)} ${escapeHtml(unit)}</td>
          <td>${stat.max.toFixed(2)} ${escapeHtml(unit)}</td>
        </tr>
      `
    }).join('')

    const alertBreakdownRows = ['critical', 'warning', 'info'].map(level => `
      <tr><td>${level}</td><td>${data.alerts.breakdown[level as keyof typeof data.alerts.breakdown]}</td></tr>
    `).join('')

    const actionRows = data.actions.slice(0, 20).map(action => `
      <tr>
        <td>${new Date(action.time).toLocaleString()}</td>
        <td>${escapeHtml(action.actuator_id)}</td>
        <td>${escapeHtml(action.action)}</td>
        <td>${escapeHtml(action.mode)}</td>
        <td>${escapeHtml(action.triggered_by)}</td>
      </tr>
    `).join('')

    const harvestRows = data.harvests.buckets.map(bucket => {
      const date = typeof bucket.date === 'string' ? bucket.date : ''
      const values = data.harvests.crop_types
        .map(crop => {
          const raw = bucket[crop]
          if (typeof raw === 'number') return `${raw.toFixed(2)} kg`
          if (typeof raw === 'string') return raw
          return '—'
        })
        .join('</td><td>')
      return `<tr><td>${escapeHtml(date)}</td><td>${values}</td></tr>`
    }).join('')

    const reportHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VertiFlow Analytics Report</title>
  <style>
    body { font-family: Inter, Arial, sans-serif; background: #0a0a0a; color: #e4e4e7; margin: 0; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 28px; }
    .header { border: 1px solid #27272a; border-radius: 12px; padding: 18px; background: #111113; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    h2 { margin: 0 0 12px; font-size: 14px; color: #a1a1aa; text-transform: uppercase; letter-spacing: .08em; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
    .card { border: 1px solid #27272a; border-radius: 12px; padding: 14px; background: #111113; }
    .meta { color: #a1a1aa; font-size: 13px; margin: 2px 0; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chip { border: 1px solid #3f3f46; color: #d4d4d8; border-radius: 999px; padding: 2px 8px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #27272a; padding: 8px 6px; text-align: left; vertical-align: top; }
    th { color: #a1a1aa; font-weight: 600; }
    .muted { color: #71717a; }
    @media print { body { background: #fff; color: #111; } .card, .header { background: #fff; border-color: #ddd; } th, td { border-color: #eee; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <h1>VertiFlow Analytics Report</h1>
      <p class="meta"><strong>Zone:</strong> ${escapeHtml(zoneName)}</p>
      <p class="meta"><strong>Time range:</strong> Last ${range.label} (${range.bucket} buckets)</p>
      <p class="meta"><strong>Generated:</strong> ${generatedAt.toLocaleString()}</p>
      <div class="chips">
        ${selectedSensors.map(k => `<span class="chip">${escapeHtml(SENSOR_META[k].label)}</span>`).join('')}
      </div>
    </div>
    <div class="grid">
      <div class="card">
        <h2>Sensor Statistics</h2>
        <table>
          <thead><tr><th>Sensor</th><th>Average</th><th>Min</th><th>Max</th></tr></thead>
          <tbody>${statRows || '<tr><td colspan="4" class="muted">No sensor stats available.</td></tr>'}</tbody>
        </table>
      </div>
      <div class="card">
        <h2>Alert Summary</h2>
        <table>
          <thead><tr><th>Severity</th><th>Count</th></tr></thead>
          <tbody>${alertBreakdownRows}</tbody>
        </table>
      </div>
    </div>
    <div class="card" style="margin-top: 14px;">
      <h2>Recent Actuator Activity</h2>
      <table>
        <thead><tr><th>Time</th><th>Actuator</th><th>Action</th><th>Mode</th><th>Triggered By</th></tr></thead>
        <tbody>${actionRows || '<tr><td colspan="5" class="muted">No actuator activity in selected range.</td></tr>'}</tbody>
      </table>
    </div>
    ${longRange ? `
    <div class="card" style="margin-top: 14px;">
      <h2>Harvest Records</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            ${data.harvests.crop_types.map(crop => `<th>${escapeHtml(crop)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${harvestRows || `<tr><td colspan="${Math.max(2, data.harvests.crop_types.length + 1)}" class="muted">No harvest records in selected range.</td></tr>`}
        </tbody>
      </table>
    </div>
    ` : ''}
  </div>
</body>
</html>
    `

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const safeZone = zoneName.replace(/\s+/g, '_')
    anchor.href = url
    anchor.download = `vertiflow_report_${safeZone}_${range.label}_${generatedAt.toISOString().slice(0, 10)}.html`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
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

        <button
          onClick={handleGenerateReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 hover:text-zinc-100 transition-colors"
        >
          <FileDown size={12} />
          Generate Report
        </button>

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
