import { createClient } from '@/utils/supabase/client'
import { useEffect, useRef } from 'react'

export type AnalyticsEventType = 
  | 'pwa_install'
  | 'menu_view'
  | 'ad_click'
  | 'page_view'
  | 'session_heartbeat'

interface TrackEventParams {
  event_type: AnalyticsEventType
  store_id?: string
  store_slug?: string
  ad_id?: string
  duration_seconds?: number
}

// Map internal event names to clear Arabic labels in Google Analytics
const GA_ARABIC_EVENTS: Record<string, string> = {
  pwa_install: 'تثبيت_التطبيق_PWA',
  menu_view: 'زيارة_المنيو',
  ad_click: 'نقر_إعلان_ترويجي',
  page_view: 'تصفح_المنصة',
  session_heartbeat: 'مدة_تصفح_المنيو'
}

// Utility to send custom GA4 events directly
export function sendGAEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    if (typeof (window as any).gtag === 'function') {
      ;(window as any).gtag('event', eventName, params)
    } else if (Array.isArray((window as any).dataLayer)) {
      ;(window as any).dataLayer.push({ event: eventName, ...params })
    }
  }
}

// Helper to track Add to Cart in GA4
export function trackGAAddToCart(itemName: string, price?: number, currency = 'TRY') {
  const itemPrice = Number(price) || 0
  const payload = {
    currency,
    value: itemPrice,
    items: [
      {
        item_id: itemName || 'item',
        item_name: itemName || 'item',
        price: itemPrice,
        quantity: 1
      }
    ],
    item_name: itemName,
    price: itemPrice
  }
  sendGAEvent('add_to_cart', payload)
}

// Helper to track WhatsApp Order Lead in GA4
export function trackGAWhatsAppOrder(storeName: string, totalValue?: number) {
  const payload = {
    currency: 'TRY',
    value: totalValue || 0,
    store_name: storeName,
    اسم_المتجر: storeName,
    إجمالي_الطلب_بالليرة: totalValue || 0
  }
  sendGAEvent('generate_lead', payload)
}

// Helper to track User Logins in GA4
export function trackGALogin(method = 'phone_sms') {
  const payload = {
    method,
    طريقة_تسجيل_الدخول: 'رسالة_نصية_SMS'
  }
  sendGAEvent('login', payload)
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let vid = localStorage.getItem('alfsouq_vid')
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
      localStorage.setItem('alfsouq_vid', vid)
    }
    return vid
  } catch (e) {
    return 'v_unknown'
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let sid = sessionStorage.getItem('alfsouq_sid')
    if (!sid) {
      sid = 's_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
      sessionStorage.setItem('alfsouq_sid', sid)
    }
    return sid
  } catch (e) {
    return 's_unknown'
  }
}

export function trackEvent({ event_type, store_id, store_slug, ad_id, duration_seconds }: TrackEventParams) {
  if (typeof window === 'undefined') return

  // Completely ignore tracking for Admin Panel or Restaurant Owner Dashboard
  const pathname = window.location.pathname || ''
  const hostname = window.location.hostname || ''
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel') ||
    hostname.startsWith('admin.') ||
    hostname.startsWith('partner.') ||
    hostname.startsWith('restaurant.')
  ) {
    return
  }

  // Forward 100% of events to Google Analytics 4 (GA4) with zero database load on Supabase/Vercel
  const params = {
    store_id: store_id || undefined,
    store_slug: store_slug || undefined,
    ad_id: ad_id || undefined,
    duration_seconds: duration_seconds || undefined,
    رابط_المتجر: store_slug || undefined,
    معرف_المتجر: store_id || undefined,
    معرف_الإعلان: ad_id || undefined,
    مدة_البقاء_بالثواني: duration_seconds || undefined
  }

  sendGAEvent(event_type, params)
}

export function usePageDurationTracker({ store_id, store_slug, event_type = 'menu_view' }: { store_id?: string; store_slug?: string; event_type?: AnalyticsEventType }) {
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()

    // Send heartbeat duration every 45 seconds if tab is active
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (elapsedSeconds >= 5) {
        trackEvent({
          event_type: 'session_heartbeat',
          store_id,
          store_slug,
          duration_seconds: elapsedSeconds
        })
      }
    }, 45000)

    const handleUnload = () => {
      const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (elapsedSeconds >= 3) {
        trackEvent({
          event_type: 'session_heartbeat',
          store_id,
          store_slug,
          duration_seconds: elapsedSeconds
        })
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
      handleUnload()
    }
  }, [store_id, store_slug, event_type])
}
