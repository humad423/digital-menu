'use client'

import { useEffect, useState } from 'react'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'
import { Bike } from 'lucide-react'

export default function StoreDeliveryBadge({ restaurant }: { restaurant: any }) {
  const [deliveryInfo, setDeliveryInfo] = useState<{
    available: boolean
    fee: number
    distanceKm: number | null
    tierName?: string
  } | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('alfsouq_user_loc')
      if (stored && restaurant?.latitude && restaurant?.longitude) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) {
          const dist = calculateDistance(
            Number(parsed.lat),
            Number(parsed.lng),
            Number(restaurant.latitude),
            Number(restaurant.longitude)
          )
          const info = getDeliveryFeeForDistance(
            dist,
            restaurant.delivery_tiers,
            restaurant.delivery_radius_km
          )
          setDeliveryInfo({
            ...info,
            distanceKm: dist
          })
        }
      }
    } catch (e) {}
  }, [restaurant])

  if (restaurant?.has_delivery === false) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-lg">
        🏪 استلام من الفرع
      </span>
    )
  }

  if (!deliveryInfo) {
    return null
  }

  if (!deliveryInfo.available) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 rounded-lg">
        🚫 خارج نطاق التوصيل {deliveryInfo.distanceKm !== null && `(${deliveryInfo.distanceKm.toFixed(1)} كم)`}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-lg">
      <Bike size={12} className="text-emerald-600 shrink-0" />
      <span>
        توصيل {deliveryInfo.fee === 0 ? 'مجاني' : `${deliveryInfo.fee} ₺`}
      </span>
      {deliveryInfo.distanceKm !== null && (
        <span className="text-[10px] opacity-75 font-normal">
          ({deliveryInfo.distanceKm.toFixed(1)} كم)
        </span>
      )}
    </span>
  )
}
