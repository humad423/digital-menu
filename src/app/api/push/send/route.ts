import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_SUBJECT } from '@/config/push'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { readAudience, readNotice, subscribersWithin, type Audience, type Reach, type Subscriber } from '@/utils/push'

// Sending to every subscriber can take a while once there are many
export const maxDuration = 60

const DEFAULT_REACH_KM = 10

type Db = ReturnType<typeof createAdminClient>

/** The stores an audience is about, as places with how far each reaches. Only stores customers can open count. */
async function placesFor(db: Db, audience: Exclude<Audience, { kind: 'all' }>): Promise<Reach[]> {
  let query = db.from('restaurants').select('id, latitude, longitude, delivery_radius_km, store_type, is_menu_active, is_subscription_active')
  if (audience.kind === 'store') query = query.eq('id', audience.restaurantId)
  if (audience.kind === 'category') {
    const { data: links } = await db.from('restaurant_platform_categories').select('restaurant_id').eq('platform_category_id', audience.categoryId)
    const ids = (links || []).map(link => link.restaurant_id)
    if (!ids.length) return []
    query = query.in('id', ids)
  }
  const { data: stores } = await query
  return (stores || [])
    .filter(store => store.latitude && store.longitude && store.is_menu_active !== false && store.is_subscription_active !== false)
    .filter(store => audience.kind !== 'type' || (store.store_type || 'restaurant') === audience.type)
    .map(store => ({
      lat: store.latitude,
      lng: store.longitude,
      radiusKm: audience.kind === 'store' && audience.radiusKm ? audience.radiusKm : Number(store.delivery_radius_km) || DEFAULT_REACH_KM,
    }))
}

async function recipients(db: Db, audience: Audience): Promise<Subscriber[]> {
  const { data, error } = await db.from('push_subscriptions').select('endpoint, p256dh, auth, lat, lng')
  if (error) throw new Error('تعذر قراءة المشتركين.')
  const everyone = (data || []) as Subscriber[]
  return audience.kind === 'all' ? everyone : subscribersWithin(everyone, await placesFor(db, audience))
}

// The admin sends a notification, or only asks how many people it would reach.
export async function POST(request: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (user?.app_metadata?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const db = createAdminClient()

  try {
    if (body?.dryRun) {
      const { audience, problem } = readAudience(body.audience)
      if (!audience) return NextResponse.json({ error: problem }, { status: 400 })
      return NextResponse.json({ targets: (await recipients(db, audience)).length })
    }

    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (!privateKey) return NextResponse.json({ error: 'مفتاح الإشعارات غير مضبوط على الخادم بعد (VAPID_PRIVATE_KEY).' }, { status: 500 })

    const { notice, problem } = readNotice(body)
    if (!notice) return NextResponse.json({ error: problem }, { status: 400 })

    const targets = await recipients(db, notice.audience)
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey)
    // Visits that come from a notification are counted as such
    const url = `${notice.url}${notice.url.includes('?') ? '&' : '?'}source=push`
    const payload = JSON.stringify({ title: notice.title, body: notice.body, url })

    const results = await Promise.allSettled(targets.map(target =>
      webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, payload, { TTL: 12 * 60 * 60, urgency: 'normal' })))

    // A phone that turned notifications off, or uninstalled, is forgotten
    const gone = targets.filter((_, index) => {
      const result = results[index]
      return result.status === 'rejected' && [404, 410].includes((result.reason as { statusCode?: number })?.statusCode ?? 0)
    })
    if (gone.length) await db.from('push_subscriptions').delete().in('endpoint', gone.map(target => target.endpoint))

    const sent = results.filter(result => result.status === 'fulfilled').length
    return NextResponse.json({ targets: targets.length, sent, failed: targets.length - sent - gone.length, removed: gone.length })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || 'تعذر الإرسال.' }, { status: 500 })
  }
}
