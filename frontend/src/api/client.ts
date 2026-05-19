import { supabase, getCachedToken } from '../auth'

// Base API URL — update via VITE_API_URL env var for production
export const BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : 'https://vertiflow.onrender.com/api')

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

  console.log(`[apiFetch] Invoked for path: "${path}" with BASE: "${BASE}"`, {
    timeout,
    skipRetry,
    method: rest.method ?? 'GET'
  })

  const maxAttempts = skipRetry ? 1 : 15
  let attempt = 0
  let delay = 2000
  const backoffFactor = 1.2
  const maxDelay = 5000

  const url = new URL(`${BASE}${path}`, window.location.origin)
  console.log(`[apiFetch] Target URL resolved to: "${url.toString()}"`)

  while (attempt < maxAttempts) {
    attempt++
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.warn(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Local abort timeout of ${timeout}ms triggered.`)
      controller.abort()
    }, timeout)

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

      console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Retrieving cached Supabase token...`)
      const token = getCachedToken()
      console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Cached Supabase token retrieved. Length: ${token ? token.length : 0}`)

      const authHeaders: Record<string, string> = {}
      if (token) {
        authHeaders['Authorization'] = `Bearer ${token}`
      }

      console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Initiating fetch request to ${url.toString()}...`)
      const res = await fetch(url.toString(), {
        ...rest,
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers 
        },
      })

      console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Fetch completed. HTTP Status: ${res.status} ${res.statusText}`)
      clearTimeout(timeoutId)

      if (!res.ok) {
        const isRetryableStatus = [502, 503, 504].includes(res.status)
        const responseBody = await res.text().catch(() => '')
        console.warn(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] HTTP Error response body (first 500 chars):`, responseBody.slice(0, 500))

        if (isRetryableStatus && attempt < maxAttempts) {
          console.warn(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Received retryable status ${res.status}. Retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
          delay = Math.min(delay * backoffFactor, maxDelay)
          continue
        }
        
        throw new Error(`API ${options.method ?? 'GET'} ${path} → ${res.status}: ${responseBody || res.statusText}`)
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

      if (res.status === 204) {
        console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Response status 204. Returning undefined.`)
        return undefined as T
      }

      const rawText = await res.text()
      console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Raw response body (first 500 chars):`, rawText.slice(0, 500))
      
      try {
        const parsed = JSON.parse(rawText) as T
        console.log(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Successfully parsed JSON.`)
        return parsed
      } catch (parseErr: any) {
        console.error(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] JSON parsing failed:`, parseErr.message)
        throw new Error(`JSON parsing failed for ${url.toString()}: ${parseErr.message}. Response was: ${rawText.slice(0, 200)}`)
      }

    } catch (err: any) {
      clearTimeout(timeoutId)

      const isTimeout = err instanceof DOMException && err.name === 'AbortError'
      const detail = isTimeout ? 'Request timed out' : (err instanceof Error ? err.message : String(err))
      const isRetryableError = isTimeout || err instanceof TypeError || detail.includes('Failed to fetch') || detail.includes('NetworkError')

      console.error(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Request caught error: ${detail}. isRetryable: ${isRetryableError}`)

      if (isRetryableError && attempt < maxAttempts) {
        console.warn(`[apiFetch] [Attempt ${attempt}/${maxAttempts}] Retrying in ${delay}ms...`)
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
