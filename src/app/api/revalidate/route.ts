import { NextRequest, NextResponse } from 'next/server'
import { clearMemoryCache } from '@/utils/menuCache'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, type = 'menu' } = body as {
      slug?: string
      type?: 'menu' | 'offers' | 'home' | 'all'
    }

    // All public pages are force-dynamic — the ONLY effective cache is memoryCache.
    // revalidatePath() does nothing for force-dynamic pages, so we skip it entirely.

    // Clear specific slug cache for menu/restaurant updates
    if (slug) {
      clearMemoryCache(slug)
    }

    // Clear home + offers caches when relevant data changes
    if (type === 'offers' || type === 'home' || type === 'all') {
      clearMemoryCache('home:all')
      clearMemoryCache('offers:page')
    }

    // Nuclear option: clear everything
    if (type === 'all') {
      clearMemoryCache()
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

