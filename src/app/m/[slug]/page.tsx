import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'

export const revalidate = 60

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true })

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .in('category_id', categories?.map(c => c.id) || ['00000000-0000-0000-0000-000000000000'])
    .eq('is_available', true)

  const { data: offers } = await supabase
    .from('offers')
    .select('*, primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!categories || categories.length === 0) {
    return <div className="text-center py-20 text-gray-500">القائمة قيد التجهيز...</div>
  }

  return (
    <MenuClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      categories={categories || []}
      menuItems={menuItems || []}
      ads={[]}
      offers={offers || []}
    />
  )
}
