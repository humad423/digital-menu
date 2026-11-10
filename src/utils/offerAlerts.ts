import { VAPID_PUBLIC_KEY } from '@/config/push'
import { isInstalledApp, isIos } from '@/utils/appMode'
import { keyToBytes } from '@/utils/push'
import { readUserLocation } from '@/utils/userLocation'

/** Sent on window whenever this phone starts hearing about offers, so every card on the page agrees. */
export const OFFER_ALERTS_CHANGED = 'alfsouq:offer-alerts'

const SYNCED_KEY = 'alfsouq_push_synced'
// The server forgets phones whose push address stopped working, so each phone checks in again daily
const SYNC_EVERY_MS = 24 * 60 * 60 * 1000

export type AlertsState = 'unsupported' | 'off' | 'on' | 'blocked'

export function canNotify(): boolean {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false
  // On iPhones, only the installed app can receive notifications
  return !isIos() || isInstalledApp()
}

/** Allowed in any way at all (our button, the phone's settings, the installed app) counts as on. */
export async function readAlertsState(): Promise<AlertsState> {
  if (!canNotify()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission === 'granted') return 'on'
  return 'off'
}

async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const location = readUserLocation()
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON(), lat: location?.lat, lng: location?.lng }),
  })
  if (!response.ok) throw new Error(String(response.status))
  try { localStorage.setItem(SYNCED_KEY, String(Date.now())) } catch {}
}

async function subscribeThisPhone(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  return existing ?? registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) })
}

/** Asks the browser, then saves this phone. Returns where things stand; throws if saving failed. */
export async function turnOnAlerts(): Promise<AlertsState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  await saveSubscription(await subscribeThisPhone())
  window.dispatchEvent(new Event(OFFER_ALERTS_CHANGED))
  return 'on'
}

/**
 * Whenever notifications are allowed, however that happened, makes sure this phone is saved so offers reach it.
 * Needs no tap: the browser only asks for one when permission itself is requested. Quiet on any failure.
 */
export async function syncAlerts(): Promise<void> {
  if (!canNotify() || Notification.permission !== 'granted') return
  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    let lastSync = 0
    try { lastSync = Number(localStorage.getItem(SYNCED_KEY)) || 0 } catch {}
    if (existing && Date.now() - lastSync < SYNC_EVERY_MS) return
    await saveSubscription(existing ?? await subscribeThisPhone())
    window.dispatchEvent(new Event(OFFER_ALERTS_CHANGED))
  } catch {}
}
