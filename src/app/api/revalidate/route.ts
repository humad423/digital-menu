import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { ALL_TAG, HOME_TAG, LEGAL_TAG, OFFERS_TAG, storeTag } from '@/utils/menuCache'
import { createClient } from '@/utils/supabase/server'

// Saved changes must show on the very next request, so stale data is never served
const expireNow = { expire: 0 }

function isAssistant(request: NextRequest): boolean {
  const expected = process.env.ASSISTANT_SECRET
  const given = request.headers.get('x-assistant-secret')
  if (!expected || !given || expected.length !== given.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // The WhatsApp assistant has no user session, so it proves itself with a shared secret
    const fromAssistant = isAssistant(request)
    const isAdmin = user?.app_metadata?.role === 'admin' || fromAssistant
    const ownedRestaurantId: string | null =
      user?.app_metadata?.role === 'restaurant_owner' ? user.app_metadata.restaurant_id ?? null : null

    if (!isAdmin && !ownedRestaurantId) {
      return NextResponse.json({ revalidated: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { slug, restaurantId, type = 'menu' } = body as {
      slug?: string
      restaurantId?: string
      type?: 'menu' | 'offers' | 'home' | 'legal' | 'all'
    }

    if (fromAssistant && type !== 'menu' && type !== 'offers') {
      return NextResponse.json({ revalidated: false, error: 'Forbidden' }, { status: 403 })
    }

    // Store owners can only invalidate their own store
    if (!isAdmin) {
      let ownsTarget = type !== 'legal' && (!restaurantId || restaurantId === ownedRestaurantId)
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

    if (slug) revalidateTag(storeTag(slug), expireNow)
    if (restaurantId) revalidateTag(storeTag(restaurantId), expireNow)

    if (type === 'offers' || type === 'home' || type === 'all') {
      revalidateTag(HOME_TAG, expireNow)
      revalidateTag(OFFERS_TAG, expireNow)
    }

    if (type === 'legal') revalidateTag(LEGAL_TAG, expireNow)

    // Clearing the whole platform is admin-only
    if (type === 'all' && isAdmin) revalidateTag(ALL_TAG, expireNow)

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
