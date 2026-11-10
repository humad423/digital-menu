import { getRestaurantBySlug, getMenuByRestaurant } from '@/utils/menuCache'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'
import SupermarketOffers from '@/components/SupermarketOffers'

// No store is built ahead of time. Each store's page is built on its first visit and then served
// ready from the CDN, until the store changes (its data is revalidated by tag) or a day passes.
// Opening hours, delivery and stock depend on the moment, so the browser works those out.
export async function generateStaticParams() {
  return []
}

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Shares its cached query with the layout
  const restaurant = await getRestaurantBySlug(slug)
  if (!restaurant) notFound()

  const { categories, menuItems, offers } = await getMenuByRestaurant(restaurant.id, restaurant.slug)

  if (categories.length === 0 && offers.length === 0) {
    return <div className="text-center py-20 text-gray-500 font-bold">المتجر قيد التجهيز حالياً...</div>
  }

  // A supermarket lists its current deals like a flyer, not a full product catalog
  if (restaurant.store_type === 'supermarket') {
    return (
      <SupermarketOffers
        restaurant={restaurant}
        categories={categories}
        menuItems={menuItems}
        offers={offers}
      />
    )
  }

  return (
    <MenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      storeType={restaurant.store_type || 'restaurant'}
      restaurant={restaurant}
      categories={categories}
      menuItems={menuItems}
      offers={offers}
    />
  )
}
