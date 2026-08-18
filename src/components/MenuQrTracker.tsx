'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface MenuQrTrackerProps {
  restaurantId: string
  restaurantSlug: string
}

function MenuQrTrackerContent({ restaurantId }: MenuQrTrackerProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!restaurantId) return

    const source = searchParams?.get('source') || searchParams?.get('src')
    const visitSource = source === 'qr' ? 'qr' : 'direct'

    // Debounce / deduplicate visits within the same session
    const sessionKey = `menu_visited_${restaurantId}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return
    }

    const logScan = async () => {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(sessionKey, 'true')
        }

        const ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
        let deviceType = 'mobile'
        if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
          deviceType = 'tablet'
        } else if (!/mobile|iphone|ipod|android.*mobile|blackberry|phone/i.test(ua)) {
          deviceType = 'desktop'
        }

        const supabase = createClient()
        await supabase.from('qr_scans').insert({
          restaurant_id: restaurantId,
          source: visitSource,
          device_type: deviceType,
          user_agent: ua.slice(0, 250),
        })
      } catch (err) {
        // Silently catch to never disturb customer experience
        console.error('Failed to log menu visit:', err)
      }
    }

    logScan()
  }, [restaurantId, searchParams])

  return null
}

export default function MenuQrTracker(props: MenuQrTrackerProps) {
  return (
    <Suspense fallback={null}>
      <MenuQrTrackerContent {...props} />
    </Suspense>
  )
}
