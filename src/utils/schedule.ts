// A store's usual hours, the changes it makes for one day, and when it delivers, all read on the store's own clock.
// Free of imports so the same rules can be tested, and run in the browser where the time is known.

/** A change to one day only, like closing early today or opening late tomorrow. The usual hours stay as they are. */
export interface SpecialDay {
  /** YYYY-MM-DD on the store's clock */
  date: string
  closed?: boolean
  /** HH:MM */
  open?: string
  close?: string
  delivery_off?: boolean
  delivery_from?: string
  delivery_until?: string
  /** What customers see about it, like "عزا" */
  note?: string
}

export const DEFAULT_ZONE = 'Europe/Istanbul'
export const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Minutes after midnight for "HH:MM", or null when it isn't a time. */
export function minutesOf(time: unknown): number | null {
  const match = String(time ?? '').trim().match(TIME)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

export const isTime = (value: unknown) => minutesOf(value) !== null

/** The date, minutes after midnight and weekday on a store's clock. */
export function localClock(timeZone: string | null | undefined, at: Date = new Date()) {
  const read = (zone: string) => Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(at).map(part => [part.type, part.value]),
  )
  let parts: Record<string, string>
  try {
    parts = read(timeZone || DEFAULT_ZONE)
  } catch {
    parts = read(DEFAULT_ZONE)
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
    dayIndex: WEEKDAYS[parts.weekday] ?? at.getDay(),
  }
}

/** The day before or after a YYYY-MM-DD date. */
export function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** The store's one-day changes, keeping only well-formed ones. */
export function readSpecialDays(value: unknown): SpecialDay[] {
  let list = value
  if (typeof list === 'string') {
    try { list = JSON.parse(list) } catch { list = [] }
  }
  if (!Array.isArray(list)) return []
  return list.filter((day): day is SpecialDay => !!day && typeof day === 'object' && DATE.test(String(day.date)))
}

export const specialDayOn = (store: any, date: string) => readSpecialDays(store?.special_days).find(day => day.date === date)

/** True when a time falls inside a window, including one that runs past midnight, like 18:00 to 02:00. */
export function inWindow(minutes: number, from: number, until: number): boolean {
  if (until > from) return minutes >= from && minutes < until
  return minutes >= from || minutes < until
}

export interface DayHours {
  closed: boolean
  open: string
  close: string
  /** Why it's closed or changed, for customers */
  note?: string
  /** Closed because of a weekly day off */
  dayOff: boolean
  /** Changed for this day only */
  special: boolean
}

/** The hours a store keeps on a date: its usual ones, unless that day was changed. */
export function hoursOn(store: any, date: string, dayIndex: number): DayHours {
  const special = specialDayOn(store, date)
  const open = special?.open && isTime(special.open) ? special.open : store?.opening_time || '09:00'
  const close = special?.close && isTime(special.close) ? special.close : store?.closing_time || '23:00'
  const daysOff: string[] = Array.isArray(store?.days_off) ? store.days_off : []
  // Hours set for the day open it, even on a usual day off
  const dayOff = daysOff.includes(ARABIC_DAYS[dayIndex]) && !special?.open && !special?.close
  return { closed: special?.closed === true || dayOff, open, close, note: special?.note, dayOff: dayOff && !special?.closed, special: !!special }
}

/** Open now, by the store's hours today, or by last night's shift if it runs past midnight. */
export function openNow(store: any, at: Date = new Date()): { isOpen: boolean; hours: DayHours; clock: ReturnType<typeof localClock>; closedUntil?: string } {
  const clock = localClock(store?.timezone, at)
  const today = hoursOn(store, clock.date, clock.dayIndex)
  const yesterday = hoursOn(store, shiftDate(clock.date, -1), (clock.dayIndex + 6) % 7)

  // Closed for a while, like an hour for prayer; it opens again on its own
  if (Date.parse(String(store?.closed_until ?? '')) > at.getTime()) {
    return { isOpen: false, hours: today, clock, closedUntil: momentText(store.closed_until, store, clock.date) }
  }

  // After midnight on an overnight shift, the store is still on yesterday's hours
  const yesterdayOpen = minutesOf(yesterday.open) ?? 0
  const yesterdayClose = minutesOf(yesterday.close) ?? 0
  if (!yesterday.closed && yesterdayClose <= yesterdayOpen && clock.minutes < yesterdayClose) {
    return { isOpen: true, hours: yesterday, clock }
  }

  if (today.closed) return { isOpen: false, hours: today, clock }
  const isOpen = inWindow(clock.minutes, minutesOf(today.open) ?? 0, minutesOf(today.close) ?? 0)
  return { isOpen, hours: today, clock }
}

