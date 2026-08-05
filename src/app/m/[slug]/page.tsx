import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import MenuClient from '@/components/MenuClient'

export const dynamic = 'force-dynamic'

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">المطعم غير موجود أو قد يكون الرابط غير صحيح.</div>
  }

  const [
    { data: categories },
    { data: offers }
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order', { ascending: true }),

    supabase
      .from('offers')
      .select('*, primary_item:menu_items!primary_item_id(image_url, name), bonus_item:menu_items!bonus_item_id(image_url, name)')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
  ])

  const categoryIds = categories?.map(c => c.id) || []

  const { data: menuItems } = categoryIds.length > 0
    ? await supabase
        .from('menu_items')
        .select('*')
        .in('category_id', categoryIds)
        .eq('is_available', true)
    : { data: [] }

  if (!categories || categories.length === 0) {
    return <div className="text-center py-20 text-gray-500 font-bold dir-rtl">القائمة قيد التجهيز لهذا المطعم...</div>
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
