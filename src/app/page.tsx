import { createPublicClient } from '@/utils/supabase/server'
import PlatformClient from '@/components/PlatformClient'

// Revalidate every 60 seconds (ISR) — eliminates per-request DB queries for all visitors
export const revalidate = 60

export default async function Home() {
  const supabase = createPublicClient()

  const [
    { data: restaurants },
    { data: categories },
    { data: ads },
    { data: offers },
    { data: serviceZones },
    { data: businessTypes }
  ] = await Promise.all([
    supabase
      .from('restaurants')
      .select('*, restaurant_platform_categories(platform_category_id), ratings(rating)')
      .order('created_at', { ascending: false }),

    supabase
      .from('platform_categories')
      .select('*')
      .order('created_at', { ascending: true }),

    supabase
      .from('platform_ads')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('offers')
      .select('*, restaurants(id, name, slug, latitude, longitude, delivery_radius_km), primary_item:menu_items!primary_item_id(image_url), bonus_item:menu_items!bonus_item_id(image_url), item3:menu_items!item3_id(image_url), item4:menu_items!item4_id(image_url)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('service_zones')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),

    supabase
      .from('business_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
  ])

  // Flatten: add platform_category_ids array and average rating to each restaurant
  const restaurantsWithCats = (restaurants || []).map(r => {
    const ratingsList = r.ratings || []
    const avgRating = ratingsList.length > 0
      ? (ratingsList.reduce((acc: number, curr: any) => acc + curr.rating, 0) / ratingsList.length).toFixed(1)
      : 'جديد'
    return {
      ...r,
      platform_category_ids: (r.restaurant_platform_categories || []).map((x: any) => x.platform_category_id),
      avg_rating: avgRating,
      ratings_count: ratingsList.length
    }
  })

  return (
    <main className="min-h-screen bg-slate-50 w-full font-sans overflow-x-hidden" dir="rtl">
      <PlatformClient 
        restaurants={restaurantsWithCats}
        categories={categories || []}
        ads={ads || []}
        offers={offers || []}
        serviceZones={serviceZones || []}
        businessTypes={businessTypes || []}
      />
    </main>
  )

}
