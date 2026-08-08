'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Phone, Lock, X, CheckCircle, AlertCircle, ArrowRight, MessageSquare } from 'lucide-react'

export default function PhoneAuthModal() {
  const { isAuthModalOpen, closeAuthModal, onSuccessCallback, loginWithTestPhone } = useAuth()
  const [countryCode, setCountryCode] = useState('+90')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [formattedPhoneState, setFormattedPhoneState] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthModalOpen) {
      setStep('phone')
      setPhoneNumber('')
      setOtpCode('')
      setError(null)
      setInfoMessage(null)
      setLoading(false)
    }
  }, [isAuthModalOpen])

  if (!isAuthModalOpen) return null

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfoMessage(null)
    setLoading(true)

    let raw = phoneNumber.trim().replace(/\s+/g, '')
    if (raw.startsWith('0')) raw = raw.replace(/^0+/, '')
    let formattedPhone = raw.startsWith('+') ? raw : countryCode + raw
    setFormattedPhoneState(formattedPhone)

    try {
      const res = await fetch('/api/auth/send-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إرسال كود الواتساب، يرجى المحاولة مجدداً')
      }

      setInfoMessage(data.message || 'تم إرسال رمز التفعيل بنجاح عبر الواتساب 💬')
      setStep('otp')
    } catch (err: any) {
      console.error('Error sending WhatsApp OTP:', err)
      setError(err?.message || 'تعذر إرسال كود التحقق عبر الواتساب، يرجى التثبت من الرقم.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-whatsapp-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhoneState || phoneNumber, code: otpCode })
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'كود التحقق غير صحيح أو انتهت صلاحيته')
      }

      await loginWithTestPhone(data.phone || formattedPhoneState || phoneNumber)
      closeAuthModal()
      if (onSuccessCallback) {
        onSuccessCallback()
      }
    } catch (err: any) {
      console.error('Error verifying WhatsApp OTP:', err)
      setError(err?.message || 'كود التحقق غير صحيح أو انتهت صلاحيته. يرجى إعادة المحاولة.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-emerald-100 overflow-hidden dir-rtl">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            {step === 'phone' ? <MessageSquare size={26} /> : <Lock size={26} />}
          </div>
          <h3 className="text-xl font-black text-gray-900">
            {step === 'phone' ? 'تسجيل الدخول عبر الواتساب' : 'تأكيد كود الواتساب'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {step === 'phone'
              ? 'أدخل رقم هاتفك ليصلك كود التفعيل المباشر على حساب الواتساب الخاص بك.'
              : `أدخل كود التحقق المكون من 6 أرقام المرسل إلى الواتساب (${formattedPhoneState || phoneNumber})`}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Info Alert */}
        {infoMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
            <CheckCircle size={16} className="shrink-0 text-emerald-600" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Step 1: Phone Input Form */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف المرتبط بالواتساب</label>
              
              {/* LTR Phone Input Bar */}
              <div className="flex items-center border border-gray-200 rounded-2xl bg-gray-50 focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition overflow-hidden dir-ltr">
                {/* Country Select */}
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

                {/* Phone Input */}
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={e => {
                    let val = e.target.value
                    if (val.startsWith('0')) {
                      val = val.replace(/^0+/, '')
                    }
                    setPhoneNumber(val)
                  }}
                  placeholder="552 123 45 67"
                  className="w-full px-4 py-3.5 text-sm font-black bg-transparent focus:outline-none text-left dir-ltr placeholder:text-gray-300 text-gray-900 tracking-wider"
                />
              </div>
              
              <p className="text-[11px] text-gray-400 mt-1.5">اكتب رقمك مباشرة بدون الـ 0 (مثال: 5521234567)</p>
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>إرسال كود التفعيل عبر الواتساب 💬</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">رمز تفعيل الواتساب (WhatsApp OTP)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full py-3 border-2 border-emerald-200 rounded-2xl text-2xl font-black text-center tracking-[0.5em] text-emerald-600 bg-emerald-50/50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition dir-ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/25 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
              className="w-full text-xs text-gray-500 font-bold hover:underline text-center block pt-1 cursor-pointer"
            >
              تغيير رقم الهاتف ↩️
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
