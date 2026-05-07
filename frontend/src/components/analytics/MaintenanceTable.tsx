import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { MaintenanceItem } from '../../types/analytics'

const TASK_COLORS: Record<string, string> = {
  cleaning:     'bg-sky-500/10 text-sky-400 ring-sky-500/20',
  repair:       'bg-red-500/10  text-red-400  ring-red-500/20',
  calibration:  'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  replacement:  'bg-amber-400/10 text-amber-400 ring-amber-400/20',
  inspection:   'bg-green-500/10 text-green-400 ring-green-500/20',
}

type SortKey = 'time' | 'task_type' | 'performed_by' | 'cost' | 'duration_minutes'

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

interface SortIconProps { field: SortKey; active: SortKey; dir: 'asc' | 'desc' }
function SortIcon({ field, active, dir }: SortIconProps) {
  if (field !== active) return <ChevronsUpDown size={10} className="text-zinc-700" />
  return dir === 'asc'
    ? <ChevronUp   size={10} className="text-zinc-400" />
    : <ChevronDown size={10} className="text-zinc-400" />
}

interface Props { data: MaintenanceItem[] }

export function MaintenanceTable({ data }: Props) {
  const [sort, setSort]   = useState<SortKey>('time')
  const [dir,  setDir]    = useState<'asc' | 'desc'>('desc')
  const [filter, setFilter] = useState('')

  function toggleSort(key: SortKey) {
    if (sort === key) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(key); setDir('desc') }
  }

  const rows = useMemo(() => {
    const q = filter.toLowerCase()
    const filtered = q
      ? data.filter(r =>
          r.description.toLowerCase().includes(q) ||
          r.task_type.toLowerCase().includes(q) ||
          r.performed_by.toLowerCase().includes(q) ||
          (r.device_id ?? '').toLowerCase().includes(q)
        )
      : data

    return [...filtered].sort((a, b) => {
      const av = a[sort] ?? ''
      const bv = b[sort] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return dir === 'asc' ? cmp : -cmp
    })
  }, [data, sort, dir, filter])

  const TH = ({ label, field }: { label: string; field: SortKey }) => (
    <th
      onClick={() => toggleSort(field)}
      className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wide cursor-pointer select-none hover:text-zinc-300 transition-colors whitespace-nowrap"
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon field={field} active={sort} dir={dir} />
      </span>
    </th>
  )

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-16 text-zinc-600 text-xs">
        No maintenance records in this period
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Filter */}
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter records…"
        className="w-64 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900 border-b border-zinc-800">
            <tr>
              <TH label="Date"     field="time"             />
              <TH label="Type"     field="task_type"        />
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Device</th>
              <TH label="Who"      field="performed_by"     />
              <TH label="Cost"     field="cost"             />
              <TH label="Duration" field="duration_minutes" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-zinc-600">No matches</td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-3 py-2 text-zinc-500 font-mono whitespace-nowrap">{fmtDateTime(r.time)}</td>
                  <td className="px-3 py-2">
                    <span className={`badge ring-1 ring-inset ${TASK_COLORS[r.task_type] ?? 'badge-neutral'}`}>
                      {r.task_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-300 max-w-xs truncate">{r.description}</td>
                  <td className="px-3 py-2 text-zinc-500 font-mono">{r.device_id ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.performed_by}</td>
                  <td className="px-3 py-2 text-zinc-400 font-mono">
                    {r.cost != null ? `$${r.cost.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 font-mono">
                    {r.duration_minutes != null ? `${r.duration_minutes} min` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
