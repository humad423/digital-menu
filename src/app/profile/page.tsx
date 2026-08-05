'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { User, Phone, Shield, ArrowRight, Save, LogOut, Settings, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { isLoggedIn, profile, refreshProfile, logout, openAuthModal } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5 text-center dir-rtl">
        <div className="w-16 h-16 rounded-3xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-black mb-4 shadow-inner">
          👤
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">يرجى تسجيل الدخول أولاً</h1>
        <p className="text-xs text-gray-500 max-w-xs mb-6 font-medium leading-relaxed">
          عليك تسجيل الدخول برقم هاتفك للوصول لإعدادات حسابك وتعديل معلوماتك الشخصية.
        </p>
        <button
          onClick={() => openAuthModal(() => router.refresh())}
          className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition"
        >
          تسجيل الدخول الآن 📲
        </button>
      </div>
    )
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id)

      if (error) throw error

      await refreshProfile()
      setSuccessMessage('تم حفظ التعديلات بنجاح! ✨')
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setErrorMessage('حدث خطأ أثناء حفظ المعلومات، يرجى المحاولة لاحقاً.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 dir-rtl">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition"
          >
            <ArrowRight size={18} />
          </Link>
          <h1 className="text-lg font-black text-gray-900">حسابي الشخصي</h1>
        </div>

        <button
          onClick={logout}
          className="text-xs text-red-600 font-bold bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <LogOut size={14} />
          <span>خروج</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-5 space-y-5">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              {profile?.full_name ? profile.full_name.charAt(0) : '👤'}
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">{profile?.full_name || 'مستخدم جديد'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-gray-500 dir-ltr">{profile?.phone}</span>
                <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                  {profile?.role === 'restaurant_owner' ? 'صاحب مطعم 🏪' : profile?.role === 'admin' ? 'مدير المنصة ⚙️' : 'زبون 🛒'}
                </span>
              </div>
            </div>
          </div>

          {/* Restaurant Owner Quick Link */}
          {(profile?.role === 'restaurant_owner' || profile?.role === 'admin') && (
            <Link
              href={profile?.restaurant_id ? `/admin/restaurant/${profile.restaurant_id}` : '/admin'}
              className="mb-5 p-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-between hover:shadow-lg transition block"
            >
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <span>الانتقال لإدارة مطعمك</span>
              </div>
              <ArrowRight size={16} className="rotate-180" />
            </Link>
          )}

          {/* Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">الاسم الكامل</label>
              <div className="relative">
                <span className="absolute right-3.5 top-3.5 text-gray-400">👤</span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="أدخل اسمك الكامل..."
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف (مؤكد بـ SMS)</label>
              <div className="relative">
                <span className="absolute right-3.5 top-3.5 text-gray-400">📱</span>
                <input
                  type="text"
                  disabled
                  value={profile?.phone || ''}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold bg-gray-100 text-gray-500 dir-ltr text-right cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-98 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={16} />
                  <span>حفظ البيانات والتعديلات</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
