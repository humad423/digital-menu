'use client'

import { useEffect, useState } from 'react'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'
import { getStoreStatus, type StoreStatus } from '@/utils/storeStatus'
import { readUserLocation } from '@/utils/userLocation'
import { CURRENCY_SYMBOL } from '@/config/site'

function closedMessage(restaurant: any, status: StoreStatus): string {
  if (restaurant.is_on_holiday) return restaurant.holiday_message || 'المتجر في عطلة حالياً.'
  if (status.subText?.startsWith('عطلة يوم')) return `${status.subText}. يمكنك تصفح المنتجات والطلب في أيام الدوام.`
  return `ساعات العمل من ${restaurant.opening_time || '09:00'} إلى ${restaurant.closing_time || '23:00'}. يمكنك تصفح المنتجات، والطلب يكون في وقت الدوام.`
}

/** Open or closed and delivery depend on the time and the visitor, so they're worked out in the browser. */
export default function StoreInfo({ restaurant }: { restaurant: any }) {
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [delivery, setDelivery] = useState<string | null>(null)
  const [outOfRange, setOutOfRange] = useState(false)

  useEffect(() => {
    setStatus(getStoreStatus(restaurant))

    if (restaurant.has_delivery === false) {
      setDelivery('استلام من المتجر فقط، بدون توصيل')
      return
    }

    const saved = readUserLocation()
    if (!saved || !restaurant.latitude || !restaurant.longitude) {
      setDelivery('يوجد توصيل')
      return
    }

    const distance = calculateDistance(saved.lat, saved.lng, Number(restaurant.latitude), Number(restaurant.longitude))
    const info = getDeliveryFeeForDistance(distance, restaurant.delivery_tiers, restaurant.delivery_radius_km)
    const away = `يبعد عنك ${distance.toFixed(1)} كم`

    if (!info.available) {
      setOutOfRange(true)
      setDelivery(away)
    } else if (!info.hasTiers) {
      setDelivery(`يوجد توصيل · ${away}`)
    } else {
      setDelivery(`${info.fee === 0 ? 'توصيل مجاني' : `التوصيل ${info.fee} ${CURRENCY_SYMBOL}`} · ${away}`)
    }
  }, [restaurant])

  return (
    <div className="space-y-3">
      {/* Space is kept so the page doesn't jump when this appears */}
      <div className="min-h-[3.5rem]">
        {status && (
          <p className="font-bold">
            <span className={status.isOpen ? 'text-whatsapp' : 'text-red-700'}>{status.statusText}</span>
            {status.subText && <span className="text-muted font-medium"> · {status.subText}</span>}
          </p>
        )}
        {delivery && <p className="text-muted font-medium">{delivery}</p>}
      </div>

      {restaurant.menu_note?.trim() && <p className="notice notice-info">{restaurant.menu_note.trim()}</p>}

      {status && !status.isOpen && <p className="notice notice-warn">{closedMessage(restaurant, status)}</p>}

      {outOfRange && (
        <p className="notice notice-warn">موقعك خارج نطاق التوصيل المعتاد. يمكنك الاتفاق مع المتجر عبر واتساب.</p>
      )}
    </div>
  )
}
