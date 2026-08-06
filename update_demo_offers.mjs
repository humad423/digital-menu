import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateOffers() {
  console.log('🔄 Updating demo offers with 3-item and 4-item bundle links...')

  const { data: restaurants } = await supabase.from('restaurants').select('id, store_type')

  for (const r of restaurants || []) {
    const { data: items } = await supabase.from('menu_items').select('id, name, price, image_url').eq('restaurant_id', r.id).not('image_url', 'is', null)
    if (items && items.length > 0) {
      const primary = items[0]?.id
      const bonus = items[1]?.id || null
      const item3 = items[2]?.id || null
      const item4 = items[3]?.id || null

      const selectedItems = items.slice(0, 4)
      const autoTitle = selectedItems.map(i => i.name).join(' + ')
      const origSum = selectedItems.reduce((acc, curr) => acc + (curr.price || 0), 0)

      await supabase.from('offers')
        .update({
          primary_item_id: primary,
          bonus_item_id: bonus,
          item3_id: item3,
          item4_id: item4,
          min_quantity: 1,
          bonus_quantity: 1,
          item3_quantity: 1,
          item4_quantity: 1,
          title: autoTitle || 'عرض حزم وتشكيلة مميزة',
          original_price: origSum > 0 ? origSum : 500
        })
        .eq('restaurant_id', r.id)
    }
  }

  console.log('✅ All demo offers updated to multi-product bundle offers (up to 4 items)!')
}

updateOffers().catch(console.error)
