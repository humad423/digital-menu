import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zaxnwqyrdkbquvtkqvyd.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheG53cXlyZGticXV2dGtxdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3Njc5NTcsImV4cCI6MjEwMTM0Mzk1N30.rnkqmDlxkb5kPlxLk3JozkgSZiEBKpKwNLTWvYKv0Ck'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const { phone } = await req.json()

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ success: false, error: 'رقم الهاتف مطلوب' }, { status: 400 })
    }

    // Format phone number to clean E.164 digits without + or spaces
    let cleanDigits = phone.trim().replace(/[^0-9]/g, '')
    if (cleanDigits.startsWith('0')) {
      cleanDigits = cleanDigits.replace(/^0+/, '')
    }
    if (!cleanDigits.startsWith('90') && !cleanDigits.startsWith('963') && !cleanDigits.startsWith('966') && !cleanDigits.startsWith('971') && !cleanDigits.startsWith('962') && !cleanDigits.startsWith('961')) {
      if (cleanDigits.length === 10) {
        cleanDigits = '90' + cleanDigits // Default to Turkey if 10 digits
      }
    }

    const formattedPhone = '+' + cleanDigits

    // Generate 6-digit random OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store OTP in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    await supabase.from('otp_verifications').insert([
      {
        phone: formattedPhone,
        code: otpCode,
        expires_at: expiresAt,
        verified: false
      }
    ])

    // Get Meta WhatsApp credentials from database or env
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('whatsapp_phone_number_id, whatsapp_token')
      .eq('id', 'main')
      .maybeSingle()

    const phoneNumberId = settings?.whatsapp_phone_number_id || process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || '1274974629028458'
    const accessToken = settings?.whatsapp_token || process.env.WHATSAPP_ACCESS_TOKEN || 'EAAOsr7LQ0foBSKdGvA68ZBmBJtxJt9Q1P4ZCNGcnAMxjBa6UeZC7YGaH1MAXMcPwQ7k9jHvgqody7oIQkmhYAp3nAidzu0DPCZBKiKfqySy84eArVPICBqIxxZAesCKxOy5wUlDCWqHRC8IxMpT1Y3uAxmzwjI04IxczMkCrM7kS1tK4TOilicmVHwDY6Bi1hCZBNdR2f6ZCEKvDKgJ6Q7BG0yZC05JojfjX7B5ZCTXQGL1kkVvc3pn58ZAPYIoNTo3jugnZACkLk2jj4OBzi1BN3wmIJok'

    // Send WhatsApp Message via Meta Graph API
    const metaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanDigits,
      type: 'text',
      text: {
        preview_url: false,
        body: `🔐 رمز التفعيل الخاص بك في منصة ألف سوق هو: ${otpCode}\n\nيرجى إدخال هذا الرمز في التطبيق لتأكيد تسجيل الدخول. صلاحية الكود 10 دقائق.`
      }
    }

    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metaMessagePayload)
    })

    const metaData = await metaRes.json()

    if (!metaRes.ok && metaData.error) {
      console.warn('Meta WhatsApp API send notice:', metaData.error)
    }

    return NextResponse.json({
      success: true,
      phone: formattedPhone,
      message: 'تم إرسال كود التفعيل بنجاح عبر الواتساب 💬'
    })
  } catch (err: any) {
    console.error('Error in send-whatsapp-otp:', err)
    return NextResponse.json({ success: false, error: err?.message || 'حدث خطأ أثناء إرسال رمز الواتساب' }, { status: 500 })
  }
}
