import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<any>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {}
        },
      },
    }
  )
}
