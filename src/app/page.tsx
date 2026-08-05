import { supabase } from '@/lib/supabase'
import PlatformClient from '@/components/PlatformClient'

export const revalidate = 60 // Revalidate every minute

export default async function Home() {
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*, restaurant_platform_categories(platform_category_id), ratings(rating)')
    .order('created_at', { ascending: false })

  const { data: categories } = await supabase
    .from('platform_categories')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: ads } = await supabase
    .from('platform_ads')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  const { data: offers } = await supabase
    .from('offers')
    .select('*, restaurants!inner(id, name, slug, latitude, longitude, delivery_radius_km), primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(10)

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
    <main className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-xl overflow-hidden relative">
        <PlatformClient 
          restaurants={restaurantsWithCats}
          categories={categories || []}
          ads={ads || []}
          offers={offers || []}
        />
      </div>
    </main>
  )
}
