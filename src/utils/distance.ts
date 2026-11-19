export interface DeliveryTier {
  min_km: number
  max_km: number
  fee: number
  is_active: boolean
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** How far a store reaches when the admin hasn't set it. */
export const DEFAULT_REACH_KM = 10

/** How far a store is shown, as the Alfsouq admin set it. The store itself can't change this. */
export const storeReachKm = (reachKm?: number | null): number => (Number(reachKm) > 0 ? Number(reachKm) : DEFAULT_REACH_KM)

/**
 * Whether a customer this far away is within the store's reach, and what delivery is expected to cost them.
 * Only the admin's reach decides where a store shows. The store's own fee tiers only say what delivery
 * costs at a distance; when none covers it, the fee is unknown, but the store still reaches them.
 */
export function getDeliveryFeeForDistance(
  distanceKm: number,
  tiers?: DeliveryTier[],
  reachKm?: number | null
): {
  available: boolean
  fee: number
  hasTiers: boolean
  feeKnown: boolean
  tierName?: string
} {
  const activeTiers = Array.isArray(tiers) ? tiers.filter(t => t && t.is_active !== false) : []
  const tier = activeTiers.find(t => distanceKm >= t.min_km && distanceKm <= t.max_km)
  return {
    available: distanceKm <= storeReachKm(reachKm),
    fee: tier?.fee ?? 0,
    hasTiers: activeTiers.length > 0,
    feeKnown: Boolean(tier),
    tierName: tier ? `${tier.min_km} - ${tier.max_km} كم` : undefined,
  }
}

/** Whether a store shows to a customer here: within the reach the admin set for it. */
export function isStoreWithinRange(userLat: number, userLng: number, restaurant: any): boolean {
  // Without a position on the map we can't say it reaches anyone
  if (!restaurant.latitude || !restaurant.longitude) return false
  return calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude) <= storeReachKm(restaurant.delivery_radius_km)
}
