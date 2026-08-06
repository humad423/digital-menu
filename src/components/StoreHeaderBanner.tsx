'use client'

import { useEffect, useState } from 'react'
import { getStoreStatus } from '@/utils/storeStatus'
import { isStoreWithinRange } from '@/utils/distance'

export default function StoreHeaderBanner({ restaurant }: { restaurant: any }) {
  const [outOfRadius, setOutOfRadius] = useState(false)
  const status = getStoreStatus(restaurant)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('alfsouq_user_loc')
      if (stored && restaurant.latitude && restaurant.longitude) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) {
          const within = isStoreWithinRange(Number(parsed.lat), Number(parsed.lng), restaurant)
          if (!within) setOutOfRadius(true)
        }
      }
    } catch (e) {}
  }, [restaurant])

  // Pick the right icon and message based on reason
  const getClosedContent = () => {
    if (restaurant.is_on_holiday) {
      return {
        icon: '🌴',
        title: 'المحل في عطلة رسمية',
        desc: 'المطعم في إجازة رسمية حالياً. يمكنك تصفح المنيو والطلب لاحقاً عند عودتهم.',
        bg: 'bg-amber-600 border-amber-700',
      }
    }
    if (status.subText?.startsWith('عطلة يوم')) {
      return {
        icon: '📅',
        title: `اليوم عطلة أسبوعية`,
        desc: `${status.subText} - المطعم مغلق رسمياً. يمكنك تصفح المنيو والطلب في أيام الدوام.`,
        bg: 'bg-amber-600 border-amber-700',
      }
    }
    // Outside working hours
    const openTime = restaurant.opening_time || '09:00'
    const closeTime = restaurant.closing_time || '23:00'
    return {
      icon: '🕐',
      title: 'خارج أوقات الدوام',
      desc: `المطعم مغلق حالياً. ساعات العمل من ${openTime} حتى ${closeTime}. يمكنك الطلب مسبقاً أو زيارتنا خلال وقت الدوام.`,
      bg: 'bg-rose-600 border-rose-700',
    }
  }

  return (
    <div className="space-y-2 mb-3" dir="rtl">

      {/* 1. Closed / Holiday Warning Banner */}
      {!status.isOpen && (() => {
        const content = getClosedContent()
        return (
          <div className={`${content.bg} text-white rounded-2xl p-3.5 px-4 shadow-md flex items-start gap-3 border`}>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-lg">
              {content.icon}
            </div>
            <div>
              <h4 className="font-black text-xs text-white mb-0.5 flex items-center gap-1.5">
                {content.title}
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{status.statusText}</span>
              </h4>
              <p className="text-[11px] text-white/85 font-bold leading-relaxed">
                {content.desc}
              </p>
            </div>
          </div>
        )
      })()}

      {/* 2. Out of Delivery Radius Warning Banner */}
      {outOfRadius && (
        <div className="bg-amber-500 text-white rounded-2xl p-3.5 px-4 shadow-md flex items-start gap-3 border border-amber-600">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-xl">
            📍
          </div>
          <div>
            <h4 className="font-black text-xs text-white mb-0.5">أنت خارج نطاق توصيل هذا المطعم</h4>
            <p className="text-[11px] text-amber-100 font-bold leading-relaxed">
              موقعك الحالي خارج نطاق التوصيل المعتاد لهذا المطعم. يمكنك تصفح المنيو والطلب عبر الواتساب والاتفاق مع المطعم مباشرة.
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
