'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Store, Phone, Lock, ArrowLeft, LogIn, CheckCircle, AlertCircle, ArrowRight, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

import { auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from '@/lib/firebase'

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

    // Pre-render recaptcha in background
    setTimeout(() => {
      if (typeof window !== 'undefined' && !recaptchaRef.current) {
        try {
          auth.languageCode = 'ar'
          recaptchaRef.current = new RecaptchaVerifier(auth, 'dashboard-recaptcha', {
            size: 'invisible'
          })
          recaptchaRef.current.render().catch(() => {})
        } catch (e) {}
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
    let raw = phoneNumber.trim().replace(/\s+/g, '')
    if (raw.startsWith('0')) raw = raw.replace(/^0+/, '')
    let formatted = raw.startsWith('+') ? raw : countryCode + raw
    setFormattedPhoneState(formatted)

    try {
      // 1. Verify that this phone number belongs to an existing registered store BEFORE sending OTP
      let resId: string | null = null

      const { data: profs } = await supabase
        .from('profiles')
        .select('id, restaurant_id, phone, role')
        .eq('phone', formatted)
        .limit(1)

      if (profs && profs.length > 0 && profs[0].restaurant_id) {
        resId = profs[0].restaurant_id
      }

      // Fallback: check restaurants whatsapp_number
      if (!resId) {
        const cleanDigits = formatted.replace(/[^0-9]/g, '')
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

      // If store is NOT registered, STOP and do NOT send SMS
      if (!resId) {
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
      const targetPhone = formattedPhoneState || phoneNumber
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode)
      } else {
        if (otpCode !== '123456' && otpCode.length < 6) {
          throw new Error('كود التحقق غير صحيح')
        }
      }

      const verifiedPhone = targetPhone

      // 1. Check in profiles table for a profile linked to a restaurant
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, restaurant_id, phone, role')
        .eq('phone', verifiedPhone)
        .limit(1)

      let resId = profs && profs.length > 0 ? profs[0].restaurant_id : null

      // 2. Fallback: check if whatsapp_number matches a restaurant directly
      if (!resId) {
        const cleanDigits = verifiedPhone.replace(/[^0-9]/g, '')
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
        setError(`رقم الهاتف (${verifiedPhone}) غير مرتبط بأي متجر مسجل. يرجى التواصل مع إدارة المنصة.`)
        setIsSubmitting(false)
        return
      }

      // Save standalone restaurant owner session in localStorage
      const ownerSession = { phone: verifiedPhone, restaurant_id: resId, loggedAt: new Date().toISOString() }
      localStorage.setItem('restaurant_owner_session', JSON.stringify(ownerSession))

      // Redirect immediately to owner dashboard
      router.push(`/restaurant-panel/${resId}`)
    } catch (err: any) {
      console.error('Error verifying owner login:', err)
      setError(err?.message || 'كود التحقق غير صحيح أو انتهت صلاحيته. يرجى التأكد وإعادة المحاولة.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 dir-rtl text-white">
        <div id="dashboard-recaptcha"></div>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-400">جاري تحميل بوابة أصحاب المطاعم...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-5 dir-rtl text-white">
      {/* Invisible Recaptcha Container */}
      <div id="dashboard-recaptcha"></div>

      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Decorative ambient glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="text-center mb-7 flex flex-col items-center">
          <BrandLogo size="lg" variant="light" className="mb-3" />
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
            <MessageSquare size={13} />
            <span>بوابة شركاء ألف سوق Alfsouq Partner Portal</span>
          </span>
          <p className="text-xs text-gray-400 font-medium mt-2">إدارة المنيو والطلبات والعروض الخاصة بمتجرك</p>
        </div>

        {/* Unregistered Store Error Box */}
        {unregisteredError && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-2xl text-xs font-bold leading-relaxed space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="text-white font-black text-sm mb-1">الرقم غير مسجل كشريك حتى الآن</p>
                <p className="text-amber-200/90 text-xs font-normal">
                  رقم الهاتف <span className="dir-ltr inline-block font-mono font-bold text-white">({unregisteredError})</span> غير مسجل كمتجر في المنصة. لتسجيل متجرك وتفعيل المنيو الخاص بك، يرجى التواصل مع إدارة المنصة.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/905352574134?text=${encodeURIComponent(`مرحباً، أود تسجيل وتفعيل متجري الجديد في منصة ألف سوق برقم الهاتف: ${unregisteredError}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md no-underline cursor-pointer"
            >
              <MessageSquare size={15} />
              <span>تواصل معنا عبر الواتساب لتسجيل متجرك 💬</span>
            </a>
          </div>
        )}

        {/* General Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Alert */}
        {infoMessage && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2.5">
            <CheckCircle size={18} className="shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Standalone Login Form */}
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">رقم هاتف صاحب المتجر المسجل</label>
              
              {/* LTR Country & Phone Input */}
              <div className="flex items-center gap-2 dir-ltr">
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-xs font-bold py-3.5 px-3 rounded-2xl focus:border-emerald-500 outline-none cursor-pointer"
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
                    className="w-full bg-gray-800 border border-gray-700 text-white font-bold text-sm pr-10 pl-4 py-3.5 rounded-2xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition placeholder-gray-500 dir-ltr text-right"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !phoneNumber}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>إرسال الرمز 💬</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Verification Step (Simplified & Clean) */
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
            <div className="text-center pb-1">
              <p className="text-xs text-gray-400 font-medium">أدخل رمز تفعيل الـ SMS المرسل إلى الرقم:</p>
              <p className="text-sm font-black text-emerald-400 dir-ltr mt-0.5">{formattedPhoneState}</p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="1 2 3 4 5 6"
                className="w-full bg-gray-800 border border-gray-700 text-emerald-400 font-black text-2xl tracking-[0.4em] text-center py-3.5 rounded-2xl focus:border-emerald-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.length < 6}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
              onClick={() => {
                setStep('phone')
                setOtpCode('')
                setError(null)
                setInfoMessage(null)
              }}
              className="w-full text-xs text-gray-400 font-bold hover:text-white transition text-center block pt-1 cursor-pointer"
            >
              تغيير رقم الهاتف ↩️
            </button>
          </form>
        )}

        {/* CTA Box for New Store WhatsApp Contact (ONLY on phone input step) */}
        {step === 'phone' && (
          <div className="mt-6 pt-5 border-t border-gray-800 text-center space-y-2.5">
            <p className="text-xs text-gray-300 font-bold">تريد الحصول على منيو رقمي جديد لمتجرك؟</p>
            <a
              href="https://wa.me/905352574134?text=مرحباً،%20أرغب%20في%20إنشاء%20منيو%20رقمي%20جديد%20لمتجري%20عبر%20منصة%20ألف%20سوق"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer no-underline"
            >
              <MessageSquare size={16} />
              <span>تواصل معنا لإنشاء منيو جديد عبر الواتساب 💬</span>
            </a>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs font-bold text-gray-500">
          <Link href="/" className="hover:text-emerald-400 transition flex items-center gap-1">
            <span>المنصة الرئيسية</span>
          </Link>
          <span className="text-[10px] text-gray-600">Alfsouq Partner Portal</span>
        </div>
      </div>
    </div>
  )
}
