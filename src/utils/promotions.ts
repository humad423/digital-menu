// A store's offers on its own products: when each runs, and what a product costs while it does.
// Free of imports beyond the schedule rules, so it can be tested and run in the browser, where the time is known.

import { ARABIC_DAYS, inWindow, localClock, minutesOf, shiftDate } from './schedule.ts'

export type PromotionKind = 'price_cut' | 'category_amount' | 'category_percent'

/** A discount on whole categories, by an amount off each product or by a percent */
export const isCategoryKind = (kind: unknown) => kind === 'category_amount' || kind === 'category_percent'

/** A new price for one product, or for one of its sizes. */
export interface PromotionPrice {
  item_id: string
  /** The size it's for; empty when it's for the whole product */
  size?: string | null
  price: number
}

export interface Promotion {
  id: string
  kind: PromotionKind
  title?: string | null
  prices?: PromotionPrice[] | null
  percent?: number | null
  /** Amount off each product, for category_amount */
  amount?: number | null
  category_ids?: string[] | null
  excluded_item_ids?: string[] | null
  starts_at?: string | null
  ends_at?: string | null
  /** Days it runs on, 0 = Sunday; empty means every day */
  days?: number[] | null
  /** HH:MM on the store's clock; both empty means all day */
  from_time?: string | null
  until_time?: string | null
  is_active?: boolean | null
}

/** What a product costs under an offer, and what it cost before. */
export interface Deal {
  price: number
  was: number
  /** Whole percent saved, for sorting by the biggest discount */
  percent: number
  /** How much is saved */
  saved: number
  promotion: Promotion
}

const time = (value: string) => {
  const [hour, minute] = value.split(':').map(Number)
  return `${String(hour % 12 || 12)}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'ص' : 'م'}`
}

/** The daily hours a promotion keeps, when it keeps any. */
function dailyWindow(promotion: Promotion): { from: number; until: number } | null {
  const from = minutesOf(promotion.from_time)
  const until = minutesOf(promotion.until_time)
  return from !== null && until !== null && from !== until ? { from, until } : null
}

/** Whether a promotion is running at this moment, on the store's own clock. */
export function isPromotionLive(promotion: Promotion, now: Date, timeZone?: string | null): boolean {
  if (promotion.is_active === false) return false
  const at = now.getTime()
  if (promotion.starts_at && Date.parse(promotion.starts_at) > at) return false
  if (promotion.ends_at && Date.parse(promotion.ends_at) <= at) return false

  const clock = localClock(timeZone, now)
  const days = promotion.days ?? []
  const window = dailyWindow(promotion)
  if (!window) return days.length === 0 || days.includes(clock.dayIndex)
  if (!inWindow(clock.minutes, window.from, window.until)) return false
  // Hours past midnight belong to the evening they started on
  const startedYesterday = window.until < window.from && clock.minutes < window.until
  const day = startedYesterday ? (clock.dayIndex + 6) % 7 : clock.dayIndex
  return days.length === 0 || days.includes(day)
}

/** Whether a promotion is over for good, so it can be shown as ended in the panel. */
export const isPromotionOver = (promotion: Promotion, now: Date) =>
  !!promotion.ends_at && Date.parse(promotion.ends_at) <= now.getTime()

/** Whether a promotion hasn't begun yet. */
export const isPromotionUpcoming = (promotion: Promotion, now: Date) =>
  !!promotion.starts_at && Date.parse(promotion.starts_at) > now.getTime()

/** What one promotion makes a product cost, or null when it doesn't lower it. */
export function promotionPrice(promotion: Promotion, item: { id: string; category_id?: string | null }, size: string, base: number): number | null {
  if (!(base > 0)) return null
  if (promotion.kind === 'price_cut') {
    const entry = (promotion.prices ?? []).find(price => price.item_id === item.id && (!price.size || price.size === size))
    const price = Number(entry?.price)
    return price > 0 && price < base ? price : null
  }
  if (isCategoryKind(promotion.kind)) {
    if (!item.category_id || !(promotion.category_ids ?? []).includes(item.category_id)) return null
    if ((promotion.excluded_item_ids ?? []).includes(item.id)) return null
    const price = promotion.kind === 'category_amount'
      ? base - Number(promotion.amount)
      : Number(promotion.percent) > 0 && Number(promotion.percent) < 100 ? Math.round(base * (1 - Number(promotion.percent) / 100)) : NaN
    // An amount as big as the price would make it free, so it leaves that product out
    return price > 0 && price < base ? Math.round(price * 100) / 100 : null
  }
  return null
}

/**
 * The best running offer on a product, in a size, at its usual price there. Offers never add up:
 * the customer gets the lowest price any one of them gives.
 */
