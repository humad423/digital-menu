import { getRestaurantBySlug, getMenuByRestaurantId } from '@/utils/menuCache'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'

// No time-based revalidation — on-demand only via /api/revalidate
export const revalidate = false

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Reuses cached query from layout — zero extra Supabase calls
  const restaurant = await getRestaurantBySlug(slug)

  if (!restaurant) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">المتجر أو المطعم غير موجود أو قد يكون الرابط غير صحيح.</div>
  }

  // Cached menu data — shared across all render passes for this restaurant
  const { categories, menuItems, offers } = await getMenuByRestaurantId(restaurant.id)

  if (!categories || categories.length === 0) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">المتجر قيد التجهيز حالياً...</div>
  }

  return (
    <MenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      storeType={(restaurant as any).store_type || 'restaurant'}
      restaurant={restaurant}
      categories={categories}
      menuItems={menuItems}
      ads={[]}
      offers={offers}
    />
  )
}