/** "HH:MM" for a saved moment on the store's clock, with the date when it isn't today. */
function momentText(value: string, store: any, today: string): string {
  const at = new Date(value)
  const clock = localClock(store?.timezone, at)
  const time = `${String(Math.floor(clock.minutes / 60)).padStart(2, '0')}:${String(clock.minutes % 60).padStart(2, '0')}`
  if (clock.date === today) return time
  if (clock.date === shiftDate(today, 1)) return `غداً ${time}`
  return `${clock.date.slice(8, 10)}/${clock.date.slice(5, 7)} ${time}`
}

export interface DeliveryNow {
  available: boolean
  /** Why it isn't available now, for customers */
  reason?: string
  /** The hours it runs today, when they differ from the store's */
  hours?: string
}

/** Whether a store delivers right now: its delivery hours, a pause, or a change for today. */
export function deliveryNow(store: any, at: Date = new Date()): DeliveryNow {
  if (store?.has_delivery === false) return { available: false, reason: 'لا يوجد توصيل' }
  const clock = localClock(store?.timezone, at)

  const paused = Date.parse(String(store?.delivery_paused_until ?? ''))
  if (paused > at.getTime()) return { available: false, reason: `التوصيل متوقف حتى ${momentText(store.delivery_paused_until, store, clock.date)}` }

  const special = specialDayOn(store, clock.date)
  if (special?.delivery_off) return { available: false, reason: `لا يوجد توصيل اليوم${special.note ? `: ${special.note}` : ''}` }

  const from = (special?.delivery_from && isTime(special.delivery_from) ? special.delivery_from : null) ?? (isTime(store?.delivery_from) ? store.delivery_from : null)
  const until = (special?.delivery_until && isTime(special.delivery_until) ? special.delivery_until : null) ?? (isTime(store?.delivery_until) ? store.delivery_until : null)
  if (!from && !until) return { available: true }

  const hours = hoursOn(store, clock.date, clock.dayIndex)
  const start = from ?? hours.open
  const end = until ?? hours.close
  const text = `التوصيل من ${start} إلى ${end}`
  return inWindow(clock.minutes, minutesOf(start) ?? 0, minutesOf(end) ?? 0)
    ? { available: true, hours: text }
    : { available: false, reason: text }
}

/** Today and later one-day changes, oldest first, for the panel to show and cancel. */
export function upcomingSpecialDays(store: any, at: Date = new Date()): SpecialDay[] {
  const today = localClock(store?.timezone, at).date
  return readSpecialDays(store?.special_days).filter(day => day.date >= today).sort((a, b) => a.date.localeCompare(b.date))
}

/** A one-day change in plain Arabic, like "الأحد 09/11: مغلق (عزاء)". */
export function describeSpecialDay(day: SpecialDay, store: any, at: Date = new Date()): string {
  const today = localClock(store?.timezone, at).date
  const [year, month, date] = day.date.split('-').map(Number)
  const weekday = ARABIC_DAYS[new Date(Date.UTC(year, month - 1, date)).getUTCDay()]
  const label = day.date === today ? 'اليوم' : day.date === shiftDate(today, 1) ? 'غداً' : `${weekday} ${day.date.slice(8, 10)}/${day.date.slice(5, 7)}`
  const parts: string[] = []
  if (day.closed) parts.push('مغلق')
  else if (day.open || day.close) parts.push(`الدوام من ${day.open || store?.opening_time || '09:00'} إلى ${day.close || store?.closing_time || '23:00'}`)
  if (day.delivery_off) parts.push('بدون توصيل')
  else if (day.delivery_from || day.delivery_until) parts.push(`التوصيل من ${day.delivery_from || 'الفتح'} إلى ${day.delivery_until || 'السكرة'}`)
  return `${label}: ${parts.join('، ') || 'بدون تغيير'}${day.note ? ` (${day.note})` : ''}`
}
