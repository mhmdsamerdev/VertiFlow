import { useCallback, useEffect, useRef, useState } from 'react'
import { TimeRange, AnalyticsData, AlertsData, HarvestsData } from '../types/analytics'

const API = `${import.meta.env.VITE_API_URL ?? '/api'}/analytics`

const EMPTY_ALERTS: AlertsData    = { by_day: [], breakdown: { critical: 0, warning: 0, info: 0 }, recent: [] }
const EMPTY_HARVESTS: HarvestsData = { buckets: [], crop_types: [] }

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

function buildParams(zoneId: string, range: TimeRange): URLSearchParams {
  const to   = new Date()
  const from = new Date(to.getTime() - range.hours * 3_600_000)
  return new URLSearchParams({
    zone_id: zoneId,
    from_ts: from.toISOString(),
    to_ts:   to.toISOString(),
    bucket:  range.bucket,
  })
}

export function useAnalytics(zoneId: string, range: TimeRange): AnalyticsData {
  const [data, setData]       = useState<AnalyticsData>({
    readings: [], stats: {}, actions: [], alerts: EMPTY_ALERTS,
    harvests: EMPTY_HARVESTS, maintenance: [], loading: true, error: null,
  })

  const abortRef = useRef<AbortController | null>(null)

  const fetch_all = useCallback(async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setData(d => ({ ...d, loading: true, error: null }))

    try {
      const p = buildParams(zoneId, range).toString()

      const [readings, stats, actions, alerts, harvests, maintenance] = await Promise.all([
        fetchJSON<unknown[]>(`${API}/readings?${p}`),
        fetchJSON<Record<string, unknown>>(`${API}/stats?${p}`),
        fetchJSON<unknown[]>(`${API}/actions?${p}`),
        fetchJSON<AlertsData>(`${API}/alerts?${p}`),
        fetchJSON<HarvestsData>(`${API}/harvests?${p}`),
        fetchJSON<unknown[]>(`${API}/maintenance?${p}`),
      ])

      if (ctrl.signal.aborted) return

      setData({
        readings:    readings    as AnalyticsData['readings'],
        stats:       stats       as AnalyticsData['stats'],
        actions:     actions     as AnalyticsData['actions'],
        alerts:      alerts      as AlertsData,
        harvests:    harvests    as HarvestsData,
        maintenance: maintenance as AnalyticsData['maintenance'],
        loading: false,
        error:   null,
      })
    } catch (err) {
      if (ctrl.signal.aborted) return
      setData(d => ({ ...d, loading: false, error: String(err) }))
    }
  }, [zoneId, range])

  useEffect(() => {
    fetch_all()
    const id = setInterval(fetch_all, 30_000)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [fetch_all])

  return data
}
