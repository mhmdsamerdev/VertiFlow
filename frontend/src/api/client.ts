// Base API URL — update via VITE_API_URL env var for production
export const BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : '/api')

if (!import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost') {
  console.warn('VITE_API_URL is not set. API calls will likely fail unless served from the same host.')
}

export function getBrowserId(): string {
  if (typeof window === 'undefined') return 'server'
  let bid = localStorage.getItem('vertiflow_browser_id')
  if (!bid) {
    // Generate a unique ID if none exists
    bid = `browser-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString(36)}`
    localStorage.setItem('vertiflow_browser_id', bid)
  }
  return bid
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const browserId = getBrowserId()
  const { headers, ...rest } = options
  let res: Response
  try {
    const url = new URL(`${BASE}${path}`, window.location.origin)
    url.searchParams.set('browser_id', browserId)

    res = await fetch(url.toString(), {
      ...rest,
      headers: { 
        'Content-Type': 'application/json',
        'X-Browser-ID': browserId,
        ...headers 
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(`Network request failed (${options.method ?? 'GET'} ${BASE}${path}): ${detail}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
