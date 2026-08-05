'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, ChevronLeft, ChevronRight, MapPinOff, Navigation, X } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import UserAuthButton from '@/components/UserAuthButton'
import BrandLogo from '@/components/BrandLogo'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'

// ── Ads Slider Component ─────────────────────────────────────────────────────
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
      <div className="relative rounded-[1.5rem] overflow-hidden shadow-md" style={{ paddingBottom: '43.75%' }}>
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
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 55%)' }} />
          </div>
        ))}
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
  const searchRef = useRef<HTMLInputElement>(null)

  const { isLoggedIn, profile, openAuthModal, logout } = useAuth()

  const [locationStatus, setLocationStatus] = useState<'granted' | 'granted_ip' | 'default'>('default')
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number }>({ lat: 40.8167, lng: 29.3750 })

  const requestLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('granted')
      },
      (err) => { console.error("Location error:", err) },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  }

  useEffect(() => { requestLocation() }, [])

  const restaurantsWithDistance = restaurants.map(r => {
    let dist = null
    if (userLocation && r.latitude && r.longitude) {
      dist = calculateDistance(userLocation.lat, userLocation.lng, r.latitude, r.longitude)
    }
    return { ...r, distance: dist }
  })

  const allowedRestaurantIds = new Set(restaurantsWithDistance.map(r => r.id))

  const filteredRestaurants = restaurantsWithDistance.filter(r => {
    const matchesCat = activeCat ? (r.platform_category_ids || []).includes(activeCat) : true
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  }).sort((a, b) => (a.distance !== null && b.distance !== null) ? a.distance - b.distance : 0)

  const locationFilteredOffers = (offers || []).filter(o => {
    const resId = o.restaurants?.id || o.restaurant_id
    return allowedRestaurantIds.has(resId)
  })

  const scrollOffers = (direction: 'left' | 'right') => {
    if (offersSliderRef.current) {
      offersSliderRef.current.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' })
    }
  }

  const [isMouseDown, setIsMouseDown] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftState, setScrollLeftState] = useState(0)

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!offersSliderRef.current) return
    setIsMouseDown(true)
    setStartX(e.pageX - offersSliderRef.current.offsetLeft)
    setScrollLeftState(offersSliderRef.current.scrollLeft)
  }
  const handleMouseLeaveOrUp = () => setIsMouseDown(false)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !offersSliderRef.current) return
    e.preventDefault()
    const x = e.pageX - offersSliderRef.current.offsetLeft
    offersSliderRef.current.scrollLeft = scrollLeftState - (x - startX) * 1.5
  }

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }} dir="rtl">

      {/* ── HEADER ── */}
      <div className="platform-header">
        <div className="relative z-10 flex items-center justify-between mb-5">
          <BrandLogo size="md" variant="light" />
          <UserAuthButton />
        </div>

        <div className="relative z-10 mb-4">
          <h1 className="text-xl font-black text-white tracking-tight leading-tight">
            سوقك الأول لاكتشاف أشهى{' '}
            <span style={{ color: '#F97316' }}>المأكولات والعروض</span>
          </h1>
        </div>

        {/* Search */}
        <div className="relative z-10">
          <input
            ref={searchRef}
            type="text"
            placeholder="ابحث عن مطعم في ألف سوق..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl py-3 px-11 text-sm font-medium outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.18)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          />
          <Search className="absolute right-3.5 top-3 text-white/50" size={19} />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-3 text-white/60 hover:text-white transition"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-5 space-y-7 pb-24 mt-6">

        {/* Location notice */}
        {locationStatus === 'default' && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <MapPinOff className="text-amber-500 shrink-0" size={18} />
              <p className="text-xs font-bold text-amber-800">تصفح بموقع المنطقة الافتراضي (شايروفا/كيبزة)</p>
            </div>
            <button
              onClick={requestLocation}
              className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shrink-0 transition shadow-sm"
            >
              تحديد موقعي 📍
            </button>
          </div>
        )}

        {/* ADS SLIDER */}
        {ads && ads.length > 0 && !searchQuery && (
          <AdsSlider ads={ads} />
        )}

        {/* OFFERS SECTION */}
        {locationFilteredOffers && locationFilteredOffers.length > 0 && !searchQuery && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="text-xl">🔥</span> عروض اليوم
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => scrollOffers('right')}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm hover:border-orange-300 hover:text-orange-500 transition"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => scrollOffers('left')}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm hover:border-orange-300 hover:text-orange-500 transition"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>

            <div
              ref={offersSliderRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeaveOrUp}
              onMouseUp={handleMouseLeaveOrUp}
              onMouseMove={handleMouseMove}
              className={`flex gap-3.5 overflow-x-auto pb-3 pt-1 -mx-5 px-5 hide-scrollbar scroll-smooth snap-x snap-mandatory ${isMouseDown ? 'cursor-grabbing' : 'cursor-grab'}`}
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}
            >
              {locationFilteredOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link
                    key={offer.id}
                    href={`/m/${res.slug}`}
                    className="w-60 shrink-0 bg-white rounded-2xl p-3 border border-orange-100/60 overflow-hidden snap-start transition-all active:scale-95 block relative"
                    style={{ boxShadow: '0 2px 12px rgba(249,115,22,0.10)' }}
                  >
                    <div className="absolute top-3 right-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md z-10">
                      {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ خصم'}
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
                    <p className="text-xs text-slate-500 font-bold truncate mb-0.5">{res.name}</p>
                    <h3 className="font-black text-sm text-slate-900 truncate mb-2">{offer.title}</h3>
                    <div className="flex items-baseline gap-2 pt-1.5 border-t border-slate-50">
                      <span className="text-base font-black text-orange-500">{offer.offer_price} ₺</span>
                      {offer.original_price && (
                        <span className="text-xs text-slate-400 line-through font-bold">{offer.original_price} ₺</span>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-slate-800">التصنيفات</h2>
              {activeCat && (
                <button
                  onClick={() => setActiveCat(null)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border transition"
                  style={{ color: '#F97316', borderColor: '#FFEDD5', background: '#FFF7ED' }}
                >
                  عرض الكل
                </button>
              )}
            </div>
            <div
              className="flex overflow-x-auto hide-scrollbar gap-3 -mx-5 px-5 pb-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {categories.map(cat => {
                const isActive = activeCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCat(isActive ? null : cat.id)}
                    className="shrink-0 flex flex-col items-center justify-center gap-1.5 px-4 py-3.5 rounded-3xl min-w-[76px] transition-all duration-200 border"
                    style={
                      isActive
                        ? { background: '#F97316', borderColor: '#F97316', color: '#fff', boxShadow: '0 6px 20px rgba(249,115,22,0.28)', transform: 'translateY(-2px)' }
                        : { background: '#fff', borderColor: '#E5E7EB', color: '#374151' }
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800">
              {searchQuery ? 'نتائج البحث' : activeCat ? 'مطاعم هذا التصنيف' : 'مطاعم قريبة منك'}
            </h2>
            <span className="text-sm font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {filteredRestaurants.length}
            </span>
          </div>

          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-black text-slate-700 mb-1">لا توجد مطاعم قريبة</p>
              <p className="text-slate-400 text-sm font-medium">حاول تغيير التصنيف أو موقعك</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredRestaurants.map(restaurant => {
                const restaurantCats = (restaurant.platform_category_ids || []).map(
                  (cid: string) => categories.find(c => c.id === cid)
                ).filter(Boolean)
                return (
                  <Link
                    key={restaurant.id}
                    href={`/m/${restaurant.slug}`}
                    className="restaurant-card group"
                  >
                    {/* Cover */}
                    <div className="h-36 w-full bg-slate-100 relative overflow-hidden">
                      {restaurant.cover_url ? (
                        <img
                          src={restaurant.cover_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ background: `linear-gradient(135deg, ${restaurant.primary_color || '#F97316'}ee, ${restaurant.primary_color || '#F97316'}66)` }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                      {/* Distance */}
                      {restaurant.distance !== null && (
                        <div className="absolute top-3 left-3 glass-dark text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <MapPin size={11} className="text-orange-400" />
                          <span>{restaurant.distance < 1 ? 'أقل من 1 كم' : `${restaurant.distance.toFixed(1)} كم`}</span>
                        </div>
                      )}

                      {/* Category tags */}
                      {restaurantCats.length > 0 && (
                        <div className="absolute top-3 right-3 flex flex-wrap gap-1">
                          {restaurantCats.slice(0, 2).map((c: any) => (
                            <div key={c.id} className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-black text-slate-800 flex items-center gap-0.5">
                              <span>{c.icon}</span><span>{c.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Name on cover */}
                      <div className="absolute bottom-0 right-0 left-0 px-4 pb-3">
                        <h3 className="text-base font-black text-white drop-shadow-sm">{restaurant.name}</h3>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="relative px-4 pb-4">
                      {/* Floating logo */}
                      <div
                        className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-md absolute -top-7 right-4 border-4 border-white z-10 transition-transform group-hover:-translate-y-1 duration-300 overflow-hidden"
                      >
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

                      <div className="pt-9">
                        {/* Rating + Arrow */}
                        <div className="flex items-center justify-between">
                          <div className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-200 flex items-center gap-1">
                            <span>⭐</span>
                            <span>{restaurant.avg_rating || 'جديد'}</span>
                            {restaurant.ratings_count > 0 && (
                              <span className="text-[10px] text-amber-600">({restaurant.ratings_count})</span>
                            )}
                          </div>
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                            style={{ background: `${restaurant.primary_color || '#F97316'}15` }}
                          >
                            <ChevronLeft size={16} style={{ color: restaurant.primary_color || '#F97316' }} />
                          </div>
                        </div>

                        {/* Delivery info */}
                        {(() => {
                          const deliveryInfo = restaurant.distance !== null
                            ? getDeliveryFeeForDistance(restaurant.distance, restaurant.delivery_tiers)
                            : null
                          return (
                            <div className="flex flex-wrap items-center gap-2 text-xs font-bold mt-2.5">
                              {deliveryInfo && deliveryInfo.available ? (
                                <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-100 font-black">
                                  🛵 {deliveryInfo.fee} TL
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-100 font-bold text-[11px]">
                                  🚫 {deliveryInfo?.reason || 'لا توصيل لموقعك'}
                                </span>
                              )}
                              <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                <Clock size={11} /> 25-45 د
                              </span>
                            </div>
                          )
                        })()}
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
