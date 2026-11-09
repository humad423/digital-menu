import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/utils/supabase/server'

// Public pages read through Next's shared data cache, so an update from any server
// instance reaches every visitor. Entries also expire on their own after a day.
const ONE_DAY = 24 * 60 * 60

export const ALL_TAG = 'all-data'
export const HOME_TAG = 'home'
export const OFFERS_TAG = 'offers'
export const LEGAL_TAG = 'legal'
export const storeTag = (slugOrId: string) => `store:${slugOrId}`

const OFFER_COLUMNS =
  'id, title, description, original_price, offer_price, image_url, images, is_active, sort_order, created_at, restaurant_id, ' +
  'primary_item_id, bonus_item_id, item3_id, item4_id, min_quantity, bonus_quantity, item3_quantity, item4_quantity'

function isStoreVisible(store: any): boolean {
  return store?.is_subscription_active !== false && store?.is_menu_active !== false
}

// A hidden store keeps its direct link, but stays off the home page and the offers page
function isStoreListed(store: any): boolean {
  return isStoreVisible(store) && store?.show_on_home !== false
}

function dataOrThrow<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  // Throwing keeps a failed query out of the cache
  if (error) throw new Error(error.message)
  return data
}

export const getRestaurantBySlug = cache((slug: string): Promise<any> =>
  unstable_cache(
    async () => {
      const supabase = createPublicClient()
      return dataOrThrow(
        await supabase
          .from('restaurants')
          .select(
            'id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, ' +
            'latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, ' +
            'enable_whatsapp_orders, is_on_holiday, holiday_message, opening_time, closing_time, timezone, days_off, delivery_from, delivery_until, special_days, delivery_paused_until, closed_until, ' +
            'store_type, menu_note, is_subscription_active, is_menu_active, show_on_home, show_stores_button'
          )
          .eq('slug', slug)
          .maybeSingle()
      )
    },
    ['restaurant', slug],
    { tags: [ALL_TAG, storeTag(slug)], revalidate: ONE_DAY }
  )()
)

export const getMenuByRestaurant = cache(
  (restaurantId: string, slug: string): Promise<{ categories: any[]; menuItems: any[]; offers: any[] }> =>
    unstable_cache(
      async () => {
        const supabase = createPublicClient()
        const [categoriesResult, offersResult] = await Promise.all([
          supabase
            .from('categories')
            .select(
              'id, name, sort_order, restaurant_id, ' +
              'menu_items(id, name, description, price, original_price, image_url, images, is_available, is_hidden, out_of_stock_until, is_offer, offer_title, unit, sizes, colors, allow_custom_amount, category_id)'
            )
            .eq('restaurant_id', restaurantId)
            .order('sort_order', { ascending: true }),

          supabase
            .from('offers')
            .select(
              OFFER_COLUMNS + ', ' +
              'primary_item:menu_items!primary_item_id(image_url, images, name), ' +
              'bonus_item:menu_items!bonus_item_id(image_url, images, name), ' +
              'item3:menu_items!item3_id(image_url, images, name), ' +
              'item4:menu_items!item4_id(image_url, images, name)'
            )
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
        ])

        const rawCategories = dataOrThrow(categoriesResult) as any[]
        return {
          categories: rawCategories.map(({ menu_items, ...category }) => category),
          menuItems: rawCategories
            .flatMap(category => (category.menu_items || []) as any[])
            .filter(item => item.is_hidden !== true),
          offers: dataOrThrow(offersResult) as any[],
        }
      },
      ['menu', restaurantId],
      { tags: [ALL_TAG, storeTag(restaurantId), storeTag(slug)], revalidate: ONE_DAY }
    )()
)

export const getHomePageData = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient()
      const [restaurants, categories, ads, offers, businessTypes] = await Promise.all([
        supabase
          .from('restaurants')
          .select(
            'id, name, slug, logo_url, cover_url, store_type, primary_color, created_at, ' +
            'has_delivery, is_on_holiday, holiday_message, opening_time, closing_time, timezone, days_off, delivery_from, delivery_until, special_days, delivery_paused_until, closed_until, ' +
            'latitude, longitude, delivery_radius_km, delivery_tiers, is_subscription_active, is_menu_active, show_on_home, ' +
            'restaurant_platform_categories(platform_category_id)'
          )
          .order('created_at', { ascending: false }),

        supabase
          .from('platform_categories')
          .select('id, name, icon')
          .order('created_at', { ascending: true }),

        supabase
          .from('platform_ads')
          .select('id, image_url, link_url, sort_order, is_active, target_region, latitude, longitude, radius_km')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('offers')
          .select(
            OFFER_COLUMNS + ', ' +
            'restaurants(id, name, slug, latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, is_subscription_active, is_menu_active, show_on_home), ' +
            'primary_item:menu_items!primary_item_id(image_url), ' +
            'bonus_item:menu_items!bonus_item_id(image_url), ' +
            'item3:menu_items!item3_id(image_url), ' +
            'item4:menu_items!item4_id(image_url)'
          )
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(12),

        supabase
          .from('business_types')
          .select('id, name, slug, icon, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ])

      return {
        restaurants: (dataOrThrow(restaurants) as any[]).filter(isStoreListed),
        categories: dataOrThrow(categories) as any[],
        ads: dataOrThrow(ads) as any[],
        offers: (dataOrThrow(offers) as any[]).filter(offer => isStoreListed(offer.restaurants)),
        businessTypes: dataOrThrow(businessTypes) as any[],
      }
    },
    ['home-page'],
    { tags: [ALL_TAG, HOME_TAG], revalidate: ONE_DAY }
  )
)

export const getOffersPageData = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient()
      const [offers, businessTypes] = await Promise.all([
        supabase
          .from('offers')
          .select(
            OFFER_COLUMNS + ', ' +
            'restaurants(id, name, slug, store_type, latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, is_subscription_active, is_menu_active, show_on_home), ' +
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
          .select('id, name, slug, icon, sort_order, is_active')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ])

      return {
        offers: (dataOrThrow(offers) as any[]).filter(offer => isStoreListed(offer.restaurants)),
        businessTypes: dataOrThrow(businessTypes) as any[],
      }
    },
    ['offers-page'],
    { tags: [ALL_TAG, HOME_TAG, OFFERS_TAG], revalidate: ONE_DAY }
  )
)

export const getLegalContent = cache(
  unstable_cache(
    async () => {
      const supabase = createPublicClient()
      const data = dataOrThrow(
        await supabase
          .from('platform_settings')
          .select('privacy_policy, terms_of_service')
          .eq('id', 'main')
          .maybeSingle()
      ) as { privacy_policy: string | null; terms_of_service: string | null } | null
      return { privacy: data?.privacy_policy || null, terms: data?.terms_of_service || null }
    },
    ['legal-pages'],
    { tags: [ALL_TAG, LEGAL_TAG], revalidate: ONE_DAY }
  )
)
