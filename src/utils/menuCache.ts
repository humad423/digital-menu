import { cache } from 'react'
import { createPublicClient } from '@/utils/supabase/server'

/**
 * Shared in-memory request-deduplicated fetcher for restaurant data by slug.
 *
 * Deduplicates calls across generateMetadata(), Layout, and Page in a single request,
 * eliminating extra Supabase queries while avoiding Vercel ISR Data Cache Writes.
 */
export const getRestaurantBySlug = cache(async (slug: string): Promise<any> => {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('restaurants')
    .select(
      'id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, ' +
      'latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, ' +
      'enable_whatsapp_orders, is_on_holiday, opening_time, closing_time, days_off, ' +
      'store_type, ratings(rating)'
    )
    .eq('slug', slug)
    .maybeSingle()
  return data
})

/**
 * Shared in-memory request-deduplicated fetcher for menu data by restaurant ID.
 */
export const getMenuByRestaurantId = cache(
  async (restaurantId: string): Promise<{ categories: any[]; menuItems: any[]; offers: any[] }> => {
    const supabase = createPublicClient()
    const [{ data: rawCategories }, { data: offers }] = await Promise.all([
      supabase
        .from('categories')
        .select(
          'id, name, sort_order, restaurant_id, ' +
          'menu_items(id, name, description, price, original_price, image_url, images, is_available, is_offer, offer_title, unit, sizes, colors, allow_custom_amount, category_id)'
        )
        .eq('restaurant_id', restaurantId)
        .order('sort_order', { ascending: true }),

      supabase
        .from('offers')
        .select(
          'id, title, discount_percent, new_price, is_active, created_at, restaurant_id, ' +
          'primary_item_id, bonus_item_id, item3_id, item4_id, ' +
          'primary_item:menu_items!primary_item_id(image_url, images, name), ' +
          'bonus_item:menu_items!bonus_item_id(image_url, images, name), ' +
          'item3:menu_items!item3_id(image_url, images, name), ' +
          'item4:menu_items!item4_id(image_url, images, name)'
        )
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ])

    const typedCategories = (rawCategories || []) as any[]
    const categories = typedCategories.map(({ menu_items, ...cat }) => cat)
    const menuItems = typedCategories
      .flatMap(cat => (cat.menu_items || []) as any[])
      .filter(item => item.is_available !== false)

    return { categories, menuItems, offers: offers || [] }
  }
)