export function bestDeal(
  promotions: Promotion[],
  item: { id: string; category_id?: string | null },
  size: string,
  base: number,
  now: Date,
  timeZone?: string | null,
): Deal | null {
  let best: Deal | null = null
  for (const promotion of promotions) {
    if (!isPromotionLive(promotion, now, timeZone)) continue
    const price = promotionPrice(promotion, item, size, base)
    if (price === null || (best && price >= best.price)) continue
    best = { price, was: base, percent: Math.round(((base - price) / base) * 100), saved: Math.round((base - price) * 100) / 100, promotion }
  }
  return best
}

/**
 * The discount as customers read it: a percent only when the store set one, like "خصم 20%",
 * and otherwise the amount saved, like "خصم 100 ₺".
 */
export const dealLabel = (deal: Pick<Deal, 'saved' | 'promotion'>, currency: string) =>
  deal.promotion.kind === 'category_percent' ? `خصم ${Number(deal.promotion.percent)}%` : `خصم ${deal.saved} ${currency}`

/** A short line telling customers how long an offer lasts, like "ينتهي اليوم 11:00 م", or null when it runs on. */
export function dealEnds(promotion: Promotion, now: Date, timeZone?: string | null): string | null {
  const window = dailyWindow(promotion)
  if (window) return `حتى الساعة ${time(promotion.until_time!)}`
  if (!promotion.ends_at) return null
  const end = new Date(promotion.ends_at)
  const ends = localClock(timeZone, end)
  const today = localClock(timeZone, now).date
  const at = `${String(Math.floor(ends.minutes / 60)).padStart(2, '0')}:${String(ends.minutes % 60).padStart(2, '0')}`
  if (ends.date === today) return `ينتهي اليوم ${time(at)}`
  if (ends.date === shiftDate(today, 1)) return `ينتهي بكرا ${time(at)}`
  return `حتى ${ARABIC_DAYS[ends.dayIndex]} ${Number(ends.date.slice(8))}/${Number(ends.date.slice(5, 7))}`
}

/** When an offer runs, in words for the store's panel, like "كل الثلاثاء والجمعة، 3:00 م - 6:00 م". */
export function describeWhen(promotion: Promotion, timeZone?: string | null): string {
  const parts: string[] = []
  const date = (value: string) => {
    const at = storeDateTime(value, timeZone)
    return `${Number(at.date.slice(8))}/${Number(at.date.slice(5, 7))} ${time(at.time)}`
  }
  if (promotion.starts_at && promotion.ends_at) parts.push(`من ${date(promotion.starts_at)} لـ ${date(promotion.ends_at)}`)
  else if (promotion.ends_at) parts.push(`حتى ${date(promotion.ends_at)}`)
  else if (promotion.starts_at) parts.push(`من ${date(promotion.starts_at)}`)
  const days = [...(promotion.days ?? [])].sort()
  if (days.length && days.length < 7) parts.push(`كل ${days.map(day => ARABIC_DAYS[day]).join(' و')}`)
  if (dailyWindow(promotion)) parts.push(`${time(promotion.from_time!)} - ${time(promotion.until_time!)}`)
  return parts.join('، ') || 'دايماً'
}

export type PromotionStatus = 'live' | 'waiting' | 'upcoming' | 'over' | 'off'

/** Where an offer stands now, for the store's panel. "waiting" runs on set days or hours, but not this minute. */
export function promotionStatus(promotion: Promotion, now: Date, timeZone?: string | null): PromotionStatus {
  if (promotion.is_active === false) return 'off'
  if (isPromotionOver(promotion, now)) return 'over'
  if (isPromotionUpcoming(promotion, now)) return 'upcoming'
  return isPromotionLive(promotion, now, timeZone) ? 'live' : 'waiting'
}

/**
 * "YYYY-MM-DD" and "HH:MM" on the store's clock as an exact moment to save, or null when either is missing.
 * Starts as if the store were on GMT, then moves by however far its clock is off, twice for summer-time edges.
 */
export function storeMoment(date: string, timeOfDay: string, timeZone?: string | null): string | null {
  const day = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const minutes = minutesOf(timeOfDay)
  if (!day || minutes === null) return null
  const wanted = Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Math.floor(minutes / 60), minutes % 60)
  let moment = wanted
  for (let i = 0; i < 2; i++) {
    const clock = localClock(timeZone, new Date(moment))
    const [y, m, d] = clock.date.split('-').map(Number)
    moment += wanted - Date.UTC(y, m - 1, d, Math.floor(clock.minutes / 60), clock.minutes % 60)
  }
  return new Date(moment).toISOString()
}

/** A saved moment as the store's date and time, for the forms. */
export function storeDateTime(value: string | null | undefined, timeZone?: string | null): { date: string; time: string } {
  if (!value || Number.isNaN(Date.parse(value))) return { date: '', time: '' }
  const clock = localClock(timeZone, new Date(value))
  return { date: clock.date, time: `${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}` }
}
