import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOffersQuery() {
  console.log("Testing offers query for restaurants...")
  const { data: res } = await supabase.from('restaurants').select('id, slug, name')
  console.log("Found restaurants:", res?.map(r => r.slug))

  for (const r of (res || [])) {
    const { data: offers, error: offErr } = await supabase
      .from('offers')
      .select('*, primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
      .eq('restaurant_id', r.id)
    
    if (offErr) {
      console.error(`ERROR for restaurant ${r.slug}:`, offErr)
    } else {
      console.log(`Offers count for ${r.slug}:`, offers?.length)
    }
  }
}

testOffersQuery()
