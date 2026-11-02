import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<any>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  })
}

/**
 * Public Supabase Client for uncached public pages (Menu, Homepage, Offers, Reviews).
 * Avoids invoking cookies() so Next.js can cache responses at Vercel's Edge CDN,
 * reducing Vercel Fast Origin Transfer usage by ~95%.
 */
export function createPublicClient() {
  return createSupabaseClient<any>(supabaseUrl, supabaseAnonKey)
}
