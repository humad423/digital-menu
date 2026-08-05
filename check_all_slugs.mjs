import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAll() {
  const { data: restaurants } = await supabase.from('restaurants').select('slug, name')
  console.log("Found restaurants:", restaurants)

  for (const r of restaurants || []) {
    const res = await fetch(`https://alfsouq.com/m/${r.slug}`)
    console.log(`Slug: ${r.slug} (${r.name}) -> Status: ${res.status}`)
    if (res.status !== 200) {
      const text = await res.text()
      console.log(`Error body for ${r.slug}:`, text.slice(0, 500))
    }
  }
}

testAll()
