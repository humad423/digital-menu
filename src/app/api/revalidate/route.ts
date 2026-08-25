import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { clearMemoryCache } from '@/utils/menuCache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, restaurantId, type = 'menu' } = body as {
      slug?: string
      restaurantId?: string
      type?: 'menu' | 'offers' | 'home' | 'all'
    }

    // Clear specific slug/id cache for menu/restaurant updates
    if (slug) {
      clearMemoryCache(slug)
      try {
        revalidatePath(`/m/${slug}`, 'layout')
        revalidatePath(`/m/${slug}`, 'page')
      } catch (e) {}
    }

    if (restaurantId) {
      clearMemoryCache(restaurantId)
    }

    // Clear home + offers caches when relevant data changes
    if (type === 'offers' || type === 'home' || type === 'all') {
      clearMemoryCache('home:all')
      clearMemoryCache('offers:page')
      try {
        revalidatePath('/', 'page')
        revalidatePath('/offers', 'page')
      } catch (e) {}
    }

    // Nuclear option: clear everything
    if (type === 'all') {
      clearMemoryCache()
      try {
        revalidatePath('/', 'layout')
      } catch (e) {}
    }

    return NextResponse.json({
      revalidated: true,
      type,
      slug: slug ?? null,
      restaurantId: restaurantId ?? null,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { revalidated: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    )
  }
}

