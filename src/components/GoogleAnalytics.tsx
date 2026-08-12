'use client'

import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'
import { usePathname } from 'next/navigation'

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const pathname = usePathname()
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-6QKRPVXYRJ'

  // Completely exclude GA script on Admin Panel, Partner Dashboard, or Restaurant Panel
  if (
    !measurementId ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel')
  ) {
    return null
  }

  return <NextGoogleAnalytics gaId={measurementId} />
}
