import { supabase } from '../auth'

// Base API URL — update via VITE_API_URL env var for production
export const BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : '/api')

if (!import.meta.env.VITE_API_URL && window.location.hostname !== 'localhost') {
  console.warn('VITE_API_URL is not set. API calls will likely fail unless served from the same host.')
}

export interface ApiFetchOptions extends RequestInit {
  timeout?: number
  skipRetry?: boolean
}

export interface SpinUpStatus {
  isSpinningUp: boolean
  attempt: number
  maxAttempts: number
  message: string
}

type SpinUpListener = (status: SpinUpStatus) => void
const listeners = new Set<SpinUpListener>()

export function subscribeToSpinUp(listener: SpinUpListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let activeRequestsSpinningUpCount = 0

function updateSpinUpStatus(status: SpinUpStatus) {
  listeners.forEach(l => l(status))
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { headers, timeout = 12000, skipRetry = false, ...rest } = options

  const maxAttempts = skipRetry ? 1 : 15
  let attempt = 0
  let delay = 2000
  const backoffFactor = 1.2
  const maxDelay = 5000

  const url = new URL(`${BASE}${path}`, window.location.origin)

  while (attempt < maxAttempts) {
    attempt++
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      if (attempt > 1) {
        if (attempt === 2) {
          activeRequestsSpinningUpCount++
        }
        updateSpinUpStatus({
          isSpinningUp: true,
          attempt: attempt - 1,
          maxAttempts: maxAttempts - 1,
          message: `Backend server is spinning up. Waking up instance... (Attempt ${attempt - 1}/${maxAttempts - 1})`
        })
      }

      const session = (await supabase.auth.getSession()).data?.session
      const token = session?.access_token
      const authHeaders: Record<string, string> = {}
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(url.toString(), {
        ...rest,
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers 
        },
      })

      clearTimeout(timeoutId)

      if (!res.ok) {
        const isRetryableStatus = [502, 503, 504].includes(res.status)
        if (isRetryableStatus && attempt < maxAttempts) {
          console.warn(`API ${rest.method ?? 'GET'} ${path} returned ${res.status}. Retrying...`)
          await new Promise(r => setTimeout(r, delay))
          delay = Math.min(delay * backoffFactor, maxDelay)
          continue
        }
        
        const text = await res.text().catch(() => res.statusText)
        throw new Error(`API ${options.method ?? 'GET'} ${path} → ${res.status}: ${text}`)
      }

      if (attempt > 1) {
        activeRequestsSpinningUpCount = Math.max(0, activeRequestsSpinningUpCount - 1)
        if (activeRequestsSpinningUpCount === 0) {
          updateSpinUpStatus({
            isSpinningUp: false,
            attempt: 0,
            maxAttempts: maxAttempts - 1,
            message: 'Connected!'
          })
        }
      }

      if (res.status === 204) return undefined as T
      return res.json() as Promise<T>

    } catch (err) {
      clearTimeout(timeoutId)

      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const detail = isTimeout ? 'Request timed out' : (err instanceof Error ? err.message : String(err))
      const isRetryableError = isTimeout || err instanceof TypeError || detail.includes('Failed to fetch') || detail.includes('NetworkError')

      if (isRetryableError && attempt < maxAttempts) {
        console.warn(`API request failed: ${detail}. Retrying in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
        delay = Math.min(delay * backoffFactor, maxDelay)
        continue
      }

      if (attempt > 1) {
        activeRequestsSpinningUpCount = Math.max(0, activeRequestsSpinningUpCount - 1)
        if (activeRequestsSpinningUpCount === 0) {
          updateSpinUpStatus({
            isSpinningUp: false,
            attempt: 0,
            maxAttempts: maxAttempts - 1,
            message: 'Failed to connect.'
          })
        }
      }

      throw new Error(`Network request failed (${rest.method ?? 'GET'} ${BASE}${path}): ${detail}`)
    }
  }

  throw new Error(`Request exceeded maximum attempts of ${maxAttempts}`)
}
