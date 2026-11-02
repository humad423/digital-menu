import { calculateDistance } from './distance.ts'

// A customer may order for a nearby area (home while at work), but not for another city
export const MAX_ZONE_DISTANCE_KM = 40

export interface Zone {
  id: string
  name: string
  latitude: number
  longitude: number
  radius_km?: number | null
}

/**
 * The areas a customer may choose. With a confirmed GPS position that means the ones
 * near them, closest first. Without GPS we can't tell where they are, so all are offered:
 * guessing from the internet connection places many mobile users in the wrong city,
 * and would lock real customers out of their own area.
 */
export function zonesForCustomer<T extends Zone>(zones: T[], gpsPosition: { lat: number; lng: number } | null): T[] {
  if (!gpsPosition) return zones

  return zones
    .map(zone => ({
      zone,
      fromCenter: calculateDistance(gpsPosition.lat, gpsPosition.lng, Number(zone.latitude), Number(zone.longitude)),
    }))
    // Measured from the area's edge, so a large area counts as near as soon as you're close to it
    .filter(({ zone, fromCenter }) => fromCenter - (Number(zone.radius_km) || 0) <= MAX_ZONE_DISTANCE_KM)
    .sort((a, b) => a.fromCenter - b.fromCenter)
    .map(({ zone }) => zone)
}
