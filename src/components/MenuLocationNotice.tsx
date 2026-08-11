'use client'

import { useEffect, useState } from 'react'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'
import { MapPin, Navigation, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

export default function MenuLocationNotice({ restaurant }: { restaurant: any }) {
  const [outOfRangeInfo, setOutOfRangeInfo] = useState<{
    distanceKm: number
    isPrecise: boolean
  } | null>(null)

  const [loadingLocation, setLoadingLocation] = useState(false)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 1. Check if user dismissed the notice during this session
    try {
      if (sessionStorage.getItem('alfsouq_dismiss_loc_notice') === 'true') {
        setDismissed(true)
        return
      }
    } catch (e) {}

    // 2. Validate store has delivery and valid coordinates
    if (!restaurant || restaurant.has_delivery === false) return
    if (!restaurant.latitude || !restaurant.longitude) return

    const storeLat = Number(restaurant.latitude)
    const storeLng = Number(restaurant.longitude)
    if (isNaN(storeLat) || isNaN(storeLng) || storeLat === 0) return

    const checkUserLocation = async () => {
      let userLat: number | null = null
      let userLng: number | null = null
      let isPrecise = false

      // Check stored user location first (from GPS or previous selection)
      try {
        const stored = localStorage.getItem('alfsouq_user_loc')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.lat && parsed.lng) {
            userLat = Number(parsed.lat)
            userLng = Number(parsed.lng)
            isPrecise = parsed.isPrecise === true
          }
        }
      } catch (e) {}

      // If no stored location, fetch approximate IP-based location silently
      if (!userLat || !userLng) {
        try {
          // Provider 1: ipwho.is (Highly accurate for Middle East & Turkey)
          const res = await fetch('https://ipwho.is/')
          const data = await res.json()
          if (data && data.success !== false && data.latitude && data.longitude) {
            userLat = Number(data.latitude)
            userLng = Number(data.longitude)
            isPrecise = false
          }
        } catch (e) {
          try {
            // Provider 2: BigDataCloud
            const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=ar')
            const data = await res.json()
            if (data && data.latitude && data.longitude) {
              userLat = Number(data.latitude)
              userLng = Number(data.longitude)
              isPrecise = false
            }
          } catch (err) {}
        }
      }

      if (userLat && userLng) {
        const dist = calculateDistance(userLat, userLng, storeLat, storeLng)
        const feeInfo = getDeliveryFeeForDistance(
          dist,
          restaurant.delivery_tiers,
          restaurant.delivery_radius_km
        )

        if (!feeInfo.available) {
          setOutOfRangeInfo({
            distanceKm: dist,
            isPrecise
          })
        }
      }
    }

    checkUserLocation()
  }, [restaurant])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem('alfsouq_dismiss_loc_notice', 'true')
    } catch (e) {}
  }

  const handleCalibrateLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('عذراً، متصفحك لا يدعم الخدمة المباشرة للموقع الجغرافي.')
      return
    }

    setLoadingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        // Save accurate GPS location in localStorage
        try {
          localStorage.setItem(
            'alfsouq_user_loc',
            JSON.stringify({ lat, lng, isPrecise: true, timestamp: Date.now() })
          )
          window.dispatchEvent(new Event('alfsouq_user_loc_updated'))
        } catch (e) {}

        const storeLat = Number(restaurant.latitude)
        const storeLng = Number(restaurant.longitude)
        const dist = calculateDistance(lat, lng, storeLat, storeLng)
        const feeInfo = getDeliveryFeeForDistance(
          dist,
          restaurant.delivery_tiers,
          restaurant.delivery_radius_km
        )

        setLoadingLocation(false)

        if (feeInfo.available) {
          setOutOfRangeInfo(null)
          setSuccessNotice(`رائع! أنت داخل نطاق التوصيل للمتجر (${dist.toFixed(1)} كم) 🟢`)
          setTimeout(() => {
            setSuccessNotice(null)
          }, 4000)
        } else {
          setOutOfRangeInfo({
            distanceKm: dist,
            isPrecise: true
          })
          alert(`تم تحديد موقعك الدقيق (${dist.toFixed(1)} كم). أنت لا تزال خارج نطاق التوصيل المعتاد، لكن يمكنك متابعة الطلب والتصفح بحرية.`)
        }
      },
      (err) => {
        setLoadingLocation(false)
        console.warn('Geolocation denied or error:', err)
        alert('يرجى التكرم بالسماح للمتصفح بالوصول للموقع ليتم تحديد المسافة بدقة.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  if (dismissed) return null

  // Render Success Notice Toast if location was calibrated successfully
  if (successNotice) {
    return (
      <div className="w-full bg-emerald-500/15 border-b border-emerald-500/30 backdrop-blur-md text-emerald-950 px-3 py-1.5 text-xs font-bold flex items-center justify-between gap-2 animate-fade-in dir-rtl">
        <div className="flex items-center gap-1.5 truncate">
          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
          <span className="truncate">{successNotice}</span>
        </div>
        <button
          onClick={() => setSuccessNotice(null)}
          className="text-emerald-700 hover:text-emerald-950 p-0.5 shrink-0 transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  // Render Notice ONLY if user approximate location is outside delivery range
  if (!outOfRangeInfo) return null

  const formattedDistanceText = outOfRangeInfo.isPrecise
    ? `خارج مسافة التوصيل المتاحة (${outOfRangeInfo.distanceKm.toFixed(1)} كم) • التصفح والطلب متاح`
    : `حدد موقعك للتأكد من إمكانية التوصيل • التصفح والطلب متاح`

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md text-amber-950 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] font-bold animate-fade-in dir-rtl">
      {/* Text & Icon */}
      <div className="flex items-center gap-1.5 min-w-0">
        <MapPin size={14} className="text-amber-600 shrink-0" />
        <span className="truncate">{formattedDistanceText}</span>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleCalibrateLocation}
          disabled={loadingLocation}
          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] rounded-md transition flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
          title="تحديد موقعك الآن"
        >
          {loadingLocation ? (
            <Loader2 size={11} className="animate-spin text-slate-950" />
          ) : (
            <Navigation size={11} className="shrink-0" />
          )}
          <span>{loadingLocation ? 'تحديد...' : 'تحديد الموقع 📍'}</span>
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-amber-700 hover:text-amber-950 p-0.5 shrink-0 transition cursor-pointer"
          title="إغلاق التنبيه"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
