'use client'

import React from 'react'

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark' | 'colored'
  showSubtitle?: boolean
  className?: string
}

export default function BrandLogo({
  size = 'md',
  variant = 'colored',
  showSubtitle = true,
  className = ''
}: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-8 h-8 text-base rounded-xl',
    md: 'w-10 h-10 text-xl rounded-2xl',
    lg: 'w-14 h-14 text-3xl rounded-3xl'
  }

  const titleSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl'
  }

  const subtitleSizes = {
    sm: 'text-[9px]',
    md: 'text-[11px]',
    lg: 'text-xs'
  }

  const isLight = variant === 'light'

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Logo Icon Badge */}
      <div className={`relative flex items-center justify-center font-black shadow-lg transition-transform hover:scale-105 ${iconSizes[size]} bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-500/25`}>
        {/* Glow Ring */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-400 rounded-2xl blur-sm opacity-50 -z-10" />
        
        {/* Symbol */}
        <span className="leading-none drop-shadow-sm font-sans">أ</span>
        
        {/* Sparkle Dot */}
        <span className="absolute top-1 left-1 w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75" />
      </div>

      {/* Typography */}
      <div className="flex flex-col">
        <div className={`font-black tracking-tight leading-none flex items-center gap-1 ${titleSizes[size]} ${isLight ? 'text-white' : 'text-slate-900'}`}>
          <span>ألف</span>
          <span className="text-orange-500">سوق</span>
        </div>
        {showSubtitle && (
          <span className={`font-bold tracking-widest uppercase mt-0.5 ${subtitleSizes[size]} ${isLight ? 'text-orange-200/80' : 'text-slate-500'}`}>
            ALFSOUQ.COM
          </span>
        )}
      </div>
    </div>
  )
}
