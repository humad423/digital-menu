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

      // If no stored location, fetch approximate IP-based location silently in background
      if (!userLat || !userLng) {
        try {
          const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=ar')
          const data = await res.json()
          if (data && data.latitude && data.longitude) {
            userLat = Number(data.latitude)
            userLng = Number(data.longitude)
            isPrecise = false
          }
        } catch (e) {
          // Fallback to IP-API
          try {
            const res = await fetch('https://ipapi.co/json/')
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
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md sm:max-w-lg mx-auto animate-bounce-short dir-rtl">
        <div className="bg-emerald-900/95 text-white backdrop-blur-md rounded-2xl p-3 px-4 shadow-2xl border border-emerald-500/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-300 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  // Render Warning Notice if user is outside delivery range
  if (!outOfRangeInfo) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md sm:max-w-lg mx-auto animate-fade-in dir-rtl">
      <div className="bg-slate-900/95 text-white backdrop-blur-xl rounded-2xl p-3 shadow-2xl border border-amber-500/30 flex items-center justify-between gap-3">
        {/* Warning Icon & Text */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <AlertTriangle size={17} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-300 truncate">
                خارج نطاق التوصيل التقريبي ({outOfRangeInfo.distanceKm.toFixed(1)} كم)
              </span>
            </div>
            <p className="text-[10px] text-slate-300 font-medium truncate mt-0.5">
              يمكنك التصفح والطلب كالمعتاد
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCalibrateLocation}
            disabled={loadingLocation}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[11px] rounded-xl shadow-md transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="تحديد الموقع الدقيق"
          >
            {loadingLocation ? (
              <Loader2 size={13} className="animate-spin text-slate-950" />
            ) : (
              <Navigation size={13} className="shrink-0" />
            )}
            <span>{loadingLocation ? 'تحديد...' : 'دقق موقعك 📍'}</span>
          </button>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="إغلاق التنبيه"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
