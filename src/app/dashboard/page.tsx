'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '@/lib/firebase'
import { normalizePhoneNumber } from '@/utils/phone'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { supportWhatsappUrl } from '@/config/site'

export default function CompletelyStandaloneDashboardPage() {
  const router = useRouter()

  const [countryCode, setCountryCode] = useState('+90')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unregisteredError, setUnregisteredError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [formattedPhoneState, setFormattedPhoneState] = useState('')
  
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const recaptchaRef = React.useRef<RecaptchaVerifier | null>(null)

  useEffect(() => {
    // Skip the login form if this browser already has a store owner session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.app_metadata?.role === 'restaurant_owner' && user.app_metadata.restaurant_id) {
        router.push(`/restaurant-panel/${user.app_metadata.restaurant_id}`)
        return
      }
      setLoading(false)
    })

    // Pre-render recaptcha in background
    setTimeout(() => {
      if (typeof window !== 'undefined' && !recaptchaRef.current) {
        try {
          auth.languageCode = 'ar'
          recaptchaRef.current = new RecaptchaVerifier(auth, 'dashboard-recaptcha', {
            size: 'invisible'
          })
          recaptchaRef.current.render().catch(() => {})
        } catch {}
      }
    }, 200)
  }, [router])

  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '')
    if (clean.startsWith('0')) {
      clean = clean.replace(/^0+/, '')
    }
    setPhoneNumber(clean)
    setUnregisteredError(null)
    setError(null)
  }

  const setupRecaptcha = () => {
    if (typeof window !== 'undefined') {
      const elem = document.getElementById('dashboard-recaptcha')
      if (elem && !recaptchaRef.current) {
        try {
          auth.languageCode = 'ar'
          recaptchaRef.current = new RecaptchaVerifier(auth, 'dashboard-recaptcha', {
            size: 'invisible'
          })
        } catch (e) {
          console.warn('Dashboard recaptcha setup error:', e)
        }
      }
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnregisteredError(null)
    setInfoMessage(null)
    if (!phoneNumber) {
      setError('يرجى إدخال رقم الهاتف أولاً.')
      return
    }

    setIsSubmitting(true)
    const formatted = normalizePhoneNumber(phoneNumber, countryCode)
    setFormattedPhoneState(formatted)

    try {
      // 1. Verify that this phone number belongs to an existing registered store BEFORE sending OTP
      const checkRes = await fetch('/api/auth/phone/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted }),
      })
      if (!checkRes.ok) {
        throw new Error('خدمة تسجيل الدخول غير متاحة حالياً، يرجى المحاولة لاحقاً.')
      }
      const { registered } = await checkRes.json()

      // If store is NOT registered, STOP and do NOT send SMS
      if (!registered) {
        setUnregisteredError(formatted)
        setIsSubmitting(false)
        return
      }

      // Store is registered -> Send SMS OTP
      setupRecaptcha()
      const appVerifier = recaptchaRef.current!
      auth.languageCode = 'ar'
      const confirmation = await signInWithPhoneNumber(auth, formatted, appVerifier)
      setConfirmationResult(confirmation)
      setInfoMessage(`تم إرسال كود التفعيل عبر رسالة نصية (SMS) إلى الرقم (${formatted}) 📱`)
      setStep('otp')
    } catch (err: any) {
      console.error('Error sending partner SMS OTP:', err)
      setError(err?.message || err?.code || 'تعذر إرسال كود الـ SMS، يرجى التثبت من صحة الرقم ومحاولة الإرسال مجدداً.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!confirmationResult) {
        throw new Error('انتهت صلاحية الطلب، يرجى طلب كود جديد.')
      }

      const { user: firebaseUser } = await confirmationResult.confirm(otpCode)

      // Trade the SMS-verified Firebase user for a Supabase session that RLS can check
      const res = await fetch('/api/auth/phone/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await firebaseUser.getIdToken() }),
      })
      await firebaseSignOut(auth).catch(() => {})

      if (res.status === 403) {
        setError(`رقم الهاتف (${formattedPhoneState || phoneNumber}) غير مرتبط بأي متجر مسجل. يرجى التواصل مع إدارة المنصة.`)
        return
      }
      if (!res.ok) {
        throw new Error('تعذر إكمال تسجيل الدخول، يرجى المحاولة مجدداً.')
      }

      const { access_token, refresh_token, restaurant_id } = await res.json()
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token })
      if (sessionError) throw sessionError

      // Redirect immediately to owner dashboard
      router.push(`/restaurant-panel/${restaurant_id}`)
    } catch (err: any) {
      console.error('Error verifying owner login:', err)
      setError(err?.message || 'كود التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد وإعادة المحاولة.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-page flex items-center justify-center p-4">
        <div id="dashboard-recaptcha"></div>
        <p className="font-bold">جاري التحميل...</p>
      </main>
    )
  }

  return (
    <main dir="rtl" className="min-h-screen bg-page flex items-center justify-center p-4">
      {/* Invisible Recaptcha Container */}
      <div id="dashboard-recaptcha"></div>

      <div className="card p-5 w-full max-w-md space-y-5">
        <div className="space-y-2">
          <BrandLogo />
          <h1 className="section-title">دخول أصحاب المتاجر</h1>
          <p className="text-muted font-medium">أضف منتجاتك وأسعارك وعدّلها من هنا.</p>
        </div>

        {unregisteredError && (
          <div className="notice notice-warn space-y-3">
            <p>
              الرقم <span dir="ltr" className="inline-block">{unregisteredError}</span> غير مسجل لدينا. تواصل معنا لإضافة متجرك.
            </p>
            <a
              href={supportWhatsappUrl(`مرحباً، أود تسجيل متجري في منصة ألف سوق برقم الهاتف: ${unregisteredError}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-block"
            >
              تواصل معنا على واتساب
            </a>
          </div>
        )}

        {error && <p className="notice notice-bad">{error}</p>}
        {infoMessage && step === 'otp' && <p className="notice notice-info">{infoMessage}</p>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="owner-phone" className="field-label">رقم هاتفك المسجل</label>
              <div className="flex gap-2" dir="ltr">
                <select
                  aria-label="رمز الدولة"
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="field !w-auto shrink-0"
                >
                  <option value="+90">+90</option>
                  <option value="+963">+963</option>
                  <option value="+966">+966</option>
                  <option value="+971">+971</option>
                  <option value="+965">+965</option>
                </select>
                <input
                  id="owner-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  required
                  value={phoneNumber}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="000 000 0000"
                  className="field min-w-0"
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || !phoneNumber} className="btn btn-primary btn-lg btn-block">
              {isSubmitting ? 'جاري الإرسال...' : 'أرسل لي رمز الدخول'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="owner-otp" className="field-label">
                اكتب الرمز الذي وصلك في رسالة إلى <span dir="ltr" className="inline-block">{formattedPhoneState}</span>
              </label>
              <input
                id="owner-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="000000"
                dir="ltr"
                className="field text-center text-2xl font-black tracking-[0.3em]"
              />
            </div>

            <button type="submit" disabled={isSubmitting || otpCode.length < 6} className="btn btn-primary btn-lg btn-block">
              {isSubmitting ? 'جاري التحقق...' : 'دخول'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtpCode('')
                setError(null)
                setInfoMessage(null)
              }}
              className="btn btn-secondary btn-block"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}

        {step === 'phone' && (
          <p className="text-center pt-1">
            <a
              href={supportWhatsappUrl('مرحباً، أرغب في إضافة متجري إلى منصة ألف سوق')}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-brand underline underline-offset-4"
            >
              ليس عندك حساب؟ تواصل معنا لإضافة متجرك
            </a>
          </p>
        )}
      </div>
    </main>
  )
}
