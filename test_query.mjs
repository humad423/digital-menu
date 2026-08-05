import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testQuery() {
  console.log("Testing basic select('*')...")
  const { data: basic, error: basicErr } = await supabase.from('restaurants').select('*')
  console.log("Basic count:", basic?.length, "Error:", basicErr)

  console.log("\nTesting complex select with relations...")
  const { data: complex, error: complexErr } = await supabase
    .from('restaurants')
    .select('*, restaurant_platform_categories(platform_category_id), ratings(rating)')
  console.log("Complex count:", complex?.length, "Error:", complexErr)
}

testQuery()
