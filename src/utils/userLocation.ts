const STORAGE_KEY = 'alfsouq_user_loc'

export interface SavedLocation {
  lat: number
  lng: number
  city?: string
}

export function readUserLocation(): SavedLocation | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!parsed?.lat || !parsed?.lng) return null
    // Areas picked by hand in an older version aren't where the customer really is
    if (parsed.source === 'zone') return null
    return { lat: Number(parsed.lat), lng: Number(parsed.lng), city: parsed.city }
  } catch {
    return null
  }
}

export function saveUserLocation(location: SavedLocation): SavedLocation {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
    window.dispatchEvent(new Event('alfsouq_user_loc_updated'))
  } catch {}
  return location
}

export function clearUserLocation() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new Event('alfsouq_user_loc_updated'))
  } catch {}
}

function readPosition(options: PositionOptions): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      options
    )
  })
}

export async function getPrecisePosition(): Promise<{ lat: number; lng: number }> {
  try {
    return await readPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
  } catch (error) {
    if (isLocationDenied(error)) throw error
    // GPS often fails indoors, and the network position is close enough to find nearby stores
    return readPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 })
  }
}

export function isLocationDenied(error: unknown): boolean {
  return (error as GeolocationPositionError)?.code === 1
}

/**
 * Calls back with the location permission now and whenever it changes, so someone who
 * allows it from the browser's settings gets their stores without reloading.
 * Stays silent on browsers that can't report the permission.
 */
export function watchLocationPermission(onChange: (state: PermissionState) => void): () => void {
  let status: PermissionStatus | null = null
  let stopped = false

  navigator.permissions?.query({ name: 'geolocation' })
    .then(result => {
      if (stopped) return
      status = result
      onChange(result.state)
      result.onchange = () => onChange(result.state)
    })
    .catch(() => {})

  return () => {
    stopped = true
    if (status) status.onchange = null
  }
}

const hasArabic = (text: string) => /[؀-ۿ]/.test(text)

/** The city from a reverse geocoding answer, in Arabic whenever one is available. */
export function pickCityName(place: { city?: string; locality?: string; principalSubdivision?: string }): string | null {
  const names = [place.city, place.locality].filter((name): name is string => !!name?.trim())
  return names.find(hasArabic) || names[0] || place.principalSubdivision?.trim() || null
}

/**
 * The name is only shown as a label, so a failure here never stands in the way of the stores.
 * Coordinates are rounded because a city doesn't need the customer's exact position.
 * This free service must be called from the browser with the device's current position.
 */
export async function lookupCityName(pos: { lat: number; lng: number }): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.lat.toFixed(2)}&longitude=${pos.lng.toFixed(2)}&localityLanguage=ar`
    )
    if (!response.ok) return null
    return pickCityName(await response.json())
  } catch {
    return null
  }
}
