import { createPublicClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'

export const revalidate = 60

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, store_type, has_delivery, primary_color, cover_url, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">المتجر أو المطعم غير موجود أو قد يكون الرابط غير صحيح.</div>
  }

  const [
    { data: rawCategories },
    { data: offers }
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*, menu_items(*)')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order', { ascending: true }),

    supabase
      .from('offers')
      .select('*, primary_item:menu_items!primary_item_id(image_url, images, name), bonus_item:menu_items!bonus_item_id(image_url, images, name), item3:menu_items!item3_id(image_url, images, name), item4:menu_items!item4_id(image_url, images, name)')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
  ])

  const categories = rawCategories?.map(({ menu_items, ...cat }) => cat) || []
  const menuItems = rawCategories
    ?.flatMap(cat => (cat.menu_items || []) as any[])
    .filter(item => item.is_available !== false) || []

  if (!categories || categories.length === 0) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">المتجر قيد التجهيز حالياً...</div>
  }

  return (
    <MenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      storeType={restaurant.store_type || 'restaurant'}
      restaurant={restaurant}
      categories={categories || []}
      menuItems={menuItems || []}
      ads={[]}
      offers={offers || []}
    />
  )
}
