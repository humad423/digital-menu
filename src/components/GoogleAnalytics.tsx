'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const pathname = usePathname()
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-24MTPCGDE7'

  useEffect(() => {
    if (typeof window === 'undefined' || !measurementId) return

    // 1. Inject GA4 script tag dynamically into document head if not present
    const scriptId = 'ga-gtag-js'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.async = true
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
      document.head.appendChild(script)

      ;(window as any).dataLayer = (window as any).dataLayer || []
      function gtag(..._args: any[]) {
        ;(window as any).dataLayer.push(arguments)
      }
      ;(window as any).gtag = gtag
      gtag('js', new Date())
      gtag('config', measurementId, {
        send_page_view: true
      })
    }

    // 2. Send pageview on route changes for Next.js App Router
    if (pathname && (window as any).gtag) {
      const search = window.location.search || ''
      const url = pathname + search
      ;(window as any).gtag('config', measurementId, {
        page_path: url,
        send_page_view: true
      })
    }
  }, [pathname, measurementId])

  return null
}
