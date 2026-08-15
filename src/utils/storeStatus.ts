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
    // On client (browser), automatically detect the exact timezone of the visitor's device!
    // On server (SSR), default to GMT+3 ('Europe/Istanbul') instead of UTC.
    const userTimeZone = overrideTimeZone || (typeof window !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Europe/Istanbul')

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
  } catch (e) {
    const now = new Date()
    return { dayIndex: now.getDay(), hour: now.getHours(), minute: now.getMinutes(), userTimeZone: 'local' }
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

  // 2. Check weekly days off (in visitor device / local timezone)
  const { dayIndex, hour, minute } = getNowInTimezone(targetTimeZone)
  const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const currentDayName = ARABIC_DAYS[dayIndex]
  const daysOff = Array.isArray(restaurant.days_off) ? restaurant.days_off : []

  if (daysOff.includes(currentDayName)) {
    return {
      isOpen: false,
      isHoliday: true,
      statusText: 'في عطلة 🌴',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      subText: `عطلة يوم ${currentDayName}`,
    }
  }

  // 3. Check opening & closing time
  const openTime = restaurant.opening_time || '09:00'
  const closeTime = restaurant.closing_time || '23:00'

  const currentMinutes = hour * 60 + minute

  const [openH, openM] = openTime.split(':').map(Number)
  const openMinutes = (openH || 0) * 60 + (openM || 0)

  const [closeH, closeM] = closeTime.split(':').map(Number)
  const closeMinutes = (closeH || 0) * 60 + (closeM || 0)

  let isOpen = false
  if (closeMinutes > openMinutes) {
    // Normal schedule e.g., 09:00 to 23:00
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes
  } else {
    // Overnight schedule e.g., 18:00 to 02:00 AM
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes
  }

  if (isOpen) {
    return {
      isOpen: true,
      isHoliday: false,
      statusText: 'مفتوح الآن',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      subText: `حتى ${closeTime}`,
    }
  } else {
    return {
      isOpen: false,
      isHoliday: false,
      statusText: 'مغلق الآن',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500',
      subText: `يفتح ${openTime}`,
    }
  }
}
