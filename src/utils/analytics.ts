import { createClient } from '@/utils/supabase/client'

export type AnalyticsEventType = 
  | 'pwa_install'
  | 'menu_view'
  | 'ad_click'
  | 'page_view'

interface TrackEventParams {
  event_type: AnalyticsEventType
  store_id?: string
  store_slug?: string
  ad_id?: string
}

export async function trackEvent({ event_type, store_id, store_slug, ad_id }: TrackEventParams) {
  if (typeof window === 'undefined') return

  try {
    const userAgent = window.navigator.userAgent || ''
    const isMobile = /mobile|iphone|ipad|ipod|android/i.test(userAgent)
    const isTablet = /ipad|tablet/i.test(userAgent)
    const device_type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

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
        device_type
      })
  } catch (err) {
    // Fail silently so user experience is never affected
  }
}
