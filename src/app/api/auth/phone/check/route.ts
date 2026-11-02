import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveOwnedRestaurantId } from '@/utils/phoneAccess'
import { normalizePhoneNumber } from '@/utils/phone'

// Tells the partner login whether to send an SMS, without exposing store or owner data.
export async function POST(request: NextRequest) {
  try {
    const { phone } = (await request.json()) as { phone?: string }
    const normalized = normalizePhoneNumber(phone)
    if (!normalized) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const restaurantId = await resolveOwnedRestaurantId(createAdminClient(), normalized)
    return NextResponse.json({ registered: Boolean(restaurantId) })
  } catch (err) {
    console.error('[auth/phone/check]', err)
    return NextResponse.json({ error: 'Login service unavailable' }, { status: 503 })
  }
}
