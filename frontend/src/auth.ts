import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxsoaztvmwlsfpykvjog.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c29henR2bXdsc2ZweWt2am9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTk4OTUsImV4cCI6MjA5Mzk3NTg5NX0.-wGPZGc_MEOrSo2UaHL5gpwXHpH4zCN89DqcM5xvNDw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let cachedToken: string | null = null

// Load initial token synchronously from localStorage to prevent latency on first request
if (typeof window !== 'undefined') {
  try {
    const projectRef = supabaseUrl.split('//')[1]?.split('.')[0]
    const storageKey = `sb-${projectRef}-auth-token`
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      cachedToken = parsed?.access_token || null
      console.log('[Auth] Initialized cached token from localStorage. Length:', cachedToken ? cachedToken.length : 0)
    }
  } catch (e) {
    console.warn('[Auth] Failed to parse cached Supabase token from localStorage:', e)
  }
}

// Sync the token in real-time on all auth state events
supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token || null
  console.log('[Auth] onAuthStateChange synced cached token. Event:', _event, 'Length:', cachedToken ? cachedToken.length : 0)
})

export function getCachedToken(): string | null {
  return cachedToken
}
