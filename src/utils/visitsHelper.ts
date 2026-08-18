import { SupabaseClient } from '@supabase/supabase-js'

export interface RestaurantNotesData {
  note: string
  multiplier: number
}

/**
 * Parses the restaurant's subscription_notes to extract any notes and the marketing visits multiplier.
 * Defaults to multiplier: 1 if not set or invalid.
 */
export function parseRestaurantMultiplier(subscriptionNotes: string | null | undefined): RestaurantNotesData {
  if (!subscriptionNotes) {
    return { note: '', multiplier: 1 }
  }

  const trimmed = subscriptionNotes.trim()

  // 1. Try parsing JSON format: { note: "...", visits_multiplier: 1.5 }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed)
      const rawMult = parsed.visits_multiplier ?? parsed.multiplier ?? 1
      const numMult = typeof rawMult === 'number' ? rawMult : parseFloat(rawMult)
      return {
        note: typeof parsed.note === 'string' ? parsed.note : '',
        multiplier: !isNaN(numMult) && numMult > 0 ? numMult : 1,
      }
    } catch {
      // Fallback if not valid JSON
    }
  }

  // 2. Try parsing regex format: mult:1.5 or multiplier:2
  const multMatch = trimmed.match(/(?:mult|multiplier|مضاعف)[:=]\s*([0-9]+(?:\.[0-9]+)?)/i)
  if (multMatch) {
    const parsedNum = parseFloat(multMatch[1])
    const cleanNote = trimmed.replace(multMatch[0], '').trim()
    return {
      note: cleanNote,
      multiplier: !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : 1,
    }
  }

  // 3. Fallback: treat whole text as note with multiplier 1
  return {
    note: trimmed,
    multiplier: 1,
  }
}

/**
 * Encodes the note and multiplier into a clean JSON string for the DB subscription_notes column.
 * If multiplier is 1 and note is empty, returns null.
 */
export function encodeRestaurantMultiplier(note: string | null | undefined, multiplier: number): string | null {
  const cleanNote = (note || '').trim()
  const cleanMultiplier = typeof multiplier === 'number' && !isNaN(multiplier) && multiplier > 0 ? multiplier : 1

  if (cleanMultiplier === 1 && !cleanNote) {
    return null
  }

  if (cleanMultiplier === 1) {
    // If multiplier is 1, save clean note string
    return cleanNote || null
  }

  return JSON.stringify({
    note: cleanNote,
    visits_multiplier: cleanMultiplier,
  })
}

/**
 * Calculates effective visits count applying the marketing multiplier.
 */
export function getEffectiveVisits(rawCount: number, multiplier: number): number {
  if (!rawCount || rawCount <= 0) return 0
  const mult = typeof multiplier === 'number' && !isNaN(multiplier) && multiplier > 0 ? multiplier : 1
  return Math.round(rawCount * mult)
}

/**
 * Fetches the count of visits registered today (since 00:00:00 local time) for a given restaurant.
 */
export async function fetchTodayVisits(supabase: SupabaseClient | any, restaurantId: string): Promise<number> {
  if (!restaurantId) return 0

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const { count, error } = await supabase
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', todayIso)

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

/**
 * Preset options for the marketing visits multiplier.
 */
export const MULTIPLIER_PRESETS = [
  { value: 1, label: '1x (حقيقي)', desc: 'الزيارات الفعلية بدون مضاعفة' },
  { value: 1.5, label: '1.5x (ضرب ×1.5)', desc: 'زيادة بنسبة 50%' },
  { value: 2, label: '2x (مضاعف ×2)', desc: 'مضاعفة عدد الزيارات مرتين' },
  { value: 2.5, label: '2.5x (ضرب ×2.5)', desc: 'مضاعفة بمقدار 2.5 مرة' },
  { value: 3, label: '3x (مضاعف ×3)', desc: 'مضاعفة عدد الزيارات 3 مرات' },
  { value: 5, label: '5x (مضاعف ×5)', desc: 'مضاعفة عدد الزيارات 5 مرات' },
] as const
