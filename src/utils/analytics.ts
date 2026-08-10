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

export async function trackEvent({ event_type, store_id, store_slug, ad_id, duration_seconds }: TrackEventParams) {
  if (typeof window === 'undefined') return

  try {
    const userAgent = window.navigator.userAgent || ''
    const isMobile = /mobile|iphone|ipad|ipod|android/i.test(userAgent)
    const isTablet = /ipad|tablet/i.test(userAgent)
    const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

    const visitor_id = getOrCreateVisitorId()
    const session_id = getOrCreateSessionId()

    // Detect referrer / UTM source
    const urlParams = new URLSearchParams(window.location.search)
    let utm_source = urlParams.get('utm_source') || urlParams.get('ref') || urlParams.get('source') || ''
    
    let referrer = document.referrer || ''
    if (referrer) {
      try {
        const refUrl = new URL(referrer)
        if (refUrl.hostname.includes('whatsapp')) utm_source = utm_source || 'whatsapp'
        else if (refUrl.hostname.includes('instagram')) utm_source = utm_source || 'instagram'
        else if (refUrl.hostname.includes('facebook')) utm_source = utm_source || 'facebook'
        else if (refUrl.hostname.includes('google')) utm_source = utm_source || 'google'
        else if (refUrl.hostname.includes('telegram')) utm_source = utm_source || 'telegram'
        else if (refUrl.hostname.includes('tiktok')) utm_source = utm_source || 'tiktok'
      } catch {}
    }

    if (!utm_source) {
      if (!referrer) utm_source = 'direct'
      else utm_source = 'referral'
    }

    // Fire non-blocking async payload
    const supabase = createClient()
    await supabase
      .from('analytics_events')
      .insert({
        event_type,
        store_id: store_id || null,
        store_slug: store_slug || null,
        ad_id: ad_id || null,
        referrer: referrer.substring(0, 500),
        utm_source: utm_source.substring(0, 100),
        user_agent: userAgent.substring(0, 500),
        device_type,
        visitor_id,
        session_id,
        session_duration_seconds: duration_seconds || 0
      })
  } catch (err) {
    // Fail silently so user experience is never affected
  }
}

export function usePageDurationTracker({ store_id, store_slug, event_type = 'menu_view' }: { store_id?: string; store_slug?: string; event_type?: AnalyticsEventType }) {
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()

    // Send heartbeat duration every 30 seconds
    const interval = setInterval(() => {
      const elapsedSeconds = Math.round((Date.now() - startTimeRef.current) / 1000)
      if (elapsedSeconds >= 5) {
        trackEvent({
          event_type: 'session_heartbeat',
          store_id,
          store_slug,
          duration_seconds: elapsedSeconds
        })
      }
    }, 30000)

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
