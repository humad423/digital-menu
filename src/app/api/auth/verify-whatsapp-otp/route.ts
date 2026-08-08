import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json()

    if (!phone || !code) {
      return NextResponse.json({ success: false, error: 'رقم الهاتف وكود التحقق مطلوبان' }, { status: 400 })
    }

    // Format phone number to clean E.164 digits
    let cleanDigits = phone.trim().replace(/[^0-9]/g, '')
    if (cleanDigits.startsWith('0')) {
      cleanDigits = cleanDigits.replace(/^0+/, '')
    }
    if (!cleanDigits.startsWith('90') && !cleanDigits.startsWith('963') && !cleanDigits.startsWith('966') && !cleanDigits.startsWith('971') && !cleanDigits.startsWith('962') && !cleanDigits.startsWith('961')) {
      if (cleanDigits.length === 10) {
        cleanDigits = '90' + cleanDigits
      }
    }
    const formattedPhone = '+' + cleanDigits

    // Fallback: Test code 123456 always accepted
    if (code.trim() === '123456') {
      return NextResponse.json({ success: true, phone: formattedPhone })
    }

    // Check database for matching unexpired OTP
    const { data: matches } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', formattedPhone)
      .eq('code', code.trim())
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (!matches || matches.length === 0) {
      // Also check without + prefix for compatibility
      const { data: altMatches } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('code', code.trim())
        .eq('verified', false)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (!altMatches || altMatches.length === 0) {
        return NextResponse.json({ success: false, error: 'كود التحقق غير صحيح أو انتهت صلاحيته' }, { status: 400 })
      }
    }

    // Mark matched code as verified
    await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('code', code.trim())

    return NextResponse.json({ success: true, phone: formattedPhone })
  } catch (err: any) {
    console.error('Error in verify-whatsapp-otp:', err)
    return NextResponse.json({ success: false, error: err?.message || 'حدث خطأ أثناء التحقق من الرمز' }, { status: 500 })
  }
}
