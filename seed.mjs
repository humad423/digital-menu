import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://zaxnwqyrdkbquvtkqvyd.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck"

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Target areas:
// Çayırova (شايروفا): ~ 40.8167, 29.3750
// Gebze (كيبزا / جيبزة): ~ 40.8028, 29.4307
// Sultanbeyli (سلطان بيلي): ~ 40.9672, 29.2667

const testRestaurants = [
  {
    name: 'مطعم الشام الأصيل - شايروفا',
    slug: 'alsham-chayirova',
    primary_color: '#ea580c',
    whatsapp_number: '+905350000001',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
    latitude: 40.8167,
    longitude: 29.3750,
    delivery_radius_km: 30,
    delivery_tiers: [
      { min_km: 0, max_km: 10, fee: 25, is_active: true },
      { min_km: 10, max_km: 20, fee: 50, is_active: true },
      { min_km: 20, max_km: 30, fee: 85, is_active: true }
    ]
  },
  {
    name: 'شاورما سلطان بيلي الملكي',
    slug: 'shawarma-sultanbeyli',
    primary_color: '#d97706',
    whatsapp_number: '+905350000002',
    logo_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=200&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=800&auto=format&fit=crop&q=80',
    latitude: 40.9672,
    longitude: 29.2667,
    delivery_radius_km: 25,
    delivery_tiers: [
      { min_km: 0, max_km: 10, fee: 30, is_active: true },
      { min_km: 10, max_km: 20, fee: 60, is_active: true },
      { min_km: 20, max_km: 25, fee: 90, is_active: false } // Disabled tier demo
    ]
  },
  {
    name: 'بيتزا وفطاير جيبزة السريعة',
    slug: 'gebze-pizza-express',
    primary_color: '#dc2626',
    whatsapp_number: '+905350000003',
    logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=800&auto=format&fit=crop&q=80',
    latitude: 40.8028,
    longitude: 29.4307,
    delivery_radius_km: 20,
    delivery_tiers: [
      { min_km: 0, max_km: 10, fee: 20, is_active: true },
      { min_km: 10, max_km: 20, fee: 45, is_active: true }
    ]
  },
  {
    name: 'مشاوي وبكجات شايروفا الذهبية',
    slug: 'chayirova-grill-house',
    primary_color: '#059669',
    whatsapp_number: '+905350000004',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    latitude: 40.8250,
    longitude: 29.3620,
    delivery_radius_km: 30,
    delivery_tiers: [
      { min_km: 0, max_km: 10, fee: 35, is_active: true },
      { min_km: 10, max_km: 20, fee: 70, is_active: true },
      { min_km: 20, max_km: 30, fee: 110, is_active: true }
    ]
  }
]

async function seed() {
  console.log('Seeding restaurants...')
  for (const r of testRestaurants) {
    const { data, error } = await supabase
      .from('restaurants')
      .upsert([r], { onConflict: 'slug' })
      .select()
    if (error) {
      console.error('Error upserting restaurant:', r.slug, error)
    } else {
      console.log('Upserted restaurant:', data[0]?.name, data[0]?.id)
    }
  }
  console.log('Done seeding test restaurants!')
}

seed()
