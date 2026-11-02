import { getRestaurantBySlug, getMenuByRestaurant } from '@/utils/menuCache'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'
import SupermarketOffers from '@/components/SupermarketOffers'

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
