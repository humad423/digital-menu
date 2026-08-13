/**
 * Client-side helper to trigger on-demand ISR revalidation.
 * Call this after any mutation (save item, edit offer, update settings, etc.)
 * so that the public menu pages are rebuilt with fresh data immediately.
 *
 * @param slug  - restaurant slug (for menu revalidation)
 * @param type  - 'menu' | 'offers' | 'home' | 'all'
 */
export async function triggerRevalidate(
  slug: string | null,
  type: 'menu' | 'offers' | 'home' | 'all' = 'menu'
): Promise<void> {
  try {
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type }),
    })
  } catch (err) {
    // Non-critical — revalidation failure doesn't affect the user action
    console.warn('[revalidate] Failed to trigger on-demand revalidation:', err)
  }
}
