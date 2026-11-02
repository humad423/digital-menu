import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyFirebaseIdToken } from '@/utils/firebaseToken'
import { resolveOwnedRestaurantId } from '@/utils/phoneAccess'
import { normalizePhoneNumber } from '@/utils/phone'

// Supabase Auth needs an email, so each phone maps to a stable address and user id.
// No mail is ever sent to these addresses.
function phoneIdentity(phone: string) {
  const digits = phone.replace(/\D/g, '')
  const hash = createHash('sha256').update(`alfsouq-phone:${digits}`).digest('hex')
  const id = [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-')
  return { id, email: `${digits}@phone.alfsouq.com` }
}

async function syncOwnerProfile(
  admin: SupabaseClient<any>,
  firebaseUid: string,
  phone: string,
  restaurantId: string
) {
  const { data: existing, error } = await admin
    .from('profiles')
    .select('id, role, restaurant_id')
    .eq('phone', phone)
    .maybeSingle()
  if (error) throw error

  if (!existing) {
    const { error: insertError } = await admin.from('profiles').insert([
      { id: firebaseUid, phone, full_name: '(بدون اسم)', role: 'restaurant_owner', restaurant_id: restaurantId },
    ])
    if (insertError) throw insertError
  } else if (existing.role !== 'restaurant_owner' || existing.restaurant_id !== restaurantId) {
    const { error: updateError } = await admin
      .from('profiles')
      .update({ role: 'restaurant_owner', restaurant_id: restaurantId })
      .eq('id', existing.id)
    if (updateError) throw updateError
  }
}

async function syncAuthUser(admin: SupabaseClient<any>, phone: string, restaurantId: string) {
  const { id, email } = phoneIdentity(phone)
  const app_metadata = { role: 'restaurant_owner', restaurant_id: restaurantId, phone }

  const { data: found } = await admin.auth.admin.getUserById(id)
  if (found?.user) {
    const { error } = await admin.auth.admin.updateUserById(id, { app_metadata })
    if (error) throw error
  } else {
    const { error } = await admin.auth.admin.createUser({ id, email, email_confirm: true, app_metadata })
    if (error) throw error
  }

  return email
}

// Exchanges a Firebase-verified phone login for a Supabase session, so RLS can see
// which store the owner manages. The role comes only from this server check.
export async function POST(request: NextRequest) {
  let identity: { uid: string; phone: string }
  try {
    const { idToken } = (await request.json()) as { idToken?: string }
    if (!idToken) throw new Error('Missing token')
    identity = await verifyFirebaseIdToken(idToken)
  } catch {
    return NextResponse.json({ error: 'Invalid login token' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const phone = normalizePhoneNumber(identity.phone)
    const restaurantId = await resolveOwnedRestaurantId(admin, phone)
    if (!restaurantId) {
      return NextResponse.json({ error: 'Phone is not linked to a store' }, { status: 403 })
    }

    await syncOwnerProfile(admin, identity.uid, phone, restaurantId)
    const email = await syncAuthUser(admin, phone, restaurantId)

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })
    if (linkError) throw linkError

    const anon = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
      type: 'magiclink',
      token_hash: link.properties.hashed_token,
    })
    if (verifyError || !verified.session) throw verifyError ?? new Error('No session returned')

    return NextResponse.json({
      access_token: verified.session.access_token,
      refresh_token: verified.session.refresh_token,
      restaurant_id: restaurantId,
    })
  } catch (err) {
    console.error('[auth/phone/session]', err)
    return NextResponse.json({ error: 'Login service unavailable' }, { status: 503 })
  }
}
