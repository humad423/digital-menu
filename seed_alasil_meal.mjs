import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAlasilMeal() {
  const { data: res } = await supabase.from('restaurants').select('id').eq('slug', 'alasil').single()
  if (!res) return

  const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', res.id)
  console.log("Alasil categories:", cats)

  if (cats && cats.length > 0) {
    const mealPayload = {
      category_id: cats[0].id,
      name: 'وجبة شاورما الأصيل المميزة',
      description: 'شاورما دجاج طازجة مع الثومية والبطاطس والمخلل',
      price: 150,
      image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=500',
      is_available: true,
      is_offer: false
    }

    const { data: inserted, error } = await supabase.from('menu_items').insert([mealPayload]).select()
    console.log("Inserted Alasil meal:", inserted, "Error:", error)
  }
}

testAlasilMeal()
