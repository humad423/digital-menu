'use client'

import { isInstalledApp } from '@/utils/appMode'
import { publicInsert } from '@/utils/publicInsert'
import { countVisitOnce } from '@/utils/visitGap'

export type AppEventKind = 'install' | 'app_open' | 'home_visit' | 'share'

/** Counts one thing a visitor did, for the numbers shown to the team. Never gets in the visitor's way. */
export function logAppEvent(kind: AppEventKind, restaurantId?: string | null): void {
  publicInsert('app_events', { kind, restaurant_id: restaurantId ?? null, from_app: isInstalledApp() }).catch(() => {})
}

/** Counts something once per phone every few hours, or once per phone ever when `forever` is set. */
export function logAppEventOnce(kind: AppEventKind, key: string, forever = false): void {
  if (forever) {
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      return
    }
  } else if (!countVisitOnce(key)) {
    return
  }
  logAppEvent(kind)
}
