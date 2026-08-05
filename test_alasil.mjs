import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAlasil() {
  console.log("Checking restaurant alasil...")
  const { data: restaurant, error: resErr } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('slug', 'alasil')
    .single()
  console.log("Restaurant:", restaurant, "Error:", resErr)

  if (!restaurant) return

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true })
  console.log("Categories count:", categories?.length, "Error:", catErr)

  const { data: offers, error: offErr } = await supabase
    .from('offers')
    .select('*, primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  console.log("Offers count:", offers?.length, "Error:", offErr)
  console.log("Offers raw:", JSON.stringify(offers, null, 2))
}

testAlasil()
