'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { bestDeal, dealEnds, dealLabel, type Deal, type Promotion } from '@/utils/promotions'
import { CURRENCY_SYMBOL } from '@/config/site'

/** A product's deal right now, as customers read it, like "خصم 100 ₺", with a line on how long it lasts. */
export type LiveDeal = Deal & { label: string; ends: string | null }

type DealFor = (item: { id: string; category_id?: string | null }, size: string, base: number) => LiveDeal | null

const NoDeals: DealFor = () => null
const DealsContext = createContext<DealFor>(NoDeals)

// Offers start and end on the minute, and a page can stay open a while
const RECHECK_MS = 60_000

/**
 * A store's offers, for every product on its page. Whether one is running depends on the moment,
 * and the page can be served from a cache, so it's worked out in the browser, after the page loads.
 */
export function PromotionsProvider({ promotions, timeZone, children }: { promotions: Promotion[]; timeZone?: string | null; children: React.ReactNode }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    if (!promotions.length) return
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), RECHECK_MS)
    return () => clearInterval(timer)
  }, [promotions.length])

  const dealFor: DealFor = (item, size, base) => {
    if (!now) return null
    const deal = bestDeal(promotions, item, size, base, now, timeZone)
    return deal && { ...deal, label: dealLabel(deal, CURRENCY_SYMBOL), ends: dealEnds(deal.promotion, now, timeZone) }
  }

  return <DealsContext.Provider value={promotions.length ? dealFor : NoDeals}>{children}</DealsContext.Provider>
}

/** Finds the deal on a product right now; null before the page has loaded or when there's none. */
export const useDeals = () => useContext(DealsContext)
