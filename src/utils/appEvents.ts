'use client'

import { isInstalledApp } from '@/utils/appMode'
import { publicInsert } from '@/utils/publicInsert'

export type AppEventKind = 'install' | 'app_open' | 'home_visit' | 'share'

/** Counts one thing a visitor did, for the numbers shown to the team. Never gets in the visitor's way. */
export function logAppEvent(kind: AppEventKind, restaurantId?: string | null): void {
  publicInsert('app_events', { kind, restaurant_id: restaurantId ?? null, from_app: isInstalledApp() }).catch(() => {})
}

/** Counts something once per visit, or once per device when `forever` is set. */
export function logAppEventOnce(kind: AppEventKind, key: string, forever = false): void {
  try {
    const storage = forever ? localStorage : sessionStorage
    if (storage.getItem(key)) return
    storage.setItem(key, '1')
  } catch {
    return
  }
  logAppEvent(kind)
}
