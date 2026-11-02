'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export default function GoogleAnalytics() {
  const pathname = usePathname()

  if (
    !MEASUREMENT_ID ||
    !pathname ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel')
  ) {
    return null
  }

  // Loads only after the page has finished, so slow connections get content first
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`} strategy="lazyOnload" />
      <Script id="ga-init" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${MEASUREMENT_ID}');`}
      </Script>
    </>
  )
}
