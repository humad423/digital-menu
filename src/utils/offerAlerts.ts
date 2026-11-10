import { VAPID_PUBLIC_KEY } from '@/config/push'
import { isInstalledApp, isIos } from '@/utils/appMode'
import { keyToBytes } from '@/utils/push'
import { readUserLocation } from '@/utils/userLocation'

/** Sent on window whenever this phone starts or stops hearing about offers, so every card on the page agrees. */
export const OFFER_ALERTS_CHANGED = 'alfsouq:offer-alerts'

export type AlertsState = 'unsupported' | 'off' | 'on' | 'blocked'

export function canNotify(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false
  // On iPhones, only the installed app can receive notifications
  return !isIos() || isInstalledApp()
}

export async function readAlertsState(): Promise<AlertsState> {
  if (!canNotify()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  try {
    const registration = await navigator.serviceWorker.ready
    return (await registration.pushManager.getSubscription()) ? 'on' : 'off'
  } catch {
    return 'unsupported'
  }
}

/** Asks the browser, then saves this phone. Returns where things stand; throws if saving failed. */
export async function turnOnAlerts(): Promise<AlertsState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) })
  const location = readUserLocation()
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), lat: location?.lat, lng: location?.lng }),
  })
  if (!response.ok) throw new Error(String(response.status))
  window.dispatchEvent(new Event(OFFER_ALERTS_CHANGED))
  return 'on'
}

export async function turnOffAlerts(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      await subscription.unsubscribe()
    }
  } catch {}
  window.dispatchEvent(new Event(OFFER_ALERTS_CHANGED))
}
