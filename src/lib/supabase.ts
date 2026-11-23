import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// The anon key is safe to ship in the app: Row Level Security in
// supabase/schema.sql is what keeps each user's data private.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Where email links (sign-up confirmation, password reset) should land. */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://rentbook-one.vercel.app').replace(/\/$/, '')
export const AUTH_REDIRECT = `${SITE_URL}/app`
