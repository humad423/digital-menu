import { STORE_TIMEZONE } from '@/config/site'
import { ARABIC_DAYS as DAY_NAMES, openNow } from '@/utils/schedule'

export interface StoreStatus {
  isOpen: boolean
  isHoliday: boolean
  statusText: string
  badgeClass: string
  dotClass: string
  subText?: string
}

export const DAYS_OF_WEEK = [
  { key: 'الأحد', label: 'الأحد' },
  { key: 'الإثنين', label: 'الإثنين' },
  { key: 'الثلاثاء', label: 'الثلاثاء' },
  { key: 'الأربعاء', label: 'الأربعاء' },
  { key: 'الخميس', label: 'الخميس' },
  { key: 'الجمعة', label: 'الجمعة' },
  { key: 'السبت', label: 'السبت' },
]

export function getNowInTimezone(overrideTimeZone?: string) {
  try {
    const now = new Date()
    // A store's hours are local to the store, not to whoever is looking at the menu
    const userTimeZone = overrideTimeZone || STORE_TIMEZONE

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimeZone,
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    })
    const parts = formatter.formatToParts(now)

    let weekdayStr = ''
    let hour = now.getHours()
    let minute = now.getMinutes()

    for (const part of parts) {
      if (part.type === 'weekday') weekdayStr = part.value
      if (part.type === 'hour') hour = parseInt(part.value, 10)
      if (part.type === 'minute') minute = parseInt(part.value, 10)
    }

    const dayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
    }

    const dayIndex = dayMap[weekdayStr] !== undefined ? dayMap[weekdayStr] : now.getDay()
    return { dayIndex, hour, minute, userTimeZone }
  } catch {
    const now = new Date()
    return { dayIndex: now.getDay(), hour: now.getHours(), minute: now.getMinutes(), userTimeZone: 'local' }
  }
}

/** A zone's current distance from GMT, like "GMT+3", for admins picking a store's zone. */
export function zoneOffsetLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' }).formatToParts(at).find(p => p.type === 'timeZoneName')
    return part?.value || timeZone
  } catch {
    return timeZone
  }
}

export function getStoreStatus(restaurant: any, targetTimeZone?: string): StoreStatus {
  if (!restaurant) {
    return {
      isOpen: true,
      isHoliday: false,
      statusText: 'مفتوح الآن',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    }
  }

  // 0. Check if customer menu is suspended by admin
  if (restaurant.is_menu_active === false) {
    return {
      isOpen: false,
      isHoliday: false,
      statusText: 'المنيو معلق ⚠️',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
      subText: 'المنيو غير متاح حالياً',
    }
  }

  // 1. Check manual holiday override (Emergency holiday)
  if (restaurant.is_on_holiday) {
    return {
      isOpen: false,
      isHoliday: true,
      statusText: 'في عطلة 🌴',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      subText: restaurant.holiday_message || 'عطلة مؤقتة',
    }
  }

  // 2. The store's own clock: its usual hours, a day changed on its own, and weekly days off
  const { isOpen, hours, clock, closedUntil } = openNow(targetTimeZone ? { ...restaurant, timezone: targetTimeZone } : restaurant)

  if (closedUntil) {
    return {
      isOpen: false,
      isHoliday: false,
      statusText: 'مغلق مؤقتاً',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      subText: `يفتح ${closedUntil}`,
    }
  }

  if (!isOpen && hours.closed) {
    return {
      isOpen: false,
      isHoliday: true,
      statusText: hours.dayOff ? 'في عطلة 🌴' : 'مغلق اليوم',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      subText: hours.dayOff ? `عطلة يوم ${DAY_NAMES[clock.dayIndex]}` : hours.note || 'إغلاق ليوم واحد',
    }
  }

  if (isOpen) {
    return {
      isOpen: true,
      isHoliday: false,
      statusText: 'مفتوح الآن',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      subText: `حتى ${hours.close}`,
    }
  }
  return {
    isOpen: false,
    isHoliday: false,
    statusText: 'مغلق الآن',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
    subText: `يفتح ${hours.open}`,
  }
}
