/**
 * Client-side helper to refresh the public pages' cached data.
 * Call this after any mutation (save item, edit offer, update settings, etc.)
 *
 * @param slug          - restaurant slug (for menu revalidation)
 * @param type          - 'menu' | 'offers' | 'home' | 'legal' | 'all'
 * @param restaurantId  - restaurant UUID (ensures menu cache is invalidated accurately)
 */
export async function triggerRevalidate(
  slug: string | null | undefined,
  type: 'menu' | 'offers' | 'home' | 'legal' | 'all' = 'menu',
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

