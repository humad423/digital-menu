import { cache } from 'react'
import { createPublicClient } from '@/utils/supabase/server'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// In-memory cache store (shared across requests in warm serverless lambdas)
const memoryCache = new Map<string, CacheEntry<any>>()
const DEFAULT_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL

export function clearMemoryCache(pattern?: string) {
  if (!pattern) {
    memoryCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key)
    }
  }
}

/**
 * Shared in-memory request-deduplicated and TTL-cached fetcher for restaurant data by slug.
 */
export const getRestaurantBySlug = cache(async (slug: string): Promise<any> => {
  const cacheKey = `restaurant:${slug}`
  const cached = memoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
    return cached.data
  }

  const supabase = createPublicClient()
  const { data } = await supabase
    .from('restaurants')
    .select(
      'id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, ' +
      'latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, ' +
      'enable_whatsapp_orders, is_on_holiday, opening_time, closing_time, days_off, ' +
      'store_type, is_subscription_active, is_menu_active, subscription_notes, ratings(rating)'
    )
    .eq('slug', slug)
    .maybeSingle()

  if (data) {
    memoryCache.set(cacheKey, { data, timestamp: Date.now() })
  }
  return data
})

/**
 * Shared in-memory request-deduplicated and TTL-cached fetcher for menu data by restaurant ID.
 */
export const getMenuByRestaurantId = cache(
  async (restaurantId: string): Promise<{ categories: any[]; menuItems: any[]; offers: any[] }> => {
    const cacheKey = `menu:${restaurantId}`
    const cached = memoryCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
      return cached.data
    }

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

    const result = { categories, menuItems, offers: offers || [] }
    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  }
)

/**
 * TTL-cached fetcher for home page data (6 tables).
 * Serves thousands of concurrent visitors from memory — one Supabase query per 5 minutes.
 */
export const getHomePageData = cache(async (): Promise<{
  restaurants: any[]
  categories: any[]
  ads: any[]
  offers: any[]
  serviceZones: any[]
  businessTypes: any[]
}> => {
  const cacheKey = 'home:all'
  const cached = memoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
    return cached.data
  }

  const supabase = createPublicClient()
  const [
    { data: restaurants },
    { data: categories },
    { data: ads },
    { data: offers },
    { data: serviceZones },
    { data: businessTypes },
  ] = await Promise.all([
    supabase
      .from('restaurants')
      .select(
        'id, name, slug, logo_url, cover_url, store_type, primary_color, ' +
        'has_delivery, is_on_holiday, opening_time, closing_time, days_off, ' +
        'latitude, longitude, delivery_radius_km, delivery_tiers, is_subscription_active, is_menu_active, ' +
        'restaurant_platform_categories(platform_category_id), ratings(rating)'
      )
      .order('created_at', { ascending: false }),

    supabase
      .from('platform_categories')
      .select('id, name, icon, sort_order')
      .order('created_at', { ascending: true }),

    supabase
      .from('platform_ads')
      .select('id, title, image_url, link_url, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),

    supabase
      .from('offers')
      .select(
        'id, title, is_active, sort_order, created_at, restaurant_id, ' +
        'primary_item_id, bonus_item_id, item3_id, item4_id, ' +
        'restaurants(id, name, slug, latitude, longitude, delivery_radius_km), ' +
        'primary_item:menu_items!primary_item_id(image_url), ' +
        'bonus_item:menu_items!bonus_item_id(image_url), ' +
        'item3:menu_items!item3_id(image_url), ' +
        'item4:menu_items!item4_id(image_url)'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('service_zones')
      .select('id, name, polygon, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true }),

    supabase
      .from('business_types')
      .select('id, name, icon, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const result = {
    restaurants: restaurants || [],
    categories: categories || [],
    ads: ads || [],
    offers: offers || [],
    serviceZones: serviceZones || [],
    businessTypes: businessTypes || [],
  }
  memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
})

/**
 * TTL-cached fetcher for the offers page.
 */
export const getOffersPageData = cache(async (): Promise<{
  offers: any[]
  businessTypes: any[]
}> => {
  const cacheKey = 'offers:page'
  const cached = memoryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < DEFAULT_TTL_MS) {
    return cached.data
  }

  const supabase = createPublicClient()
  const [{ data: offers }, { data: businessTypes }] = await Promise.all([
    supabase
      .from('offers')
      .select(
        'id, title, is_active, sort_order, created_at, restaurant_id, ' +
        'primary_item_id, bonus_item_id, item3_id, item4_id, ' +
        'restaurants(id, name, slug, store_type, latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery), ' +
        'primary_item:menu_items!primary_item_id(image_url), ' +
        'bonus_item:menu_items!bonus_item_id(image_url), ' +
        'item3:menu_items!item3_id(image_url), ' +
        'item4:menu_items!item4_id(image_url)'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),

    supabase
      .from('business_types')
      .select('id, name, icon, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])

  const result = { offers: offers || [], businessTypes: businessTypes || [] }
  memoryCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
})
