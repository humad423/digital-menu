'use client'

import { useEffect, useState } from 'react'
import { getStoreStatus } from '@/utils/storeStatus'
import { isStoreWithinRange } from '@/utils/distance'

export default function StoreHeaderBanner({ restaurant }: { restaurant: any }) {
  const [outOfRadius, setOutOfRadius] = useState(false)
  const status = getStoreStatus(restaurant)

  useEffect(() => {
    try {
      // Use the same key that PlatformClient writes to
      const stored = localStorage.getItem('alfsouq_user_loc')
      if (stored && restaurant.latitude && restaurant.longitude) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) {
          const within = isStoreWithinRange(Number(parsed.lat), Number(parsed.lng), restaurant)
          if (!within) {
            setOutOfRadius(true)
          }
        }
      }
    } catch (e) {}
  }, [restaurant])

  return (
    <div className="space-y-2 mb-3" dir="rtl">

      {/* 1. Closed / Holiday Warning Banner */}
      {!status.isOpen && (
        <div className="bg-rose-600 text-white rounded-2xl p-3.5 px-4 shadow-md flex items-start gap-3 border border-rose-700">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-base font-black">
            🔒
          </div>
          <div>
            <h4 className="font-black text-xs text-white flex items-center gap-1.5">
              <span>المطعم مغلق حالياً</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{status.statusText}</span>
            </h4>
            <p className="text-[11px] text-rose-100 font-bold mt-1 leading-relaxed">
              {restaurant.is_on_holiday
                ? 'المطعم في عطلة رسمية حالياً، يرجى المراجعة لاحقاً.'
                : 'يمكنك تصفح الوجبات والأقسام الآن، ولكن لا يستقبل المطعم الطلبات في الوقت الحالي.'}
            </p>
          </div>
        </div>
      )}

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
