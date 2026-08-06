'use client'

import { useEffect, useState } from 'react'
import { getStoreStatus } from '@/utils/storeStatus'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'

export default function StoreHeaderBanner({ restaurant }: { restaurant: any }) {
  const [outOfRadius, setOutOfRadius] = useState(false)
  const status = getStoreStatus(restaurant)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user_location')
      if (stored && restaurant.latitude && restaurant.longitude && restaurant.has_delivery !== false) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) {
          const dist = calculateDistance(Number(parsed.lat), Number(parsed.lng), Number(restaurant.latitude), Number(restaurant.longitude))
          const deliveryInfo = getDeliveryFeeForDistance(dist, restaurant.delivery_tiers)
          if (deliveryInfo && deliveryInfo.available === false) {
            setOutOfRadius(true)
          }
        }
      }
    } catch (e) {}
  }, [restaurant])

  return (
    <div className="space-y-2" dir="rtl">
      {/* 1. Closed / Holiday Warning Banner */}
      {!status.isOpen && (
        <div className="bg-rose-600 text-white rounded-2xl p-3.5 px-4 shadow-md flex items-start gap-3 border border-rose-700 animate-fade-in mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-base font-black">
            🔒
          </div>
          <div>
            <h4 className="font-black text-xs text-white flex items-center gap-1.5">
              <span>المطعم مغلق حالياً</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{status.statusText}</span>
            </h4>
            <p className="text-[11px] text-rose-100 font-bold mt-1 leading-relaxed">
              {restaurant.is_holiday
                ? (restaurant.holiday_message || 'المطعم في عطلة رسمية حالياً.')
                : 'يمكنك تصفح الوجبات والأقسام الآن، ولكن لا يستقبل المطعم الطلبات في الوقت الحالي.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Direct Link Out of Delivery Radius Warning Banner */}
      {status.isOpen && outOfRadius && (
        <div className="bg-amber-600 text-white rounded-2xl p-3.5 px-4 shadow-md flex items-start gap-3 border border-amber-700 animate-fade-in mb-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-base font-black">
            ⚠️
          </div>
          <div>
            <h4 className="font-black text-xs text-white">تنبيه: موقعك الحالي خارج نطاق التوصيل المعتاد</h4>
            <p className="text-[11px] text-amber-100 font-bold mt-1 leading-relaxed">
              أنت تتصفح هذا المطعم عبر رابط مباشر. يمكنك الطلب بكل الأحوال والاستلام أو الاتفاق مع المطعم عبر الواتساب.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
