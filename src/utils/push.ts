// Checks and helpers for offer notifications, shared by the browser and the server. Free of imports
// other than distance, so it can be tested.

import { calculateDistance } from './distance.ts'

/** The push services browsers use. Notifications are only ever sent to these, never to an address someone made up. */
const PUSH_HOSTS = ['fcm.googleapis.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com']

export function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && PUSH_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

/** A position kept to about a kilometre: enough to pick nearby stores, not enough to find a home. */
export function roundCoordinate(value: unknown, limit: number): number | null {
  const number = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(number) || Math.abs(number) > limit) return null
  return Math.round(number * 100) / 100
}

/** The browser wants the public key as bytes. */
export function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export interface Subscriber {
  endpoint: string
  p256dh: string
  auth: string
  lat: number | null
  lng: number | null
}


/** A place people can hear about: a store and how far it reaches. */
export interface Reach {
  lat: number
  lng: number
  radiusKm: number
}

/** Subscribers within reach of any of the places. Those who never shared a location aren't near anything. */
export function subscribersWithin(subscribers: Subscriber[], places: Reach[]): Subscriber[] {
  return subscribers.filter(subscriber =>
    subscriber.lat !== null && subscriber.lng !== null &&
    places.some(place => calculateDistance(place.lat, place.lng, subscriber.lat!, subscriber.lng!) <= place.radiusKm))
}

/** Who a notification goes to. */
export type Audience =
  | { kind: 'all' }
  | { kind: 'store'; restaurantId: string; radiusKm: number | null }
  | { kind: 'type'; type: string }
  | { kind: 'category'; categoryId: string }

export interface Notice {
  title: string
  body: string
  url: string
  audience: Audience
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Who the admin picked, checked. */
export function readAudience(raw: unknown): { audience?: Audience; problem?: string } {
  const given = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  switch (given.kind) {
    case undefined:
    case 'all':
      return { audience: { kind: 'all' } }
    case 'store': {
      if (typeof given.restaurantId !== 'string' || !ID.test(given.restaurantId)) return { problem: 'اختر المتجر.' }
      const radius = Number(given.radiusKm)
      const radiusKm = given.radiusKm === null || given.radiusKm === undefined || given.radiusKm === '' ? null : radius
      if (radiusKm !== null && !(radiusKm >= 1 && radiusKm <= 100)) return { problem: 'المسافة يجب أن تكون بين 1 و100 كم.' }
      return { audience: { kind: 'store', restaurantId: given.restaurantId, radiusKm } }
    }
    case 'type':
      if (typeof given.type !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(given.type)) return { problem: 'اختر نوع المتاجر.' }
      return { audience: { kind: 'type', type: given.type } }
    case 'category':
      if (typeof given.categoryId !== 'string' || !ID.test(given.categoryId)) return { problem: 'اختر التصنيف.' }
      return { audience: { kind: 'category', categoryId: given.categoryId } }
    default:
      return { problem: 'اختر لمن يصل الإشعار.' }
  }
}

/** What the admin wants to send, checked. Links only go to pages on this site. */
export function readNotice(raw: unknown): { notice?: Notice; problem?: string } {
  const given = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const title = String(given.title ?? '').trim()
  const body = String(given.body ?? '').trim()
  const url = String(given.url ?? '/offers').trim()
  if (!title || title.length > 60) return { problem: 'اكتب عنواناً قصيراً، حتى 60 حرفاً.' }
  if (!body || body.length > 180) return { problem: 'اكتب نص الإشعار، حتى 180 حرفاً.' }
  if (!url.startsWith('/') || url.startsWith('//') || url.includes('\\')) return { problem: 'الرابط يجب أن يكون صفحة من ألف سوق.' }
  const { audience, problem } = readAudience(given.audience)
  if (!audience) return { problem }
  return { notice: { title, body, url, audience } }
}
