const VISITS_BEFORE_SUGGESTING = 3
const DAYS_TO_STAY_QUIET = 60
const DAY_MS = 24 * 60 * 60 * 1000

/** Suggest installing only to returning visitors, and rarely after they say no. */
export function shouldSuggestInstall(visits: number, dismissedAt: number | null, now: number): boolean {
  if (visits < VISITS_BEFORE_SUGGESTING) return false
  return dismissedAt === null || now - dismissedAt > DAYS_TO_STAY_QUIET * DAY_MS
}
