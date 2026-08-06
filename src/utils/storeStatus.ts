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

export function getStoreStatus(restaurant: any): StoreStatus {
  if (!restaurant) {
    return {
      isOpen: true,
      isHoliday: false,
      statusText: 'مفتوح الآن',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
    }
  }

  // 1. Check manual holiday override
  if (restaurant.is_on_holiday) {
    return {
      isOpen: false,
      isHoliday: true,
      statusText: 'في عطلة 🌴',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      subText: 'عطلة مؤقتة',
    }
  }

  // 2. Check weekly days off
  const now = new Date()
  const currentDayIndex = now.getDay() // 0 = Sunday, 1 = Monday...
  const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
  const currentDayName = ARABIC_DAYS[currentDayIndex]
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

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [openH, openM] = openTime.split(':').map(Number)
  const openMinutes = (openH || 0) * 60 + (openM || 0)

  const [closeH, closeM] = closeTime.split(':').map(Number)
  const closeMinutes = (closeH || 0) * 60 + (closeM || 0)

  let isOpen = false
  if (closeMinutes > openMinutes) {
    // Normal schedule e.g., 09:00 to 23:00
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes
  } else {
    // Overnight schedule e.g., 18:00 to 02:00
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
