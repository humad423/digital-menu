'use client'

import React, { useState, useEffect } from 'react'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { Phone, Lock, X, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

export default function PhoneAuthModal() {
  const { isAuthModalOpen, closeAuthModal, onSuccessCallback, refreshProfile, loginWithTestPhone } = useAuth()
  const [countryCode, setCountryCode] = useState('+90')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [formattedPhoneState, setFormattedPhoneState] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmationResult, setConfirmationResult] = useState<any>(null)

  useEffect(() => {
    if (isAuthModalOpen) {
      setStep('phone')
      setPhoneNumber('')
      setOtpCode('')
      setError(null)
      setLoading(false)
    }
  }, [isAuthModalOpen])

  if (!isAuthModalOpen) return null

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // Recaptcha solved
          },
          'expired-callback': () => {
            setError('انتهت صلاحية التحقق، يرجى المحاولة مجدداً.')
          }
        }
      )
    }
    return (window as any).recaptchaVerifier
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Clean and format phone number automatically
    let raw = phoneNumber.trim().replace(/\s+/g, '')
    if (raw.startsWith('0')) raw = raw.replace(/^0+/, '')
    let formattedPhone = raw.startsWith('+') ? raw : countryCode + raw
    setFormattedPhoneState(formattedPhone)

    // Instant transition for development / test mode
    setStep('otp')
    setLoading(false)
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Test code verification (Accept 123456 or any code in test mode)
      await loginWithTestPhone(formattedPhoneState || phoneNumber)
      closeAuthModal()
      if (onSuccessCallback) {
        onSuccessCallback()
      }
    } catch (err: any) {
      console.error('Error verifying test OTP:', err)
      setError(err?.message || 'حدث خطأ أثناء تسجيل الدخول التجريبي.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div id="recaptcha-container"></div>
      
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-orange-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            {step === 'phone' ? <Phone size={26} /> : <Lock size={26} />}
          </div>
          <h3 className="text-xl font-black text-gray-900">
            {step === 'phone' ? 'تسجيل الدخول برقم الهاتف' : 'تأكيد كود SMS'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {step === 'phone'
              ? 'أدخل رقم هاتفك لتأكيد الطلب والتقييم وسنرسل لك رمز OTP آمن.'
              : `أدخل كود التحقق المكون من 6 أرقام المرسل إلى ${phoneNumber}`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Phone Input Form */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف</label>
              
              {/* LTR Phone Input Bar with Country Code on the Left */}
              <div className="flex items-center border border-gray-200 rounded-2xl bg-gray-50 focus-within:bg-white focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition overflow-hidden dir-ltr">
                {/* Country Select (Left Side) */}
                <select
                  value={countryCode}
                  onChange={e => setCountryCode(e.target.value)}
                  className="px-3 py-3.5 border-r border-gray-200 text-xs font-black bg-transparent focus:outline-none cursor-pointer shrink-0 text-gray-700 dir-ltr"
                >
                  <option value="+90">🇹🇷 +90</option>
                  <option value="+963">🇸🇾 +963</option>
                  <option value="+961">🇱🇧 +961</option>
                  <option value="+962">🇯🇴 +962</option>
                  <option value="+966">🇸🇦 +966</option>
                  <option value="+971">🇦🇪 +971</option>
                </select>

                {/* Phone Input (Right Side in LTR) */}
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => {
                    let val = e.target.value
                    // Automatically strip leading zero (e.g. 0552... becomes 552...)
                    if (val.startsWith('0')) {
                      val = val.replace(/^0+/, '')
                    }
                    setPhoneNumber(val)
                  }}
                  placeholder="552 123 45 67"
                  className="w-full px-4 py-3.5 text-sm font-black bg-transparent focus:outline-none text-left dir-ltr placeholder:text-gray-300 text-gray-900 tracking-wider"
                />
              </div>
              
              <p className="text-[11px] text-gray-400 mt-1.5">اكتب رقمك مباشرة بدون الـ 0 أو كود الدولة (مثال: 5521234567)</p>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>إرسال كود التحقق</span>
                  <ArrowRight size={18} className="rotate-180" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">رمز التحقق (SMS OTP)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full py-3 border-2 border-orange-200 rounded-2xl text-2xl font-black text-center tracking-[0.5em] text-orange-600 bg-orange-50/50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition dir-ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>تأكيد الرمز والدخول</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-xs text-gray-500 font-bold hover:underline text-center block pt-1"
            >
              تغيير رقم الهاتف
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
