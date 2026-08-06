import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  const { data: offers } = await supabase
    .from('offers')
    .select('id, title, sort_order, is_active, restaurant_id, restaurants(id, name, latitude, longitude, delivery_radius_km)')
    .order('sort_order', { ascending: true })

  console.log('Total offers in DB:', offers?.length)
  offers?.forEach((o, i) => {
    console.log(`${i+1}. [sort_order=${o.sort_order}] ${o.title} | Store: ${o.restaurants?.name} (lat=${o.restaurants?.latitude}, lng=${o.restaurants?.longitude}, rad=${o.restaurants?.delivery_radius_km}) | Active=${o.is_active}`)
  })
}

main().catch(console.error)
