'use client'

// NOTE: Do NOT import createClient here - analytics must never touch Supabase
import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
//  Arabic event name map  (internal key → GA4 Arabic label)
//  We send ONLY the Arabic label so GA4 reports are 100% Arabic.
// ─────────────────────────────────────────────────────────────
const GA_ARABIC_EVENTS: Record<AnalyticsEventType, string> = {
  pwa_install:       'تثبيت_التطبيق',
  menu_view:         'زيارة_المنيو',
  ad_click:          'نقر_إعلان',
  page_view:         'تصفح_المنصة',
  session_heartbeat: 'مدة_التصفح',
}

// ─────────────────────────────────────────────────────────────
//  Core GA4 sender  (single call – never duplicated)
// ─────────────────────────────────────────────────────────────
export function sendGAEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return
  if (typeof (window as any).gtag === 'function') {
    ;(window as any).gtag('event', eventName, params ?? {})
  } else if (Array.isArray((window as any).dataLayer)) {
    ;(window as any).dataLayer.push({ event: eventName, ...(params ?? {}) })
  }
}

// ─────────────────────────────────────────────────────────────
//  Route guard – exclude all admin / partner routes
// ─────────────────────────────────────────────────────────────
function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return true
  const pathname = window.location.pathname
  const hostname = window.location.hostname
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/restaurant-panel') ||
    hostname.startsWith('admin.') ||
    hostname.startsWith('partner.') ||
    hostname.startsWith('restaurant.')
  )
}

// ─────────────────────────────────────────────────────────────
//  trackEvent  — fires ONE Arabic-named event per call
// ─────────────────────────────────────────────────────────────
export function trackEvent({
  event_type,
  store_id,
  store_slug,
  ad_id,
  duration_seconds,
}: TrackEventParams) {
  if (isAdminRoute()) return

  const arabicName = GA_ARABIC_EVENTS[event_type]
  if (!arabicName) return

  const params: Record<string, any> = {}
  if (store_id)         params['معرف_المتجر']        = store_id
  if (store_slug)       params['رابط_المتجر']         = store_slug
  if (ad_id)            params['معرف_الإعلان']        = ad_id
  if (duration_seconds) params['مدة_البقاء_بالثواني'] = duration_seconds

  sendGAEvent(arabicName, params)
}

// ─────────────────────────────────────────────────────────────
//  trackGAAddToCart  — GA4 e-commerce standard payload
// ─────────────────────────────────────────────────────────────
export function trackGAAddToCart(
  itemName: string,
  price?: number,
  currency = 'TRY',
) {
  if (isAdminRoute()) return
  const itemPrice = Number(price) || 0
  sendGAEvent('إضافة_للسلة', {
    currency,
    value: itemPrice,
    items: [{ item_id: itemName, item_name: itemName, price: itemPrice, quantity: 1 }],
    اسم_الوجبة:  itemName,
    السعر:        itemPrice,
  })
}

// ─────────────────────────────────────────────────────────────
//  trackGAWhatsAppOrder  — fires when user sends WhatsApp order
// ─────────────────────────────────────────────────────────────
export function trackGAWhatsAppOrder(storeName: string, totalValue?: number) {
  if (isAdminRoute()) return
  sendGAEvent('إرسال_طلب_واتساب', {
    اسم_المتجر:            storeName,
    إجمالي_الطلب_بالليرة: totalValue || 0,
    currency:              'TRY',
    value:                 totalValue || 0,
  })
}

// ─────────────────────────────────────────────────────────────
//  trackGALogin  — fires once after successful OTP verification
// ─────────────────────────────────────────────────────────────
export function trackGALogin(method = 'phone_sms') {
  if (isAdminRoute()) return
  sendGAEvent('تسجيل_دخول', {
    طريقة_الدخول: method === 'phone_sms' ? 'رسالة_SMS' : method,
  })
}

// ─────────────────────────────────────────────────────────────
//  Visitor / Session ID helpers  (localStorage-based, unchanged)
// ─────────────────────────────────────────────────────────────
export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let vid = localStorage.getItem('alfsouq_vid')
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36)
      localStorage.setItem('alfsouq_vid', vid)
    }
    return vid
  } catch {
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
  } catch {
    return 's_unknown'
  }
}

// ─────────────────────────────────────────────────────────────
//  usePageDurationTracker  — heartbeat every 45 s + on unload
//  Sends ONE مدة_التصفح event per interval / page-close
// ─────────────────────────────────────────────────────────────
export function usePageDurationTracker({
  store_id,
  store_slug,
  event_type = 'menu_view',
}: {
  store_id?: string
  store_slug?: string
  event_type?: AnalyticsEventType
}) {
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()

    const sendHeartbeat = (minSeconds = 5) => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (elapsed < minSeconds) return
      trackEvent({
        event_type: 'session_heartbeat',
        store_id,
        store_slug,
        duration_seconds: elapsed,
      })
    }

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      sendHeartbeat(5)
    }, 45_000)

    const handleUnload = () => sendHeartbeat(3)
    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
      handleUnload()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store_id, store_slug])
}
