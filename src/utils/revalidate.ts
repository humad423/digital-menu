/**
 * Client-side helper to trigger on-demand ISR revalidation.
 * Call this after any mutation (save item, edit offer, update settings, etc.)
 * so that the public menu pages are rebuilt with fresh data immediately.
 *
 * @param slug          - restaurant slug (for menu revalidation)
 * @param type          - 'menu' | 'offers' | 'home' | 'all'
 * @param restaurantId  - restaurant UUID (ensures menu cache is invalidated accurately)
 */
export async function triggerRevalidate(
  slug: string | null | undefined,
  type: 'menu' | 'offers' | 'home' | 'all' = 'menu',
  restaurantId?: string | null | undefined
): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: slug || null, restaurantId: restaurantId || null, type }),
    })
  } catch (err) {
    // Non-critical — revalidation failure doesn't affect the user action
    console.warn('[revalidate] Failed to trigger on-demand revalidation:', err)
  }
}

