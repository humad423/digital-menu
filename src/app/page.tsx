import { getHomePageData } from '@/utils/menuCache'
import PlatformClient from '@/components/PlatformClient'

export default async function Home() {
  const { restaurants, categories, ads, offers, serviceZones, businessTypes } = await getHomePageData()

  const restaurantsWithCats = restaurants.map(r => ({
    ...r,
    platform_category_ids: (r.restaurant_platform_categories || []).map((x: any) => x.platform_category_id),
  }))

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
