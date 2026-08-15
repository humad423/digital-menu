import { getHomePageData } from '@/utils/menuCache'
import PlatformClient from '@/components/PlatformClient'

// Dynamic SSR — 0 ISR Write Units. Data served from in-memory cache (5min TTL).
export const dynamic = 'force-dynamic'

export default async function Home() {
  const { restaurants, categories, ads, offers, serviceZones, businessTypes } = await getHomePageData()

  // Flatten: add platform_category_ids array and average rating to each restaurant
  const restaurantsWithCats = restaurants.map(r => {
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
        categories={categories}
        ads={ads}
        offers={offers}
        serviceZones={serviceZones}
        businessTypes={businessTypes}
      />
    </main>
  )
}

