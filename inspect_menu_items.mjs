import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectMenuItems() {
  console.log("=== Inspecting menu_items ===")

  // 1. Fetch some menu_items
  const { data: items, error: selectErr } = await supabase
    .from('menu_items')
    .select('*')
    .limit(5)
  console.log("Select items result:", items, "Error:", selectErr)

  if (items && items.length > 0) {
    console.log("Keys of menu_item object:", Object.keys(items[0]))
  }

  // 2. Test inserting a dummy menu item
  const dummyPayload = {
    category_id: 'a1111111-1111-1111-1111-111111111111',
    name: 'وجبة تجريبية',
    description: 'الوصف التجريبي',
    price: 100,
    image_url: null,
    is_available: true,
    is_offer: false,
    original_price: null,
    offer_title: null
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('menu_items')
    .insert([dummyPayload])
    .select()
  console.log("Insert test item result:", inserted, "Error:", insertErr)

  if (inserted && inserted.length > 0) {
    // Delete dummy item
    await supabase.from('menu_items').delete().eq('id', inserted[0].id)
    console.log("Cleaned up inserted dummy item.")
  }
}

inspectMenuItems()
