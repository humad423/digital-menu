const STORAGE_KEY = 'alfsouq_user_loc'
const STAY_KEY = 'alfsouq_stay_in_zone'

export interface SavedLocation {
  lat: number
  lng: number
  area?: string
  // 'zone' means the visitor picked it by hand, so GPS must not silently replace it
  source: 'gps' | 'zone'
}

export function readUserLocation(): SavedLocation | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!parsed?.lat || !parsed?.lng) return null
    return {
      lat: Number(parsed.lat),
      lng: Number(parsed.lng),
      area: parsed.area,
      source: parsed.source === 'zone' ? 'zone' : 'gps',
    }
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

export function getPrecisePosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  })
}

/**
 * Reads GPS only when the visitor already allowed it, so opening a page never
 * triggers a permission prompt. Returns null otherwise.
 */
export async function getPositionIfPermitted(): Promise<{ lat: number; lng: number } | null> {
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' })
    if (permission?.state !== 'granted') return null
    return await getPrecisePosition()
  } catch {
    return null
  }
}

export function hasChosenToStayInZone(): boolean {
  try {
    return sessionStorage.getItem(STAY_KEY) === 'true'
  } catch {
    return false
  }
}

export function rememberStayInZone() {
  try {
    sessionStorage.setItem(STAY_KEY, 'true')
  } catch {}
}
