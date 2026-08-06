'use client'

import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export default function UserAuthButton({
  className = "",
  variant = "light"
}: {
  className?: string
  variant?: "light" | "dark"
}) {
  const { isLoggedIn, profile, openAuthModal, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)

  const isLight = variant === "light"

  const displayName = profile?.full_name && profile.full_name.trim() && profile.full_name !== 'زبون جديد'
    ? profile.full_name
    : '(بدون اسم)'

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => openAuthModal()}
        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm ${
          isLight
            ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
        } ${className}`}
      >
        <User size={15} className={isLight ? 'text-orange-400' : 'text-orange-500'} />
        <span>تسجيل الدخول</span>
      </button>
    )
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition active:scale-95 shadow-sm max-w-[150px] ${
          isLight
            ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
        } ${className}`}
      >
        <div className="w-5 h-5 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
          <User size={12} />
        </div>
        <span className="font-bold text-xs truncate">
          {displayName}
        </span>
        <ChevronDown size={13} className={`transition-transform shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Popup */}
      {showDropdown && (
        <div className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-fade-in text-right">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[11px] text-slate-400 font-bold">الحساب المسجل</p>
            <p className="text-xs font-black text-slate-900 truncate">{displayName}</p>
            <p className="text-[10px] text-slate-500 font-bold dir-ltr text-right mt-0.5">{profile?.phone}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setShowDropdown(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition mt-1"
          >
            <User size={15} className="text-orange-500" />
            <span>حسابي الشخصي</span>
          </Link>

          {(profile?.role === 'restaurant_owner' || profile?.role === 'admin') && (
            <Link
              href={profile?.restaurant_id ? `/admin/restaurant/${profile.restaurant_id}` : '/admin'}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition"
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
