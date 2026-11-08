import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Null until .env.local is filled in, so the app still runs without a backend.
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
