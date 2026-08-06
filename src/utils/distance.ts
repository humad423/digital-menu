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

export function getDeliveryFeeForDistance(
  distanceKm: number,
  tiers?: DeliveryTier[],
  deliveryRadiusKm?: number
): {
  available: boolean
  fee: number
  tierName?: string
  reason?: string
} {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    // No tiers configured: fallback to delivery_radius_km if provided
    if (deliveryRadiusKm && deliveryRadiusKm > 0) {
      if (distanceKm <= deliveryRadiusKm) {
        return { available: true, fee: 20, tierName: 'توصيل عام' }
      } else {
        return { available: false, fee: 0, reason: 'خارج نطاق التوصيل' }
      }
    }
    // No tiers, no radius → show to all (store hasn't configured delivery zones yet)
    return { available: true, fee: 0, tierName: 'توصيل' }
  }

  // Find matching distance tier
  const matchedTier = tiers.find(t => distanceKm >= t.min_km && distanceKm <= t.max_km)

  if (!matchedTier) {
    return { available: false, fee: 0, reason: 'خارج مسافة التوصيل المتاحة' }
  }

  if (!matchedTier.is_active) {
    return { available: false, fee: 0, reason: `التوصيل متوقف لمسافة (${matchedTier.min_km}-${matchedTier.max_km} كم)` }
  }

  return {
    available: true,
    fee: matchedTier.fee,
    tierName: `${matchedTier.min_km} - ${matchedTier.max_km} كم`
  }
}

/**
 * Checks if a restaurant is within delivery range of the given user coordinates.
 * Returns true if the restaurant should be shown on the homepage.
 */
export function isStoreWithinRange(
  userLat: number,
  userLng: number,
  restaurant: any
): boolean {
  // If no lat/lng set on restaurant → always show (not configured yet)
  if (!restaurant.latitude || !restaurant.longitude) return true

  const dist = calculateDistance(userLat, userLng, restaurant.latitude, restaurant.longitude)

  // Pick-up only stores: use delivery_radius_km to decide visibility on map/list
  if (restaurant.has_delivery === false) {
    const radius = restaurant.delivery_radius_km || 50
    return dist <= radius
  }

  // Delivery stores with tiers
  const result = getDeliveryFeeForDistance(dist, restaurant.delivery_tiers, restaurant.delivery_radius_km)
  return result.available
}
