import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xxsoaztvmwlsfpykvjog.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4c29henR2bXdsc2ZweWt2am9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTk4OTUsImV4cCI6MjA5Mzk3NTg5NX0.-wGPZGc_MEOrSo2UaHL5gpwXHpH4zCN89DqcM5xvNDw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
