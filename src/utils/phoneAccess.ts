import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findStoreIdByPhone } from '@/utils/phone'

/**
 * Finds the store a phone number manages: an owner profile first, then the store's
 * own WhatsApp number. Must be called with the service-role client.
 */
export async function resolveOwnedRestaurantId(
  admin: SupabaseClient<any>,
  phone: string
): Promise<string | null> {
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('restaurant_id')
    .eq('phone', phone)
    .maybeSingle()
  if (profileError) throw profileError

  if (profile?.restaurant_id) return profile.restaurant_id

  const { data: stores, error: storesError } = await admin
    .from('restaurants')
    .select('id, whatsapp_number')
  if (storesError) throw storesError

  return findStoreIdByPhone(stores || [], phone)
}
