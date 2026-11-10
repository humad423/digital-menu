import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isPushEndpoint, roundCoordinate } from '@/utils/push'

// A phone asking to hear about offers near it. Only real push-service addresses are kept,
// and the location only to about a kilometre.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const subscription = body?.subscription
  const endpoint = subscription?.endpoint
  const p256dh = subscription?.keys?.p256dh
  const auth = subscription?.keys?.auth
  if (!isPushEndpoint(endpoint) || typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  const { error } = await createAdminClient().from('push_subscriptions').upsert({
    endpoint,
    p256dh,
    auth,
    lat: roundCoordinate(body?.lat, 90),
    lng: roundCoordinate(body?.lng, 180),
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('Could not save a push subscription', error.message)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// Turning notifications off. Only the phone that holds the address knows it.
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!isPushEndpoint(body?.endpoint)) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  await createAdminClient().from('push_subscriptions').delete().eq('endpoint', body.endpoint)
  return NextResponse.json({ ok: true })
}
