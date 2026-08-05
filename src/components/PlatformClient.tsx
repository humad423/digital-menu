'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, ChevronLeft, ChevronRight, X, Bike, Star, Sparkles, Loader2 } from 'lucide-react'

import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import UserAuthButton from '@/components/UserAuthButton'
import BrandLogo from '@/components/BrandLogo'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'

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

  const w   = containerRef.current?.offsetWidth || 1
  const pct = -(current * 100) + (dragX / w) * 100

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
            transform: `translateX(${pct}%)`,
            transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)',
            willChange: 'transform',
          }}
        >
          {ads.map((ad) => (
            <div key={ad.id} className="flex-none w-full h-full relative">
              {ad.link_url ? (
                <a href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full h-full" draggable={false}>
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
                </a>
              ) : (
                <img src={ad.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
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
  offers = []
}: {
  restaurants: any[]
  categories: any[]
  ads: any[]
  offers?: any[]
}) {
  const [activeCat, setActiveCat]     = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const offersRef   = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)

  const [isDragOffer, setIsDragOffer]   = useState(false)
  const [offerStartX, setOfferStartX]   = useState(0)
  const [offerScrollL, setOfferScrollL] = useState(0)

  const [userArea, setUserArea] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('alfsouq_user_area') || ''
    }
    return ''
  })

  const [locationStatus, setLocStatus] = useState<'granted' | 'locating' | 'default'>(() => {
    if (typeof window !== 'undefined') {
      const savedStatus = localStorage.getItem('alfsouq_loc_status')
      if (savedStatus === 'granted') return 'granted'
    }
    return 'default'
  })

  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>(() => {
    if (typeof window !== 'undefined') {
      const savedLoc = localStorage.getItem('alfsouq_user_loc')
      if (savedLoc) {
        try { return JSON.parse(savedLoc) } catch (e) {}
      }
    }
    return { lat: 40.8167, lng: 29.3750 }
  })

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setLocStatus('locating')

    navigator.geolocation.getCurrentPosition(
      async p => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude }
        setUserLoc(coords)
        setLocStatus('granted')
        if (typeof window !== 'undefined') {
          localStorage.setItem('alfsouq_user_loc', JSON.stringify(coords))
          localStorage.setItem('alfsouq_loc_status', 'granted')
        }

        // Reverse geocode to get main district or combined regions within 15km
        try {
          const distCayirova = calculateDistance(coords.lat, coords.lng, 40.8167, 29.3750)
          const distGebze    = calculateDistance(coords.lat, coords.lng, 40.8028, 29.4307)

          let areaName = ''
          if (distCayirova <= 15 && distGebze <= 15) {
            areaName = 'شايروفا / كيبزة'
          } else {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=ar`)
            if (res.ok) {
              const data = await res.json()
              areaName = data.city || data.localityInfo?.administrative?.[2]?.name || data.localityInfo?.administrative?.[1]?.name || ''
            }
          }

          if (areaName) {
            setUserArea(areaName)
            if (typeof window !== 'undefined') {
              localStorage.setItem('alfsouq_user_area', areaName)
            }
          }
        } catch (err) {}

      },
      err => {
        console.warn('Location request error/denied:', err)
        if (typeof window !== 'undefined' && localStorage.getItem('alfsouq_loc_status') === 'granted') {
          setLocStatus('granted')
        } else {
          setLocStatus('default')
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('alfsouq_loc_status')) {
      requestLocation()
    }
  }, [requestLocation])



  // Calculate restaurant distances
  const withDist = restaurants.map(r => ({
    ...r,
    distance: (r.latitude && r.longitude)
      ? calculateDistance(userLoc.lat, userLoc.lng, r.latitude, r.longitude)
      : null
  }))

  const allowedIds = new Set(withDist.map(r => r.id))

  const filteredRestaurants = withDist.filter(r => {
    const catMatches    = activeCat ? (r.platform_category_ids || []).includes(activeCat) : true
    const searchMatches = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    return catMatches && searchMatches
  }).sort((a, b) => (a.distance !== null && b.distance !== null) ? a.distance - b.distance : 0)

  const filteredOffers = (offers || []).filter(o => allowedIds.has(o.restaurants?.id || o.restaurant_id))

  const filteredAds = (ads || []).filter(ad => {
    if (!ad.target_region || ad.target_region === 'جميع المناطق' || ad.target_region === 'عام') return true

    // 1. Exact Mathematical GPS Geofencing (Haversine Formula)
    if (ad.latitude && ad.longitude && ad.radius_km && userLoc?.lat && userLoc?.lng) {
      const dist = calculateDistance(userLoc.lat, userLoc.lng, ad.latitude, ad.longitude)
      return dist <= ad.radius_km
    }

    // 2. District Name Matching Fallback
    const target = ad.target_region.toLowerCase().trim()
    if (userArea) {
      const area = userArea.toLowerCase().trim()
      if (target.includes(area) || area.includes(target)) return true
      if (target.includes('شايروفا') && (area.includes('شايروفا') || area.includes('كيبزة'))) return true
      if (target.includes('كيبزة') && (area.includes('شايروفا') || area.includes('كيبزة'))) return true
      return false
    }

    if (target.includes('شايروفا') || target.includes('كيبزة')) return true
    return false
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

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-28">

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-xl mx-auto px-4 py-3.5 space-y-3">

          {/* Row 1: Logo + Location + User Auth */}
          <div className="flex items-center justify-between gap-3">
            <BrandLogo size="sm" variant="light" showSubtitle={false} />

            {/* Location Pill */}
            <button
              onClick={requestLocation}
              disabled={locationStatus === 'locating'}
              className="flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-full text-xs font-bold border border-slate-700/60 transition truncate max-w-[170px] disabled:opacity-75"
            >
              {locationStatus === 'locating' ? (
                <Loader2 size={13} className="text-orange-400 shrink-0 animate-spin" />
              ) : (
                <MapPin size={13} className="text-orange-400 shrink-0" />
              )}
              <span className="truncate text-slate-200">
                {locationStatus === 'locating'
                  ? 'جاري التحديد...'
                  : userArea
                  ? userArea
                  : locationStatus === 'granted'
                  ? 'موقعي الحالي'
                  : 'شايروفا / كيبزة'}
              </span>

            </button>


            <UserAuthButton variant="light" />
          </div>

          {/* Row 2: Search Bar */}
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              placeholder="ابحث عن مطعم أو وجبة..."
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
      </header>

      {/* ── MAIN CONTAINER ── */}
      <main className="max-w-xl mx-auto px-4 mt-5 space-y-6">

        {/* Location Notice Banner */}
        {locationStatus === 'default' && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-900 truncate">
                تصفح بموقع منطقة شايروفا / كيبزة الافتراضي
              </p>
            </div>
            <button
              onClick={requestLocation}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shrink-0 transition shadow-sm"
            >
              تحديد موقعي 📍
            </button>
          </div>
        )}

        {/* ── ADS SLIDER ── */}
        {filteredAds && filteredAds.length > 0 && !searchQuery && (
          <AdsSlider ads={filteredAds} />
        )}


        {/* ── SPECIAL OFFERS ── */}
        {filteredOffers && filteredOffers.length > 0 && !searchQuery && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                  🔥
                </div>
                <h2 className="text-base font-black text-slate-900">عروض اليوم</h2>
                <span className="bg-slate-200 text-slate-700 text-xs font-black px-2 py-0.5 rounded-full">
                  {filteredOffers.length}
                </span>
              </div>
            </div>

            {/* Slider */}
            <div
              ref={offersRef}
              onMouseDown={offerMouseDown}
              onMouseMove={offerMouseMove}
              onMouseUp={() => setIsDragOffer(false)}
              onMouseLeave={() => setIsDragOffer(false)}
              className={`flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar scroll-smooth snap-x snap-mandatory ${isDragOffer ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {filteredOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link
                    key={offer.id}
                    href={`/m/${res.slug}`}
                    className="w-60 sm:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all active:scale-98 overflow-hidden snap-start block relative"
                  >
                    {/* Offer Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                      {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ خصم'}
                    </div>

                    {/* Image */}
                    <div className="h-32 w-full bg-slate-100 relative">
                      <SmartOfferImage
                        primaryImage={offer.primary_item?.image_url}
                        bonusImage={offer.bonus_item?.image_url}
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

            <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
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
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">
                {searchQuery ? 'نتائج البحث' : activeCat ? 'مطاعم التصنيف' : 'مطاعم قريبة منك'}
              </h2>
              <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                {filteredRestaurants.length}
              </span>
            </div>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
              <div className="text-4xl mb-2">🍽️</div>
              <p className="font-black text-slate-800 text-sm mb-1">لا توجد مطاعم</p>
              <p className="text-xs text-slate-400 font-bold">حاول تغيير كلمة البحث أو التصنيف</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRestaurants.map(restaurant => {
                const deliveryInfo = restaurant.distance !== null
                  ? getDeliveryFeeForDistance(restaurant.distance, restaurant.delivery_tiers)
                  : null
                const restaurantCats = (restaurant.platform_category_ids || [])
                  .map((cid: string) => categories.find(c => c.id === cid))
                  .filter(Boolean)

                return (
                  <Link
                    key={restaurant.id}
                    href={`/m/${restaurant.slug}`}
                    className="group bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all active:scale-98 block relative"
                  >
                    {/* Cover Header */}
                    <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                      {restaurant.cover_url ? (
                        <img
                          src={restaurant.cover_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{
                            background: `linear-gradient(135deg, ${restaurant.primary_color || '#F97316'}ee, ${restaurant.primary_color || '#F97316'}66)`
                          }}
                        />
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                      {/* Distance Badge */}
                      {restaurant.distance !== null && (
                        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1">
                          <MapPin size={11} className="text-orange-400" />
                          <span>{restaurant.distance < 1 ? 'أقل من 1 كم' : `${restaurant.distance.toFixed(1)} كم`}</span>
                        </div>
                      )}

                      {/* Category Tags */}
                      {restaurantCats.length > 0 && (
                        <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                          {restaurantCats.slice(0, 2).map((c: any) => (
                            <div key={c.id} className="bg-white/90 backdrop-blur-md text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>{c.icon}</span><span>{c.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Restaurant Title Overlay */}
                      <div className="absolute bottom-3 right-3 left-16">
                        <h3 className="text-base font-black text-white drop-shadow-md leading-tight line-clamp-1">
                          {restaurant.name}
                        </h3>
                      </div>

                      {/* Floating Logo */}
                      <div className="absolute bottom-3 left-3 w-12 h-12 rounded-2xl bg-white p-1 shadow-md border-2 border-white overflow-hidden">
                        {restaurant.logo_url ? (
                          <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <div
                            className="w-full h-full rounded-xl flex items-center justify-center text-xs font-black text-white"
                            style={{ background: restaurant.primary_color || '#F97316' }}
                          >
                            {restaurant.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Details */}
                    <div className="p-3.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Rating */}
                        <div className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                          <Star size={11} className="text-amber-500 fill-amber-500" />
                          <span>{restaurant.avg_rating || 'جديد'}</span>
                          {restaurant.ratings_count > 0 && (
                            <span className="text-[10px] text-amber-700 font-bold">({restaurant.ratings_count})</span>
                          )}
                        </div>

                        {/* Delivery Fee */}
                        {deliveryInfo?.available ? (
                          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
                            <Bike size={12} className="text-emerald-600" />
                            <span>توصيل {deliveryInfo.fee} ₺</span>
                          </div>
                        ) : (
                          <div className="bg-red-50 text-red-700 border border-red-200/80 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            🚫 خارج النطاق
                          </div>
                        )}
                      </div>

                      {/* Arrow */}
                      <ChevronLeft size={16} className="text-slate-400 group-hover:text-slate-700 transition shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  )
}
