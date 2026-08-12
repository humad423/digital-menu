'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-24MTPCGDE7'

  useEffect(() => {
    if (!pathname || typeof window === 'undefined' || !(window as any).gtag) return
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    ;(window as any).gtag('config', measurementId, {
      page_path: url,
    })
  }, [pathname, searchParams, measurementId])

  // Exclude GA on Admin Panel, Partner Dashboard, or Restaurant Panel
  if (
    !measurementId ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel')
  ) {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}
