import { getHomePageData } from '@/utils/menuCache'
import PlatformClient from '@/components/PlatformClient'

export default async function Home() {
  const { restaurants, categories, ads, offers, businessTypes } = await getHomePageData()

  const restaurantsWithCats = restaurants.map(r => ({
    ...r,
    platform_category_ids: (r.restaurant_platform_categories || []).map((x: any) => x.platform_category_id),
  }))

  return (
    <PlatformClient
      restaurants={restaurantsWithCats}
      categories={categories}
      ads={ads}
      offers={offers}
      businessTypes={businessTypes}
    />
  )
}
