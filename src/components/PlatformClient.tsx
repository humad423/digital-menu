'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, MapPin, ChevronLeft, ChevronRight, X, Bike, Loader2, ArrowUpDown } from 'lucide-react'


import SmartOfferImage from '@/components/SmartOfferImage'


import BrandLogo from '@/components/BrandLogo'
import { calculateDistance, getDeliveryFeeForDistance, isStoreWithinRange } from '@/utils/distance'
import { getStoreStatus } from '@/utils/storeStatus'
import { trackEvent } from '@/utils/analytics'
import Footer from '@/components/Footer'
import { matchesSearch } from '@/utils/text'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { supportWhatsappUrl } from '@/config/site'
import {
  getPositionIfPermitted,
  getPrecisePosition,
  hasChosenToStayInZone,
  readUserLocation,
  rememberStayInZone,
  saveUserLocation,
  type SavedLocation,
} from '@/utils/userLocation'

// How far GPS must be from a hand-picked zone before suggesting a change
const MOVED_AWAY_KM = 3

function ZoneModal({
  zones,
  onClose,
  onUseGps,
  onSelectZone,
}: {
  zones: any[]
  onClose: () => void
  onUseGps: () => void
  onSelectZone: (zone: any) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-100 p-5 space-y-4 text-right" dir="rtl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <MapPin size={16} className="text-orange-500" />
            <span>تحديد موقعك أو اختيار منطقة</span>
          </h4>
          <button onClick={onClose} aria-label="إغلاق" className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <button
          onClick={onUseGps}
          className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs py-2.5 px-3 rounded-2xl border border-orange-200 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <MapPin size={14} />
          <span>استخدم موقعي الحالي 🛰️</span>
        </button>

        <div className="space-y-1.5 pt-2">
          <span className="text-[11px] font-black text-slate-400 block">أو اختر منطقة:</span>
          {zones.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium py-2">لا توجد مناطق تغطية مضافة حالياً</p>
          ) : (
            zones.map((z: any) => (
              <button
                key={z.id}
                onClick={() => onSelectZone(z)}
                className="w-full bg-slate-50 hover:bg-slate-100 p-3 rounded-2xl border border-slate-200 text-right flex items-center justify-between text-xs font-black text-slate-800 transition cursor-pointer"
              >
                <span>📍 {z.name}</span>
                <span className="text-[10px] text-slate-400 font-normal">نطاق {z.radius_km} كم</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  ADS SLIDER (Touch + Mouse Drag + Dots + Arrows)
// ═══════════════════════════════════════════════════════════
function AdsSlider({ ads }: { ads: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent]     = useState(0)
  const [isDragging, setDrag]     = useState(false)
  const [startX, setStartX]       = useState(0)
  const [dragX, setDragX]         = useState(0)
  const autoRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const goTo = useCallback((i: number) => setCurrent((i + ads.length) % ads.length), [ads.length])
  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  const arm = useCallback(() => {
    clearTimeout(autoRef.current)
    if (ads.length > 1) autoRef.current = setTimeout(next, 4500)
  }, [next, ads.length])

  useEffect(() => { arm(); return () => clearTimeout(autoRef.current) }, [current, arm])

  /* Touch Events */
  const onTouchStart = (e: React.TouchEvent) => { setStartX(e.touches[0].clientX); setDrag(true); clearTimeout(autoRef.current) }
  const onTouchMove  = (e: React.TouchEvent) => { if (isDragging) setDragX(e.touches[0].clientX - startX) }
  const onTouchEnd   = () => {
    const w = containerRef.current?.offsetWidth || 300
    if (dragX < -(w * 0.2)) next(); else if (dragX > (w * 0.2)) prev()
    setDragX(0); setDrag(false); arm()
  }

  /* Mouse Events */
  const onMouseDown  = (e: React.MouseEvent) => { setStartX(e.clientX); setDrag(true); clearTimeout(autoRef.current) }
  const onMouseMove  = (e: React.MouseEvent) => { if (isDragging) { e.preventDefault(); setDragX(e.clientX - startX) } }
  const onMouseEnd   = () => {
    if (isDragging) {
      const w = containerRef.current?.offsetWidth || 300
      if (dragX < -(w * 0.2)) next(); else if (dragX > (w * 0.2)) prev()
    }
    setDragX(0); setDrag(false); arm()
  }

  if (!ads || !ads.length) return null

  return (
    <div dir="ltr" className="relative group rounded-3xl overflow-hidden shadow-lg select-none bg-slate-900" style={{ aspectRatio: '16/7' }}>

      <div
        ref={containerRef}
        className="w-full h-full"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}   onMouseMove={onMouseMove} onMouseUp={onMouseEnd} onMouseLeave={onMouseEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-(current * 100)}% + ${dragX}px))`,
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform',
          }}
        >
          {ads.map((ad) => (
            <div key={ad.id} className="flex-none w-full h-full relative">
              {ad.link_url ? (
                <a
                  href={ad.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full h-full"
                  draggable={false}
                  onClick={() => trackEvent({ event_type: 'ad_click', ad_id: ad.id })}
                >
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
                </a>
              ) : (
                <img
                  src={ad.image_url}
                  alt=""
                  className="w-full h-full object-cover cursor-pointer"
                  draggable={false}
                  onClick={() => trackEvent({ event_type: 'ad_click', ad_id: ad.id })}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overlay gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Controls */}
      {ads.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={next}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {ads.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 20 : 6,
                  background: i === current ? '#FFFFFF' : 'rgba(255,255,255,0.45)'
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN PLATFORM CLIENT
// ═══════════════════════════════════════════════════════════
export default function PlatformClient({
  restaurants,
  categories,
  ads,
  offers = [],
  serviceZones = [],
  businessTypes: initialBusinessTypes = []
}: {
  restaurants: any[]
  categories: any[]
  ads: any[]
  offers?: any[]
  serviceZones?: any[]
  businessTypes?: any[]
}) {
  const [activeCat, setActiveCat]         = useState<string | null>(null)
  const [searchQuery, setSearchQuery]     = useState('')
  const [activeStoreType, setActiveStoreType] = useState<string>('all')
  const [businessTypes, setBusinessTypes] = useState<any[]>(initialBusinessTypes)
  const [sortBy, setSortBy]               = useState<'distance' | 'rating' | 'delivery_fee' | 'newest'>('distance')
  const [showAllRanked, setShowAllRanked] = useState(false)
  const [showAllLatest, setShowAllLatest] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const offersRef   = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)





  const [isDragOffer, setIsDragOffer]   = useState(false)
  const [offerStartX, setOfferStartX]   = useState(0)
  const [offerScrollL, setOfferScrollL] = useState(0)

  const [location, setLocation] = useState<SavedLocation | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [movedTo, setMovedTo] = useState<{ lat: number; lng: number } | null>(null)
  const [browseAll, setBrowseAll] = useState(false)
  const userLoc = location ? { lat: location.lat, lng: location.lng } : null

  const applyGpsPosition = useCallback((pos: { lat: number; lng: number }) => {
    const zone = (serviceZones || [])
      .map((z: any) => ({ ...z, dist: calculateDistance(pos.lat, pos.lng, z.latitude, z.longitude) }))
      .filter((z: any) => z.dist <= (z.radius_km || 15))
      .sort((a: any, b: any) => a.dist - b.dist)[0]

    setLocation(saveUserLocation({ ...pos, area: zone?.name, source: 'gps' }))
    setMovedTo(null)
    setBrowseAll(false)
  }, [serviceZones])

  const requestLocation = useCallback(() => {
    setLocating(true)
    setLocationError('')
    getPrecisePosition()
      .then(applyGpsPosition)
      .catch(() => setLocationError('تعذر تحديد موقعك. اسمح للمتصفح بالوصول للموقع أو اختر منطقتك يدوياً.'))
      .finally(() => setLocating(false))
  }, [applyGpsPosition])

  useEffect(() => {
    const saved = readUserLocation()
    setLocation(saved)
    setLocationReady(true)

    // Without a prompt, see if the visitor moved. GPS-based locations just follow them;
    // a zone they picked by hand stays until they choose to change it.
    getPositionIfPermitted().then(pos => {
      if (!pos) return
      if (!saved || saved.source === 'gps') {
        applyGpsPosition(pos)
      } else if (
        calculateDistance(saved.lat, saved.lng, pos.lat, pos.lng) > MOVED_AWAY_KM &&
        !hasChosenToStayInZone()
      ) {
        setMovedTo(pos)
      }
    })
  }, [applyGpsPosition])

  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    trackEvent({ event_type: 'page_view' })

    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])




  // Calculate restaurant distances
  const withDist = restaurants.map(r => ({
    ...r,
    distance: (userLoc && r.latitude && r.longitude)
      ? calculateDistance(userLoc.lat, userLoc.lng, r.latitude, r.longitude)
      : null
  }))

  // A store with no delivery tiers has an unknown fee, so it sorts after known fees
  const knownDeliveryFee = (r: any) => {
    if (r.distance === null) return Infinity
    const info = getDeliveryFeeForDistance(r.distance, r.delivery_tiers, r.delivery_radius_km)
    return info.available && info.hasTiers ? info.fee : Infinity
  }

  const filteredRestaurants = withDist.filter(r => {
    const storeTypeMatches = activeStoreType === 'all' ? true : (r.store_type || 'restaurant') === activeStoreType
    const catMatches       = activeCat ? (r.platform_category_ids || []).includes(activeCat) : true
    const searchMatches    = matchesSearch(searchQuery, r.name)

    // Exclude stores outside delivery/pickup radius using the robust helper
    const withinRadius = browseAll || !userLoc || isStoreWithinRange(userLoc.lat, userLoc.lng, r)

    return storeTypeMatches && catMatches && searchMatches && withinRadius
  }).sort((a, b) => {
    if (sortBy === 'delivery_fee') {
      const feeA = knownDeliveryFee(a)
      const feeB = knownDeliveryFee(b)
      if (feeA !== feeB) return feeA - feeB
    } else if (sortBy === 'newest') {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      if (dateB !== dateA) return dateB - dateA
    }

    if (a.distance !== null && b.distance !== null) return a.distance - b.distance
    return 0
  })

  // Only allow offers for stores that are within the active delivery radius
  const allowedIds = new Set(filteredRestaurants.map(r => r.id))
  const filteredOffers = (offers || []).filter(o => allowedIds.has(o.restaurants?.id || o.restaurant_id))

  const rankedOffers = [...filteredOffers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  const visibleRankedOffers = rankedOffers.slice(0, 10)

  const latestOffers = [...filteredOffers].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
  const visibleLatestOffers = latestOffers.slice(0, 10)

  const filteredAds = (ads || []).filter(ad => {
    // 1. General ads (no lat/lng/radius specified) -> Show to ALL
    if (!ad.latitude || !ad.longitude || !ad.radius_km) return true

    // 2. Geofenced ads need a known location
    return !!userLoc && calculateDistance(userLoc.lat, userLoc.lng, ad.latitude, ad.longitude) <= ad.radius_km
  })





  /* Drag Offers Scroll */
  const offerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!offersRef.current) return
    setIsDragOffer(true)
    setOfferStartX(e.pageX - offersRef.current.offsetLeft)
    setOfferScrollL(offersRef.current.scrollLeft)
  }
  const offerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragOffer || !offersRef.current) return
    e.preventDefault()
    offersRef.current.scrollLeft = offerScrollL - (e.pageX - offersRef.current.offsetLeft - offerStartX) * 1.5
  }

  // Check if user is within any active service zone
  const activeServiceZones = (serviceZones || []).filter((z: any) => z.is_active !== false && z.latitude && z.longitude)
  const isUserInCoverage = activeServiceZones.length === 0 || (!!userLoc && activeServiceZones.some((z: any) => {
    const dist = calculateDistance(userLoc.lat, userLoc.lng, Number(z.latitude), Number(z.longitude))
    return dist <= (Number(z.radius_km) || 15)
  }))

  const handleSelectZone = (zone: any) => {
    setLocation(saveUserLocation({
      lat: Number(zone.latitude),
      lng: Number(zone.longitude),
      area: zone.name,
      source: 'zone',
    }))
    setMovedTo(null)
    setBrowseAll(false)
    setShowZoneModal(false)
  }

  const stayInZone = () => {
    rememberStayInZone()
    setMovedTo(null)
  }

  // Location is only known in the browser, so wait instead of flashing the wrong screen
  if (!locationReady) {
    return <div className="min-h-screen bg-slate-50" />
  }

  // Render Outside Coverage Screen if user is outside coverage zone
  if (!locating && !isUserInCoverage && !browseAll) {
    const nearestZone = userLoc && activeServiceZones
      .map((z: any) => ({
        ...z,
        dist: calculateDistance(userLoc.lat, userLoc.lng, Number(z.latitude), Number(z.longitude))
      }))
      .sort((a, b) => a.dist - b.dist)[0]


    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between dir-rtl font-sans">
        {/* Top Header */}
        <header className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200/80">
          <BrandLogo size="md" />
          <button
            onClick={() => setShowZoneModal(true)}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3.5 py-1.5 rounded-full text-xs font-black transition cursor-pointer shadow-xs"
          >
            <MapPin size={14} className="text-amber-600" />
            <span>{location?.area || 'اختر المنطقة 📍'}</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="my-auto py-8 text-center space-y-6 max-w-md mx-auto">
          
          {/* Illustration Badge */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-orange-500 via-amber-500 to-yellow-400 p-0.5 shadow-xl flex items-center justify-center animate-bounce-slow">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center text-4xl">
              📍
            </div>
            {location && (
              <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                قريباً 🚀
              </div>
            )}
          </div>

          <div className="space-y-2">
            {location ? (
              <>
                <span className="inline-block bg-orange-100 text-orange-800 text-xs font-black px-3.5 py-1 rounded-full border border-orange-200">
                  سيكون متوفر قريباً في منطقتك ✨
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  عذراً، خدمات التطبيق غير متوفرة في موقعك الحالي حالياً
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  نعمل باستمرار على توسيع نطاق خدماتنا للتواجد في منطقتك بالقريب العاجل 🚀
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                  أهلاً بك في ألف سوق 👋
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  حدد موقعك لنعرض لك المتاجر القريبة منك
                </p>
              </>
            )}
          </div>

          {/* Choose a location */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-xs font-bold text-slate-600 space-y-3 text-right">
            {nearestZone && (
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <div>
                  <span className="block text-slate-900 font-black">أقرب منطقة تغطية حالية:</span>
                  <span className="text-slate-500 font-medium">{nearestZone.name} (تبعد {nearestZone.dist.toFixed(1)} كم)</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowZoneModal(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-2.5 rounded-xl transition active:scale-95"
            >
              {location ? 'تغيير المنطقة 📍' : 'حدد موقعك أو اختر منطقتك 📍'}
            </button>
          </div>

          <button
            onClick={() => setBrowseAll(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 rounded-2xl transition active:scale-95"
          >
            تصفح كل المتاجر 🛍️
          </button>

          {/* Merchant / Business Owner CTA Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-700/80 text-right space-y-4 relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl shrink-0">
                🏪
              </div>
              <div>
                <h3 className="font-black text-sm text-white">هل تملك متجراً أو مطعماً وتريد الحصول على المنيو الخاص بك؟</h3>
                <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed">
                  للحصول على المنيو الخاص بك وتفعيل نظام الطلبات لمتجرك تواصل معنا مباشرة عبر الواتساب.
                </p>
              </div>
            </div>

            <a
              href={supportWhatsappUrl('مرحباً، أرغب في الحصول على منيو رقمي خاص بمتجري عبر منصة ألف سوق')}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition active:scale-95 text-center no-underline cursor-pointer"
            >
              <span>💬 تواصل معنا عبر الواتساب</span>
            </a>
          </div>

        </main>

        {/* Footer */}
        <Footer />

        {/* Zone Selector Modal */}
        {showZoneModal && (
          <ZoneModal
            zones={activeServiceZones}
            onClose={() => setShowZoneModal(false)}
            onUseGps={() => { setShowZoneModal(false); requestLocation() }}
            onSelectZone={handleSelectZone}
          />
        )}
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col justify-between">

      {/* ── TOP HEADER (Sticky & GPU Accelerated) ── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white shadow-xl border-b border-slate-800/80 transform-gpu will-change-transform">
        <div className={`max-w-md sm:max-w-lg mx-auto px-4 transition-all duration-300 ${
          isScrolled ? 'py-2.5 space-y-2.5' : 'py-3.5 space-y-3'
        }`}>

          {/* Row 1: Logo (Right) + Dead-Centered Location Pill + User Auth (Left) */}
          <div className="grid grid-cols-3 items-center w-full">
            {/* Right: Logo */}
            <div className="flex items-center justify-start">
              <BrandLogo size="sm" variant="light" showSubtitle={false} />
            </div>

            {/* Center: Location Pill */}
            <div className="flex items-center justify-center min-w-0">
              <button
                onClick={() => setShowZoneModal(true)}
                disabled={locating}
                className="flex items-center justify-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-700/60 transition truncate max-w-[150px] disabled:opacity-75 cursor-pointer shadow-xs"
              >
                {locating ? (
                  <Loader2 size={13} className="text-orange-400 shrink-0 animate-spin" />
                ) : (
                  <MapPin size={13} className="text-orange-400 shrink-0" />
                )}
                <span className="truncate text-slate-200">
                  {locating ? 'جاري التحديد...' : location?.area || (location ? 'موقعي الحالي' : 'اختر موقعك')}
                </span>
              </button>
            </div>

            {/* Left: balances the centered location pill */}
            <div />
          </div>

          {/* Row 2: Search Bar (Collapses smoothly on scroll) */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            isScrolled && !searchQuery
              ? 'max-h-0 opacity-0 my-0 pointer-events-none'
              : 'max-h-16 opacity-100 my-0'
          }`}>
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder="ابحث عن مطعم أو سوبرماركت أو محل..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl py-2.5 pr-10 pl-9 text-xs font-bold text-white placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
              />
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Row 3: Business Type Selector Tabs (Shrinks on scroll) */}
          <div className="flex items-center overflow-x-auto hide-scrollbar pt-1 pb-1 -mx-1 px-1 transition-all duration-300 gap-1.5">
            {(businessTypes.length > 0 ? [
              { key: 'all', label: 'الكل', icon: '🛍️' },
              ...businessTypes.map(bt => ({ key: bt.slug, label: bt.name, icon: bt.icon }))
            ] : [
              { key: 'all', label: 'الكل', icon: '🛍️' },
              { key: 'restaurant', label: 'مطاعم', icon: '🍔' },
              { key: 'supermarket', label: 'سوبر ماركت', icon: '🛒' },
              { key: 'clothing', label: 'ألبسة وموضة', icon: '👗' },
              { key: 'other', label: 'متاجر أخرى', icon: '🎁' },
            ]).map(tab => {
              const isActive = activeStoreType === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveStoreType(tab.key)
                    setActiveCat(null)
                  }}
                  className={`flex items-center gap-1.5 rounded-full border transition-all duration-200 shrink-0 font-bold cursor-pointer shadow-2xs ${
                    isScrolled
                      ? 'text-[11px] px-2.5 py-1'
                      : 'text-xs px-3 py-1.5'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-orange-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                  }`}
                >
                  <span className={isScrolled ? 'text-[11px]' : 'text-xs'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

        </div>
      </header>

      {/* ── MAIN CONTAINER ── */}
      <main className="w-full max-w-md sm:max-w-lg mx-auto px-3 sm:px-4 mt-5 mb-8 space-y-6">

        {/* Visitor picked a zone but GPS says they moved: let them decide */}
        {movedTo && location && (
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3.5 shadow-xs">
            <p className="text-xs font-black text-blue-900 mb-2">
              يبدو أنك الآن خارج {location.area || 'المنطقة التي اخترتها'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => applyGpsPosition(movedTo)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-3 py-2 rounded-xl transition active:scale-95"
              >
                استخدم موقعي الحالي
              </button>
              <button
                onClick={stayInZone}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-black text-xs px-3 py-2 rounded-xl transition active:scale-95"
              >
                ابقَ في {location.area || 'هذه المنطقة'}
              </button>
            </div>
          </div>
        )}

        {locationError && (
          <p className="bg-rose-50 border border-rose-200/80 rounded-2xl p-3 text-xs font-bold text-rose-700">{locationError}</p>
        )}


        {/* ── ADS SLIDER ── */}
        {filteredAds && filteredAds.length > 0 && !searchQuery && (
          <AdsSlider ads={filteredAds} />
        )}


        {/* ── 1. FEATURED RANKED OFFERS SECTION (Top - Strictly sorted by sort_order) ── */}
        {rankedOffers && rankedOffers.length > 0 && !searchQuery && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  🔥
                </div>
                <h2 className="text-base font-black text-slate-900">العروض المميزة</h2>
              </div>
              <Link
                href="/offers"
                className="text-[11px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-full border border-orange-200 transition"
              >
                عرض الكل ⟵
              </Link>
            </div>

            {/* Slider */}
            <div
              ref={offersRef}
              onMouseDown={offerMouseDown}
              onMouseMove={offerMouseMove}
              onMouseUp={() => setIsDragOffer(false)}
              onMouseLeave={() => setIsDragOffer(false)}
              className={`flex gap-3 overflow-x-auto pb-2 hide-scrollbar scroll-smooth snap-x snap-mandatory ${isDragOffer ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {visibleRankedOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link
                    key={`ranked-${offer.id}`}
                    href={`/m/${res.slug}`}
                    prefetch={false}
                    className="w-60 sm:w-64 shrink-0 bg-white rounded-2xl border border-orange-200/60 shadow-2xs hover:shadow-md transition-all duration-150 active:scale-[0.97] active:brightness-95 overflow-hidden snap-start block relative cursor-pointer select-none"
                  >
                    {/* Offer Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ مميز'}
                    </div>

                    {/* Image */}
                    <div className="h-32 w-full bg-slate-100 relative">
                      <SmartOfferImage
                        primaryImage={offer.primary_item?.image_url}
                        bonusImage={offer.bonus_item?.image_url}
                        item3Image={offer.item3?.image_url}
                        item4Image={offer.item4?.image_url}
                        customImage={offer.image_url}
                        minQuantity={offer.min_quantity}
                        bonusQuantity={offer.bonus_quantity}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Body */}
                    <div className="p-3">
                      <p className="text-[11px] font-bold text-slate-400 truncate mb-0.5">{res.name}</p>
                      <h3 className="font-black text-xs text-slate-900 truncate mb-2">{offer.title}</h3>

                      <div className="flex items-baseline gap-2 pt-2 border-t border-slate-100">
                        <span className="text-sm font-black text-orange-600">{offer.offer_price} ₺</span>
                        {offer.original_price && (
                          <span className="text-[11px] font-bold text-slate-400 line-through">{offer.original_price} ₺</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}

              <Link
                href="/offers"
                className="w-40 shrink-0 bg-orange-50 hover:bg-orange-100/80 rounded-2xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center gap-1.5 p-4 text-orange-700 transition active:scale-95 text-center font-black text-xs snap-start"
              >
                <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  +
                </span>
                <span>عرض جميع العروض</span>
                <span className="text-[10px] text-orange-500 font-bold">كل التخفيضات ⟵</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── 2. LATEST FRESH OFFERS SECTION (Bottom - Strictly sorted by created_at) ── */}
        {latestOffers && latestOffers.length > 0 && !searchQuery && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  ✨
                </div>
                <h2 className="text-base font-black text-slate-900">العروض الحديثة</h2>
              </div>
              <Link
                href="/offers"
                className="text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition"
              >
                عرض الكل ⟵
              </Link>
            </div>

            {/* Slider */}
            <div
              className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar scroll-smooth snap-x snap-mandatory cursor-grab"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {visibleLatestOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link
                    key={`latest-${offer.id}`}
                    href={`/m/${res.slug}`}
                    prefetch={false}
                    className="w-60 sm:w-64 shrink-0 bg-white rounded-2xl border border-blue-200/60 shadow-2xs hover:shadow-md transition-all duration-150 active:scale-[0.97] active:brightness-95 overflow-hidden snap-start block relative cursor-pointer select-none"
                  >
                    {/* New Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      ✨ حديث جداً
                    </div>

                    {/* Image */}
                    <div className="h-32 w-full bg-slate-100 relative">
                      <SmartOfferImage
                        primaryImage={offer.primary_item?.image_url}
                        bonusImage={offer.bonus_item?.image_url}
                        item3Image={offer.item3?.image_url}
                        item4Image={offer.item4?.image_url}
                        customImage={offer.image_url}
                        minQuantity={offer.min_quantity}
                        bonusQuantity={offer.bonus_quantity}
                        className="w-full h-full"
                      />
                    </div>

                    {/* Body */}
                    <div className="p-3">
                      <p className="text-[11px] font-bold text-slate-400 truncate mb-0.5">{res.name}</p>
                      <h3 className="font-black text-xs text-slate-900 truncate mb-2">{offer.title}</h3>

                      <div className="flex items-baseline gap-2 pt-2 border-t border-slate-100">
                        <span className="text-sm font-black text-blue-600">{offer.offer_price} ₺</span>
                        {offer.original_price && (
                          <span className="text-[11px] font-bold text-slate-400 line-through">{offer.original_price} ₺</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}

              <Link
                href="/offers"
                className="w-40 shrink-0 bg-blue-50 hover:bg-blue-100/80 rounded-2xl border-2 border-dashed border-blue-300 flex flex-col items-center justify-center gap-1.5 p-4 text-blue-700 transition active:scale-95 text-center font-black text-xs snap-start"
              >
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                  +
                </span>
                <span>عرض جميع العروض</span>
                <span className="text-[10px] text-blue-500 font-bold">كل التخفيضات ⟵</span>
              </Link>
            </div>
          </section>
        )}

        {/* ── CATEGORIES ── */}
        {!searchQuery && categories && categories.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-slate-900">التصنيفات</h2>
              {activeCat && (
                <button
                  onClick={() => setActiveCat(null)}
                  className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200 transition"
                >
                  عرض الكل ✕
                </button>
              )}
            </div>

            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
              {categories.map(cat => {
                const isActive = activeCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(isActive ? null : cat.id)}
                    className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                      isActive
                        ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                        : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── RESTAURANTS GRID ── */}
        <section>
          <div className="flex items-center justify-between mb-3.5 gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {searchQuery
                  ? 'نتائج البحث'
                  : activeCat
                  ? 'المتاجر والتصنيفات'
                  : activeStoreType === 'supermarket'
                  ? 'سوبر ماركت ومتاجر الموائد'
                  : activeStoreType === 'clothing'
                  ? 'محلات ألبسة وموضة'
                  : activeStoreType === 'other'
                  ? 'متاجر وخدمات أخرى'
                  : activeStoreType === 'restaurant'
                  ? 'مطاعم قريبة منك'
                  : 'متاجر ومطاعم قريبة منك'}
              </h2>
              <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                {filteredRestaurants.length}
              </span>
            </div>

            {/* Sorting Select Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl px-2.5 py-1.5 shadow-2xs">
              <ArrowUpDown size={13} className="text-orange-500 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
              >
                <option value="distance">📍 الأقرب مسافة</option>

                <option value="delivery_fee">🚚 الأقل توصيلاً</option>
                <option value="newest">✨ الأحدث إضافـة</option>
              </select>
            </div>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="font-black text-slate-800 text-sm mb-1">لا توجد مطاعم</p>
              <p className="text-xs text-slate-400 font-bold">حاول تغيير كلمة البحث أو التصنيف</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRestaurants.map(restaurant => {
                const deliveryInfo = restaurant.distance !== null
                  ? getDeliveryFeeForDistance(restaurant.distance, restaurant.delivery_tiers, restaurant.delivery_radius_km)
                  : null
                const restaurantCats = (restaurant.platform_category_ids || [])
                  .map((cid: string) => categories.find(c => c.id === cid))
                  .filter(Boolean)

                return (
                  <Link
                    key={restaurant.id}
                    href={`/m/${restaurant.slug}`}
                    prefetch={false}
                    className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1.5 active:scale-[0.98] active:brightness-95 transition-all duration-150 flex flex-col relative cursor-pointer select-none w-full"
                  >
                    {/* Cover Header */}
                    <div className="h-44 sm:h-48 w-full bg-slate-900 relative overflow-hidden shrink-0">
                      {restaurant.cover_url ? (
                        <img
                          src={getOptimizedImageUrl(restaurant.cover_url, 700)}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full opacity-90"
                          style={{
                            background: `linear-gradient(135deg, ${restaurant.primary_color || '#F97316'}ee, ${restaurant.primary_color || '#F97316'}66)`
                          }}
                        />
                      )}

                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-black/30" />

                      {/* Top Right Badges */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 flex-wrap max-w-[70%] z-10">
                        {restaurant.store_type && restaurant.store_type !== 'restaurant' && (
                          <span className="bg-orange-600 text-white backdrop-blur-md text-[10px] font-black px-2.5 py-1 rounded-xl shadow-xs">
                            {restaurant.store_type === 'supermarket' ? '🛒 سوبر ماركت' : restaurant.store_type === 'clothing' ? '👗 ألبسة' : '🎁 متجر'}
                          </span>
                        )}
                        {restaurantCats.slice(0, 1).map((c: any) => (
                          <span key={c.id} className="bg-slate-900/80 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold px-2 py-1 rounded-xl">
                            {c.icon} {c.name}
                          </span>
                        ))}
                      </div>

                      {/* Top Left: Distance */}
                      {restaurant.distance !== null && (
                        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-xl border border-white/15 flex items-center gap-1 shadow-xs z-10">
                          <MapPin size={11} className="text-orange-400" />
                          <span>{restaurant.distance < 1 ? 'أقل من 1 كم' : `${restaurant.distance.toFixed(1)} كم`}</span>
                        </div>
                      )}

                      {/* Bottom Status Badge */}
                      <div className="absolute bottom-3 right-3 z-10">
                        {(() => {
                          const status = getStoreStatus(restaurant)
                          return (
                            <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border backdrop-blur-md shadow-xs flex items-center gap-1.5 ${status.isOpen ? 'bg-emerald-950/85 text-emerald-300 border-emerald-500/40' : status.isHoliday ? 'bg-amber-950/85 text-amber-300 border-amber-500/40' : 'bg-rose-950/85 text-rose-300 border-rose-500/40'}`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`} />
                              <span>{status.statusText}</span>
                              {status.subText && <span className="opacity-75">({status.subText})</span>}
                            </span>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Dedicated Body Section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
                      {/* Logo + Store Name + Rating */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white p-0.5 shadow-md border border-slate-100 overflow-hidden shrink-0 -mt-7 z-20 relative">
                          {restaurant.logo_url ? (
                            <img src={getOptimizedImageUrl(restaurant.logo_url, 150)} alt={restaurant.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            <div
                              className="w-full h-full rounded-xl flex items-center justify-center text-sm font-black text-white"
                              style={{ background: restaurant.primary_color || '#F97316' }}
                            >
                              {restaurant.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5 overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-sm font-black text-slate-900 group-hover:text-orange-600 transition-colors truncate leading-tight">
                              {restaurant.name}
                            </h3>

                          </div>
                          {restaurantCats.length > 0 && (
                            <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                              {restaurantCats.map((c: any) => c.name).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Info: Delivery Fee & Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 flex-wrap">
                        <div className="min-w-0 flex-1">
                          {restaurant.has_delivery === false ? (
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <span>🏪 استلام من الفرع</span>
                            </span>
                          ) : deliveryInfo?.available ? (
                            <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-xl flex items-center gap-1 w-fit max-w-full">
                              <Bike size={13} className="text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {deliveryInfo.hasTiers 
                                  ? `توصيل ${deliveryInfo.fee === 0 ? 'مجاني' : `${deliveryInfo.fee} ₺`}`
                                  : 'يوجد توصيل'
                                }
                              </span>
                              {restaurant.distance !== null && (
                                <span className="text-[10px] opacity-75 font-normal shrink-0">({restaurant.distance.toFixed(1)} كم)</span>
                              )}
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-1 rounded-xl text-[11px]">
                              🚫 خارج نطاق التوصيل
                            </span>
                          )}
                        </div>

                        <div className="text-orange-600 font-black flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                          <span>تصفح المنيو</span>
                          <ChevronLeft size={14} />
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </main>

      {/* Zone Selector Modal */}
        {showZoneModal && (
          <ZoneModal
            zones={activeServiceZones}
            onClose={() => setShowZoneModal(false)}
            onUseGps={() => { setShowZoneModal(false); requestLocation() }}
            onSelectZone={handleSelectZone}
          />
        )}

      {/* Footer Component */}
      <Footer />
    </div>
  )
}
