import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDiff(slug) {
  console.log(`\n=== Testing slug: ${slug} ===`)

  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()
  console.log("Restaurant:", restaurant, "Err:", rErr)

  if (!restaurant) return

  const [
    { data: categories, error: cErr },
    { data: offers, error: oErr }
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order', { ascending: true }),

    supabase
      .from('offers')
      .select('*, primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
  ])

  console.log("Categories:", categories?.length, "CatErr:", cErr)
  console.log("Offers:", offers?.length, "OffErr:", oErr)

  const categoryIds = categories?.map(c => c.id) || []

  const { data: menuItems, error: mErr } = categoryIds.length > 0
    ? await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_available', true)
    : { data: [] }

  console.log("MenuItems:", menuItems?.length, "MenuErr:", mErr)
}

async function run() {
  await testDiff('alasil')
  await testDiff('pizza-n')
  await testDiff('burger-k')
}

run()
