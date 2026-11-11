import { publicInsert } from '@/utils/publicInsert'
import { isCampaignCode, readCampaignCode } from '@/utils/campaignLinks'

export { campaignLink, isCampaignCode, isCampaignPath, newCampaignCode, readCampaignCode } from '@/utils/campaignLinks'

// Campaign links: alfsouq.com/<page>?c=<code>. Whoever arrives through one is credited to it for 30 days,
// so an install or an order a few days later still counts for the ad that brought them.

export type CampaignEventKind = 'visit' | 'store_view' | 'contact' | 'order' | 'install' | 'push_on'

const CAMPAIGN_KEY = 'alfsouq_campaign'
const VISITOR_KEY = 'alfsouq_visitor'
const CREDIT_DAYS = 30

function visitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id || !/^[a-z0-9-]{8,40}$/.test(id)) {
      id = crypto.randomUUID()
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/** The link this phone came through, while it still gets the credit. */
export function activeCampaign(): string | null {
  // The address itself first: a page's own counters can run before the code has been saved
  if (typeof window !== 'undefined') {
    const here = readCampaignCode(window.location.search)
    if (here) return here
  }
  try {
    const saved = JSON.parse(localStorage.getItem(CAMPAIGN_KEY) || 'null')
    if (!saved || !isCampaignCode(saved.code)) return null
    return Date.now() - Number(saved.at) < CREDIT_DAYS * 86_400_000 ? saved.code : null
  } catch {
    return null
  }
}

/** Counts something a visitor from a campaign did. Silent and harmless when there is no campaign. */
export function logCampaignEvent(kind: CampaignEventKind, restaurantId?: string | null): void {
  const code = activeCampaign()
  const visitor = code && visitorId()
  if (!code || !visitor) return
  publicInsert('campaign_events', { campaign_code: code, kind, restaurant_id: restaurantId ?? null, visitor }).catch(() => {})
}

/** Counts something once per phone, like an install. */
export function logCampaignEventOnce(kind: CampaignEventKind, key: string): void {
  if (!activeCampaign()) return
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    return
  }
  logCampaignEvent(kind)
}

/** Run on every page: remembers a campaign link the visitor just came through, and counts the visit once per visit. */
export function captureCampaign(): void {
  if (typeof window === 'undefined') return
  const code = readCampaignCode(window.location.search)
  if (!code) return
  try {
    localStorage.setItem(CAMPAIGN_KEY, JSON.stringify({ code, at: Date.now() }))
    const seen = `alfsouq_campaign_seen_${code}`
    if (sessionStorage.getItem(seen)) return
    sessionStorage.setItem(seen, '1')
  } catch {
    return
  }
  logCampaignEvent('visit')
}
