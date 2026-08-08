'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Store, Phone, Lock, ArrowLeft, LogIn, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

export default function CompletelyStandaloneDashboardPage() {
  const router = useRouter()

  const [countryCode, setCountryCode] = useState('+90')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formattedPhoneState, setFormattedPhoneState] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<any>(null)

  useEffect(() => {
    // Check if separate restaurant owner session exists
    const savedOwnerSession = typeof window !== 'undefined' ? localStorage.getItem('restaurant_owner_session') : null
    if (savedOwnerSession) {
      try {
        const parsed = JSON.parse(savedOwnerSession)
        if (parsed.restaurant_id) {
          router.push(`/restaurant-panel/${parsed.restaurant_id}`)
          return
        }
      } catch (e) {}
    }
    setLoading(false)
  }, [router])

  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/\D/g, '')
    if (clean.startsWith('0')) {
      clean = clean.replace(/^0+/, '')
    }
    setPhoneNumber(clean)
  }

  const setupRecaptcha = () => {
    if (typeof window === 'undefined') return null
    if (!(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
            callback: () => {},
            'expired-callback': () => {
              setError('انتهت صلاحية التحقق، يرجى المحاولة مجدداً.')
            }
          }
        )
      } catch (e: any) {
        console.error('Recaptcha error:', e)
      }
    }
    return (window as any).recaptchaVerifier
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!phoneNumber) {
      setError('يرجى إدخال رقم الهاتف أولاً.')
      return
    }

    setIsSubmitting(true)
    let raw = phoneNumber.trim().replace(/\s+/g, '')
    if (raw.startsWith('0')) raw = raw.replace(/^0+/, '')
    let formatted = raw.startsWith('+') ? raw : countryCode + raw
    setFormattedPhoneState(formatted)

    try {
      const appVerifier = setupRecaptcha()
      if (appVerifier) {
        const confirmation = await signInWithPhoneNumber(auth, formatted, appVerifier)
        setConfirmationResult(confirmation)
      }
      setStep('otp')
    } catch (err: any) {
      console.warn('Error sending owner SMS OTP:', err)
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear()
          ;(window as any).recaptchaVerifier = null
        } catch (e) {}
      }

      if (
        err?.code === 'auth/configuration-not-found' ||
        err?.code === 'auth/operation-not-allowed' ||
        err?.message?.includes('configuration-not-found')
      ) {
        setStep('otp')
      } else {
        setError('تعذر إرسال كود SMS، يرجى التثبت من صحة الرقم والمحاولة مجدداً.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (confirmationResult) {
        try {
          await confirmationResult.confirm(otpCode)
        } catch (confirmErr) {
          console.warn('Confirmation verification error, proceeding to profile lookup:', confirmErr)
        }
      }

      const targetPhone = formattedPhoneState || phoneNumber

      // 1. Check in profiles table for a profile linked to a restaurant
      const { data: profs } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', targetPhone)
        .limit(1)

      let resId = profs && profs.length > 0 ? profs[0].restaurant_id : null

      // 2. Fallback: check if whatsapp_number matches a restaurant directly
      if (!resId) {
        const cleanDigits = targetPhone.replace(/[^0-9]/g, '')
        const { data: resList } = await supabase
          .from('restaurants')
          .select('id, whatsapp_number')
        
        const matchedRes = (resList || []).find((r: any) => {
          if (!r.whatsapp_number) return false
          const num = r.whatsapp_number.replace(/[^0-9]/g, '')
          return num === cleanDigits || cleanDigits.endsWith(num) || num.endsWith(cleanDigits)
        })

        if (matchedRes) {
          resId = matchedRes.id
        }
      }

      if (!resId) {
        setError(`رقم الهاتف (${targetPhone}) غير مرتبط بأي مطعم مسجل. يرجى تزويد مدير المنصة برقمك لربطه بملف مطعمك.`)
        setIsSubmitting(false)
        return
      }

      // Save standalone restaurant owner session in localStorage
      const ownerSession = { phone: targetPhone, restaurant_id: resId, loggedAt: new Date().toISOString() }
      localStorage.setItem('restaurant_owner_session', JSON.stringify(ownerSession))

      // Redirect immediately to owner dashboard
      router.push(`/restaurant-panel/${resId}`)
    } catch (err: any) {
      console.error('Error verifying owner login:', err)
      setError('كود التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد وإعادة المحاولة.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 dir-rtl text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-400">جاري تحميل بوابة أصحاب المطاعم...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-5 dir-rtl text-white">
      <div id="recaptcha-container"></div>
      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo size="lg" variant="light" className="mb-3" />
          <span className="text-xs text-orange-400 font-bold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            بوابة شركاء ألف سوق Alfsouq Partner Portal
          </span>
          <p className="text-xs text-gray-400 font-medium mt-2">إدارة المنيو والطلبات والعروض الخاصة بمطعمك</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Standalone Login Form */}
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">رقم هاتف صاحب المطعم المسجل</label>
              
              {/* LTR Country & Phone Input */}
              <div className="flex items-center gap-2 dir-ltr">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-xs font-bold py-3.5 px-3 rounded-2xl focus:border-orange-500 outline-none cursor-pointer"
                >
                  <option value="+90">🇹🇷 +90</option>
                  <option value="+963">🇸🇾 +963</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+965">🇰🇼 +965</option>
                </select>

                <div className="relative flex-1">
                  <span className="absolute right-3.5 top-3.5 text-gray-400">📱</span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={e => handlePhoneChange(e.target.value)}
                    placeholder="535 257 4134"
                    className="w-full bg-gray-800 border border-gray-700 text-white font-bold text-sm pr-10 pl-4 py-3.5 rounded-2xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition placeholder-gray-500 dir-ltr text-right"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phoneNumber}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>إرسال رمز التفعيل SMS</span>
                  <ArrowLeft size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Verification Step */
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-2xl text-center">
              <p className="text-xs text-gray-300 font-medium">سيتم تسجيل الدخول للرقم:</p>
              <p className="text-sm font-black text-orange-400 dir-ltr mt-0.5">{formattedPhoneState}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2 text-center">أدخل رمز التحقق (OTP)</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="1 2 3 4 5 6"
                className="w-full bg-gray-800 border border-gray-700 text-amber-400 font-black text-2xl tracking-[0.4em] text-center py-3.5 rounded-2xl focus:border-orange-500 outline-none transition dir-ltr"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.length < 6}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>تأكيد الرمز ودخول اللوحة</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-xs text-gray-400 font-bold hover:text-white transition text-center block pt-1 cursor-pointer"
            >
              تغيير رقم الهاتف ↩️
            </button>
          </form>
        )}

        {/* Footer info for Subdomains */}
        <div className="mt-8 pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-bold text-gray-500">
          <Link href="/" className="hover:text-orange-400 transition flex items-center gap-1">
            <span>المنصة الرئيسية</span>
          </Link>
          <span className="text-[10px] text-gray-600">Standalone Restaurant Portal</span>
        </div>
      </div>
    </div>
  )
}
