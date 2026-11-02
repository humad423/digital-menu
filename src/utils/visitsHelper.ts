import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Calculates the start of the current restaurant business day (4:00 AM to 4:00 AM).
 * If the current hour is before 4:00 AM (e.g. 1:00 AM or 2:30 AM), the business day started yesterday at 4:00 AM.
 * Otherwise, the business day started today at 4:00 AM.
 */
export function getBusinessDayStart(): Date {
  const now = new Date()
  const start = new Date(now)
  if (now.getHours() < 4) {
    start.setDate(start.getDate() - 1)
  }
  start.setHours(4, 0, 0, 0)
  return start
}

/**
 * Checks if a given timestamp falls within the current business day (since 4:00 AM).
 */
export function isWithinCurrentBusinessDay(dateStrOrDate: string | Date | null | undefined): boolean {
  if (!dateStrOrDate) return false
  const date = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate
  const start = getBusinessDayStart()
  return date.getTime() >= start.getTime()
}

/**
 * Fetches the count of visits registered today (since 4:00 AM restaurant business day start) for a given restaurant.
 */
export async function fetchTodayVisits(supabase: SupabaseClient | any, restaurantId: string): Promise<number> {
  if (!restaurantId) return 0

  try {
    const startIso = getBusinessDayStart().toISOString()

    const { count, error } = await supabase
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startIso)

    if (error) {
      console.warn('Error fetching today visits count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.warn('Failed to fetch today visits:', err)
    return 0
  }
}
