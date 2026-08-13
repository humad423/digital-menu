import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * On-Demand Revalidation API
 * Called after any data mutation (save menu item, update offer, edit settings, etc.)
 * to invalidate only the affected ISR cached pages.
 *
 * Usage:
 *   fetch('/api/revalidate', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ slug: 'burger-king', type: 'menu' })
 *   })
 *
 * Types:
 *   'menu'     → revalidates /m/[slug] layout + page
 *   'offers'   → revalidates /offers and / home page
 *   'home'     → revalidates / home page
 *   'all'      → revalidates everything (admin use)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, type = 'menu' } = body as {
      slug?: string
      type?: 'menu' | 'offers' | 'home' | 'all'
    }

    if (type === 'menu' && slug) {
      // Revalidate the specific restaurant menu pages only
      revalidatePath(`/m/${slug}`, 'layout')
      revalidatePath(`/m/${slug}`, 'page')
    }

    if (type === 'offers' || type === 'all') {
      // Revalidate offers page and home (offers appear on both)
      revalidatePath('/offers', 'page')
      revalidatePath('/', 'page')
    }

    if (type === 'home' || type === 'all') {
      revalidatePath('/', 'page')
    }

    if (type === 'all') {
      // Nuclear option: revalidate everything (used by admin for restaurant CRUD)
      revalidatePath('/m/[slug]', 'layout')
      revalidatePath('/m/[slug]', 'page')
      revalidatePath('/offers', 'page')
      revalidatePath('/', 'page')
    }

    return NextResponse.json({
      revalidated: true,
      type,
      slug: slug ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { revalidated: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}
