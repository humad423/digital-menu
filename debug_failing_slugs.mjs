import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspect() {
  const failingSlugs = ['pizza-n', 'shawarma-s', 'burger-k']
  const workingSlugs = ['alasil', 'alsham-chayirova', 'shawarma-sultanbeyli']

  console.log("=== FAILING RESTAURANTS ===")
  const { data: failRes } = await supabase.from('restaurants').select('*').in('slug', failingSlugs)
  console.log(failRes)

  console.log("=== WORKING RESTAURANTS ===")
  const { data: workRes } = await supabase.from('restaurants').select('*').in('slug', workingSlugs)
  console.log(workRes)
}

inspect()
