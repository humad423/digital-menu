import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function compare() {
  const { data: alasil } = await supabase.from('restaurants').select('*').eq('slug', 'alasil').single()
  const { data: burgerk } = await supabase.from('restaurants').select('*').eq('slug', 'burger-k').single()

  console.log("=== ALASIL ===")
  console.log(alasil)

  console.log("=== BURGER-K ===")
  console.log(burgerk)
}

compare()
