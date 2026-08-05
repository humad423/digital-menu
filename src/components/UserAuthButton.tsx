'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { User, LogOut, Settings, ChevronDown, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function UserAuthButton({ className = "" }: { className?: string }) {
  const { isLoggedIn, profile, openAuthModal, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => openAuthModal()}
        className={`w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg hover:bg-white/30 active:scale-95 transition ${className}`}
        title="تسجيل الدخول"
      >
        <User size={20} className="text-orange-400" />
      </button>
    )
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`px-3 py-1.5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center gap-2 shadow-lg hover:bg-white/30 active:scale-95 transition ${className}`}
      >
        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
          <User size={15} />
        </div>
        <span className="text-xs font-black dir-ltr">
          {profile?.phone ? profile.phone.slice(-4) : 'مستخدم'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popup */}
      {showDropdown && (
        <div className="absolute left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-fade-in text-right">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] text-gray-400 font-bold">الحساب المسجل</p>
            <p className="text-xs font-black text-gray-800 dir-ltr">{profile?.phone}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setShowDropdown(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition mt-1"
          >
            <User size={15} className="text-orange-500" />
            <span>حسابي الشخصي</span>
          </Link>

          {(profile?.role === 'restaurant_owner' || profile?.role === 'admin') && (
            <Link
              href={profile?.restaurant_id ? `/admin/restaurant/${profile.restaurant_id}` : '/admin'}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition"
            >
              <Settings size={15} className="text-orange-500" />
              <span>لوحة تحكم المطعم</span>
            </Link>
          )}

          <button
            onClick={() => {
              setShowDropdown(false)
              logout()
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition mt-1"
          >
            <LogOut size={15} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </div>
  )
}
