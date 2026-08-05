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

export function getDeliveryFeeForDistance(distanceKm: number, tiers?: DeliveryTier[]): {
  available: boolean
  fee: number
  tierName?: string
  reason?: string
} {
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    // Default flat fallback if no tiers configured yet
    return { available: true, fee: 20, tierName: 'توصيل عام' }
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
