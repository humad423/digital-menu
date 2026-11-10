'use client'

import { useSyncExternalStore } from 'react'
import { visitEntry } from '@/utils/visitOrigin'

const noChanges = () => () => {}

/**
 * Shows its contents to everyone except a visit that began at a store's QR code:
 * someone sitting in the shop is kept on that shop's menu.
 * Nothing shows until the page is running, so a QR visitor never sees it flash.
 */
export default function HideFromQrVisitors({ children }: { children: React.ReactNode }) {
  const show = useSyncExternalStore(noChanges, () => visitEntry() !== 'qr', () => false)
  return show ? <>{children}</> : null
}
