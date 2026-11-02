import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { clearMemoryCache } from '@/utils/menuCache'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const isAdmin = user?.app_metadata?.role === 'admin'
    const ownedRestaurantId: string | null =
      user?.app_metadata?.role === 'restaurant_owner' ? user.app_metadata.restaurant_id ?? null : null

    if (!isAdmin && !ownedRestaurantId) {
      return NextResponse.json({ revalidated: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, restaurantId, type = 'menu' } = body as {
      slug?: string
      restaurantId?: string
      type?: 'menu' | 'offers' | 'home' | 'all'
    }

    // Store owners can only invalidate their own store
    if (!isAdmin) {
      let ownsTarget = !restaurantId || restaurantId === ownedRestaurantId
      if (ownsTarget && slug) {
        const { data: store } = await supabase
          .from('restaurants')
          .select('slug')
          .eq('id', ownedRestaurantId!)
          .maybeSingle()
        ownsTarget = store?.slug === slug
      }
      if (!ownsTarget) {
        return NextResponse.json({ revalidated: false, error: 'Forbidden' }, { status: 403 })
      }
    }

    // Clear specific slug/id cache for menu/restaurant updates
    if (slug) {
      clearMemoryCache(slug)
      try {
        revalidatePath(`/m/${slug}`, 'layout')
        revalidatePath(`/m/${slug}`, 'page')
      } catch {}
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
      } catch {}
    }

    // Nuclear option: clear everything
    if (type === 'all' && isAdmin) {
      clearMemoryCache()
      try {
        revalidatePath('/', 'layout')
      } catch {}
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
