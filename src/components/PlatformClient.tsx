'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, ChevronLeft, ChevronRight, MapPinOff, Navigation, User as UserIcon, LogOut, Settings } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import UserAuthButton from '@/components/UserAuthButton'
import BrandLogo from '@/components/BrandLogo'

// ── Helpers ─────────────────────────────────────────────────────────────────
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ── Ads Slider Component ────────────────────────────────────────────────────
function AdsSlider({ ads }: { ads: any[] }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % ads.length), 4000)
  }

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [ads.length])

  return (
    <div className="relative -mx-5 px-5">
      {/* Slides */}
      <div className="relative rounded-[1.5rem] overflow-hidden shadow-md" style={{ paddingBottom: '43.75%' /* 16:7 ratio */ }}>
        {ads.map((ad, i) => (
          <div
            key={ad.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          >
            {ad.link_url ? (
              <a href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full h-full">
                <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
              </a>
            ) : (
              <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
            )}
            {/* Gradient overlay for polish */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 60%)' }} />
          </div>
        ))}

        {/* Dots */}
        {ads.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {ads.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); resetTimer() }}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === current ? '22px' : '7px',
                  height: '7px',
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.45)'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

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
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const offersSliderRef = useRef<HTMLDivElement | null>(null)

  const { isLoggedIn, profile, openAuthModal, logout } = useAuth()

  // Location State
  const [locationStatus, setLocationStatus] = useState<'loading' | 'granted' | 'granted_ip' | 'denied'>('loading')
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)

  const requestLocation = () => {
    setLocationStatus('loading')
    
    const fallbackToIP = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/')
        const data = await res.json()
        if (data.latitude && data.longitude) {
          setUserLocation({ lat: data.latitude, lng: data.longitude })
          setLocationStatus('granted_ip')
        } else {
          setLocationStatus('denied')
        }
      } catch (e) {
        setLocationStatus('denied')
      }
    }

    if (!navigator.geolocation) {
      fallbackToIP()
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('granted')
      },
      (err) => {
        console.error("Location error:", err)
        fallbackToIP()
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  }

  useEffect(() => {
    requestLocation()
  }, [])

  // ── RENDER LOCATION PENDING / DENIED ──────────────────────────────────────
  if (locationStatus === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center relative overflow-hidden" dir="rtl">
        <div className="absolute top-1/4 -right-20 w-64 h-64 bg-orange-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 animate-pulse">
            <Navigation className="text-orange-500 animate-bounce mt-2" size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">نحدد موقعك...</h2>
          <p className="text-gray-500 font-medium max-w-xs">نحن نبحث عن أفضل المطاعم التي توصل إلى موقعك الحالي</p>
        </div>
      </div>
    )
  }

  if (locationStatus === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center relative overflow-hidden" dir="rtl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50" />
        <div className="relative z-10 flex flex-col items-center max-w-sm">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 -rotate-6">
            <MapPinOff className="text-red-500" size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">الموقع مطلوب</h2>
          <p className="text-gray-600 font-medium mb-8 leading-relaxed">
            يجب السماح بالوصول إلى موقعك الجغرافي لنتمكن من عرض المطاعم المتاحة للتوصيل في منطقتك.
          </p>
          <button
            onClick={requestLocation}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            تحديد الموقع مرة أخرى
          </button>
        </div>
      </div>
    )
  }

  // ── FILTER RESTAURANTS BY LOCATION AND SEARCH ─────────────────────────────
  const restaurantsWithDistance = restaurants.map(r => {
    let dist = null
    if (userLocation && r.latitude && r.longitude) {
      dist = calculateDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude)
    }
    return { ...r, distance: dist }
  })

  // Allowed Restaurant IDs within delivery range
  const allowedRestaurantIds = new Set(
    restaurantsWithDistance
      .filter(r => r.distance !== null && (!r.delivery_radius_km || r.distance <= r.delivery_radius_km))
      .map(r => r.id)
  )

  const filteredRestaurants = restaurantsWithDistance.filter(r => {
    // Check delivery radius
    if (r.distance === null) return false // Hide if restaurant has no location
    if (r.delivery_radius_km && r.distance > r.delivery_radius_km) return false

    // Check category
    const matchesCat = activeCat
      ? (r.platform_category_ids || []).includes(activeCat)
      : true
      
    // Check search
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesCat && matchesSearch
  }).sort((a, b) => (a.distance || 0) - (b.distance || 0)) // Sort by closest first

  // Filter offers by location (only restaurants within delivery range)
  const locationFilteredOffers = (offers || []).filter(o => {
    const resId = o.restaurants?.id || o.restaurant_id
    return allowedRestaurantIds.has(resId)
  })

  const scrollOffers = (direction: 'left' | 'right') => {
    if (offersSliderRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260
      offersSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>

      {/* ── HEADER ── */}
      <div
        className="relative px-5 pt-6 pb-7 overflow-hidden bg-slate-900 border-b border-slate-800"
      >
        {/* Decorative circles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full opacity-25 bg-orange-500 blur-2xl" />
        <div className="absolute top-2 -right-8 w-28 h-28 rounded-full opacity-20 bg-amber-400 blur-xl" />

        {/* Brand Logo + User Auth Button in top row */}
        <div className="relative z-10 flex items-center justify-between mb-5">
          <BrandLogo size="md" variant="light" />
          <div className="flex items-center gap-2 shrink-0">
            <UserAuthButton />
          </div>
        </div>

        {/* Title tagline */}
        <div className="relative z-10 mb-4">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">
            سوقك الأول لاكتشاف أشهى <span className="text-orange-500">المأكولات والعروض</span>
          </h1>
        </div>

        {/* Search Input */}
        <div className="relative z-10">
          <input
            type="text"
            placeholder="ابحث عن مطعم أو أكلة في ألف سوق..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/50 rounded-2xl py-3 px-11 focus:outline-none focus:bg-white/20 focus:border-orange-500/50 transition-all text-sm font-medium"
          />
          <Search className="absolute right-3.5 top-3 text-white/50" size={19} />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-5 space-y-8 pb-24 mt-6">

        {locationStatus === 'granted_ip' && (
          <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex items-start gap-2">
            <MapPinOff className="text-orange-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-orange-700 font-bold leading-relaxed">
              لم نتمكن من تحديد موقعك الدقيق. نستخدم الآن موقعك التقريبي لعرض المطاعم، وسيُطلب منك الموقع الدقيق عند الطلب.
            </p>
          </div>
        )}

        {/* ADS SLIDER */}
        {ads && ads.length > 0 && !searchQuery && (
          <AdsSlider ads={ads} />
        )}

        {/* OFFERS SECTION - Location Filtered */}
        {locationFilteredOffers && locationFilteredOffers.length > 0 && !searchQuery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h2 className="text-lg font-black" style={{ color: 'var(--brand-secondary)' }}>
                  عروض اليوم المميزة
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* Scroll Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollOffers('right')}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => scrollOffers('left')}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 text-gray-700 flex items-center justify-center shadow-sm hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
                <span className="text-xs text-orange-600 font-black bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 hidden sm:inline-block">
                  تخفيضات محددة بموقعك
                </span>
              </div>
            </div>

            <div
              ref={offersSliderRef}
              className="flex gap-4 overflow-x-auto pb-3 pt-1 -mx-5 px-5 hide-scrollbar touch-pan-x snap-x snap-mandatory scroll-smooth"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {locationFilteredOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link
                    key={offer.id}
                    href={`/m/${res.slug}`}
                    className="w-64 shrink-0 bg-white rounded-2xl p-3 border border-orange-100 shadow-sm hover:shadow-md transition-all active:scale-95 block relative overflow-hidden snap-start"
                  >
                    {/* Badge */}
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md z-10">
                      {offer.min_quantity > 1 ? `🔥 عرض ${offer.min_quantity}X` : offer.bonus_item ? '🎁 مع هدية' : '🏷️ خصم'}
                    </div>

                    <div className="h-32 w-full mb-2.5">
                      <SmartOfferImage
                        primaryImage={offer.primary_item?.image_url}
                        bonusImage={offer.bonus_item?.image_url}
                        customImage={offer.image_url}
                        minQuantity={offer.min_quantity}
                        bonusQuantity={offer.bonus_quantity}
                        className="w-full h-full rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1 font-bold">
                      <span className="truncate text-gray-900 font-black">{res.name}</span>
                    </div>

                    <h3 className="font-black text-sm text-gray-900 truncate mb-1">
                      {offer.title}
                    </h3>
                    {offer.description && (
                      <p className="text-xs text-gray-400 line-clamp-1 mb-2 font-medium">{offer.description}</p>
                    )}

                    <div className="flex items-baseline gap-2 pt-1 border-t border-gray-50">
                      <span className="text-base font-black text-orange-600">
                        {offer.offer_price} ₺
                      </span>
                      {offer.original_price && (
                        <span className="text-xs text-gray-400 line-through font-bold">
                          {offer.original_price} ₺
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {!searchQuery && categories && categories.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black" style={{ color: 'var(--brand-secondary)' }}>التصنيفات</h2>
              {activeCat && (
                <button
                  onClick={() => setActiveCat(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border transition"
                  style={{ color: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', background: 'var(--brand-accent)' }}
                >
                  عرض الكل
                </button>
              )}
            </div>
            <div className="flex overflow-x-auto hide-scrollbar gap-3 -mx-5 px-5 pb-3">
              {categories.map(cat => {
                const isActive = activeCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(isActive ? null : cat.id)}
                    className="shrink-0 flex flex-col items-center justify-center gap-2 px-5 py-4 rounded-3xl min-w-[80px] transition-all duration-300 border"
                    style={
                      isActive
                        ? { background: 'var(--brand-primary)', borderColor: 'var(--brand-primary)', color: '#fff', boxShadow: '0 8px 24px rgba(255,92,0,0.25)', transform: 'translateY(-2px)' }
                        : { background: '#fff', borderColor: '#EAECF0', color: 'var(--brand-secondary)' }
                    }
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-bold">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* RESTAURANTS */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black" style={{ color: 'var(--brand-secondary)' }}>
              {searchQuery ? 'نتائج البحث' : activeCat ? 'مطاعم هذا التصنيف' : 'مطاعم قريبة منك'}
            </h2>
            <span className="text-sm font-bold text-gray-400">{filteredRestaurants.length} مطعم</span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-dashed border-gray-200">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--brand-accent)' }}>
                <span className="text-2xl">🍽️</span>
              </div>
              <p className="font-black text-gray-900 mb-1">لا توجد مطاعم قريبة</p>
              <p className="text-gray-400 text-sm font-medium">للأسف لا توجد مطاعم توصل لموقعك الحالي</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredRestaurants.map(restaurant => {
                // Get all platform categories for this restaurant
                const restaurantCats = (restaurant.platform_category_ids || []).map(
                  (cid: string) => categories.find(c => c.id === cid)
                ).filter(Boolean)
                return (
                  <Link
                    key={restaurant.id}
                    href={`/m/${restaurant.slug}`}
                    className="bg-white rounded-[1.75rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group block relative"
                    style={{ boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }}
                  >
                    {/* Cover */}
                    <div className="h-36 w-full bg-gray-100 relative overflow-hidden">
                      {restaurant.cover_url ? (
                        <img
                          src={restaurant.cover_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ background: `linear-gradient(135deg, ${restaurant.primary_color || '#FF5C00'}ee, ${restaurant.primary_color || '#FF5C00'}88)` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      {/* Distance Tag on top left */}
                      {restaurant.distance !== null && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border border-white/10">
                          <MapPin size={12} className="text-orange-400" />
                          <span>{restaurant.distance < 1 ? 'أقل من 1 كم' : `${restaurant.distance.toFixed(1)} كم`}</span>
                        </div>
                      )}

                      {/* Category tags on cover right */}
                      {restaurantCats.length > 0 && (
                        <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                          {restaurantCats.slice(0, 2).map((c: any) => (
                            <div key={c.id} className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-black flex items-center gap-1" style={{ color: 'var(--brand-secondary)' }}>
                              <span>{c.icon}</span><span>{c.name}</span>
                            </div>
                          ))}
                          {restaurantCats.length > 2 && (
                            <div className="bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-black" style={{ color: 'var(--brand-secondary)' }}>+{restaurantCats.length - 2}</div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="relative px-4 pb-4">
                      {/* Floating logo */}
                      <div className="w-16 h-16 rounded-[1rem] bg-white p-1.5 shadow-md absolute -top-8 right-4 border-4 border-white z-10 transition-transform group-hover:-translate-y-1 duration-300">
                        {restaurant.logo_url ? (
                          <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-xl" />
                        ) : (
                          <div className="w-full h-full rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: 'var(--brand-accent)', color: 'var(--brand-primary)' }}>
                            {restaurant.name.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="pt-10">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black" style={{ color: 'var(--brand-secondary)' }}>{restaurant.name}</h3>
                            <div className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-black border border-amber-200 flex items-center gap-1 shrink-0">
                              <span className="text-amber-500">⭐</span>
                              <span>{restaurant.avg_rating || 'جديد'}</span>
                              {restaurant.ratings_count > 0 && <span className="text-[10px] text-amber-600 font-bold">({restaurant.ratings_count})</span>}
                            </div>
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                            style={{ background: 'var(--brand-accent)' }}
                          >
                            <ChevronLeft size={16} style={{ color: 'var(--brand-primary)' }} />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="flex items-center gap-1.5 bg-gray-50 text-gray-500 px-2.5 py-1.5 rounded-lg">
                            <MapPin size={12} /> توصيل متاح
                          </span>
                          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--brand-accent)', color: 'var(--brand-primary)' }}>
                            <Clock size={12} /> 30-45 دقيقة
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
