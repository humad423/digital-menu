// Kept free of imports so the tests can load it directly.

/** Visits by the same phone closer together than this count as one. */
export const VISIT_GAP_HOURS = 6

/** True for a phone's first visit, or one long enough after the last one that was counted. */
export function isNewVisit(lastCounted: string | null, now: number, hours = VISIT_GAP_HOURS): boolean {
  const last = Number(lastCounted)
  // A time in the future means the phone's clock was changed, so it doesn't hold the count back
  return !(last > 0 && last <= now && now - last < hours * 3_600_000)
}

/**
 * Whether this visit should be counted, remembered on the phone, so reopening the app or the page
 * a few times in an afternoon is still one visit. Counts nothing if the phone won't let it remember.
 */
export function countVisitOnce(key: string, hours = VISIT_GAP_HOURS): boolean {
  try {
    const now = Date.now()
    if (!isNewVisit(localStorage.getItem(key), now, hours)) return false
    localStorage.setItem(key, String(now))
    return true
  } catch {
    return false
  }
}
