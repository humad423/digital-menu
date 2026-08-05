'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, MapPin, Clock, ChevronLeft, X, Bike, Star, Flame } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import UserAuthButton from '@/components/UserAuthButton'
import BrandLogo from '@/components/BrandLogo'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'

// ═══════════════════════════════════════════════════════════
//  SWIPEABLE ADS SLIDER  (touch + mouse drag + autoplay)
// ═══════════════════════════════════════════════════════════
function AdsSlider({ ads }: { ads: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent]   = useState(0)
  const [isDragging, setDrag]   = useState(false)
  const [startX, setStartX]     = useState(0)
  const [dragX, setDragX]       = useState(0)
  const autoRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)


  const goTo = (i: number) => setCurrent((i + ads.length) % ads.length)
  const next = useCallback(() => goTo(current + 1), [current, ads.length])
  const prev = useCallback(() => goTo(current - 1), [current, ads.length])

  const arm = useCallback(() => {
    clearTimeout(autoRef.current)
    if (ads.length > 1) autoRef.current = setTimeout(next, 4500)
  }, [next, ads.length])

  useEffect(() => { arm(); return () => clearTimeout(autoRef.current) }, [current, arm])

  /* Touch */
  const onTouchStart = (e: React.TouchEvent) => { setStartX(e.touches[0].clientX); setDrag(true); clearTimeout(autoRef.current) }
  const onTouchMove  = (e: React.TouchEvent) => { if (isDragging) setDragX(e.touches[0].clientX - startX) }
  const onTouchEnd   = () => {
    const w = containerRef.current?.offsetWidth || 300
    if (dragX < -(w * 0.22)) next(); else if (dragX > (w * 0.22)) prev()
    setDragX(0); setDrag(false); arm()
  }

  /* Mouse */
  const onMouseDown  = (e: React.MouseEvent) => { setStartX(e.clientX); setDrag(true); clearTimeout(autoRef.current) }
  const onMouseMove  = (e: React.MouseEvent) => { if (isDragging) { e.preventDefault(); setDragX(e.clientX - startX) } }
  const onMouseEnd   = () => {
    if (isDragging) {
      const w = containerRef.current?.offsetWidth || 300
      if (dragX < -(w * 0.22)) next(); else if (dragX > (w * 0.22)) prev()
    }
    setDragX(0); setDrag(false); arm()
  }

  const w    = containerRef.current?.offsetWidth || 1
  const pct  = -(current * 100) + (dragX / w) * 100

  if (!ads.length) return null
  return (
    <div className="relative rounded-2xl overflow-hidden select-none" style={{ aspectRatio: '16/7' }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}   onMouseMove={onMouseMove} onMouseUp={onMouseEnd} onMouseLeave={onMouseEnd}
        style={{ cursor: isDragging ? 'grabbing' : ads.length > 1 ? 'grab' : 'default' }}
      >
        {/* Track */}
        <div
          className="flex h-full"
          style={{
            transform: `translateX(${pct}%)`,
            transition: isDragging ? 'none' : 'transform 0.42s cubic-bezier(0.25,1,0.5,1)',
            willChange: 'transform',
          }}
        >
          {ads.map(ad => (
            <div key={ad.id} className="flex-none w-full h-full">
              {ad.link_url
                ? <a href={ad.link_url} target="_blank" rel="noreferrer" className="block w-full h-full" draggable={false}><img src={ad.image_url} alt="" className="w-full h-full object-cover" draggable={false} /></a>
                : <img src={ad.image_url} alt="" className="w-full h-full object-cover" draggable={false} />
              }
            </div>
          ))}
        </div>
      </div>

      {/* Gradient bottom */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 50%)' }} />

      {/* Dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {ads.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === current ? 22 : 6, background: i === current ? '#fff' : 'rgba(255,255,255,0.45)' }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  MAIN PLATFORM CLIENT
// ═══════════════════════════════════════════════════════════
export default function PlatformClient({
  restaurants, categories, ads, offers = []
}: {
  restaurants: any[]; categories: any[]; ads: any[]; offers?: any[]
}) {
  const [activeCat, setActiveCat]     = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const offersRef   = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLInputElement>(null)
  const [isDragOffer, setIsDragOffer] = useState(false)
  const [offerStartX, setOfferStartX] = useState(0)
  const [offerScrollL, setOfferScrollL] = useState(0)

  const [locationStatus, setLocStatus] = useState<'granted'|'default'>('default')
  const [userLoc, setUserLoc]          = useState({ lat: 40.8167, lng: 29.3750 })

  const requestLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      p => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocStatus('granted') },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    )
  }
  useEffect(() => { requestLocation() }, [])

  // Attach distances
  const withDist = restaurants.map(r => ({
    ...r,
    distance: (r.latitude && r.longitude)
      ? calculateDistance(userLoc.lat, userLoc.lng, r.latitude, r.longitude)
      : null
  }))

  const allowedIds = new Set(withDist.map(r => r.id))

  const filtered = withDist.filter(r => {
    const cat    = activeCat ? (r.platform_category_ids || []).includes(activeCat) : true
    const search = r.name.toLowerCase().includes(searchQuery.toLowerCase())
    return cat && search
  }).sort((a, b) => (a.distance !== null && b.distance !== null) ? a.distance - b.distance : 0)

  const filteredOffers = (offers || []).filter(o => allowedIds.has(o.restaurants?.id || o.restaurant_id))

  /* Offers drag-scroll */
  const offerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!offersRef.current) return
    setIsDragOffer(true); setOfferStartX(e.pageX - offersRef.current.offsetLeft); setOfferScrollL(offersRef.current.scrollLeft)
  }
  const offerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragOffer || !offersRef.current) return
    e.preventDefault()
    offersRef.current.scrollLeft = offerScrollL - (e.pageX - offersRef.current.offsetLeft - offerStartX) * 1.5
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Tajawal','Cairo',sans-serif" }}>

      {/* ═══ STICKY HEADER ══════════════════════════════════════ */}
      <header className="platform-header-sticky">
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <BrandLogo size="md" variant="light" />
          <UserAuthButton />
        </div>

        {/* Tagline */}
        <p className="platform-tagline">
          سوقك الأول لاكتشاف أشهى <span style={{ color: '#FB923C' }}>المأكولات والعروض</span>
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <input
            ref={searchRef}
            type="text"
            placeholder="ابحث عن مطعم أو أكلة..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="platform-search-input"
          />
          <Search size={18} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <X size={17} />
            </button>
          )}
        </div>
      </header>

      {/* ═══ CONTENT ════════════════════════════════════════════ */}
      <div style={{ padding: '20px 16px', paddingBottom: 96, maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Location notice */}
        {locationStatus === 'default' && (
          <div className="location-notice">
            <MapPin size={16} style={{ color: '#D97706', flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E', flex: 1 }}>تصفح بموقع منطقة شايروفا / كيبزة الافتراضي</p>
            <button onClick={requestLocation} className="location-btn">تحديد موقعي 📍</button>
          </div>
        )}

        {/* ── ADS SLIDER ─────────────────────────────────────── */}
        {ads.length > 0 && !searchQuery && <AdsSlider ads={ads} />}

        {/* ── OFFERS ─────────────────────────────────────────── */}
        {filteredOffers.length > 0 && !searchQuery && (
          <section>
            <div className="section-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="section-icon-badge" style={{ background: '#FFF7ED', color: '#EA580C' }}>🔥</div>
                <h2 className="section-title">عروض اليوم</h2>
              </div>
              <span className="section-count">{filteredOffers.length}</span>
            </div>

            <div
              ref={offersRef}
              className="offers-scroll"
              onMouseDown={offerMouseDown}
              onMouseMove={offerMouseMove}
              onMouseUp={() => setIsDragOffer(false)}
              onMouseLeave={() => setIsDragOffer(false)}
              style={{ cursor: isDragOffer ? 'grabbing' : 'grab' }}
            >
              {filteredOffers.map(offer => {
                const res = offer.restaurants
                if (!res) return null
                return (
                  <Link key={offer.id} href={`/m/${res.slug}`} className="offer-card" draggable={false}>
                    {/* Badge */}
                    <div className="offer-type-badge">
                      {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ خصم'}
                    </div>

                    {/* Image */}
                    <div className="offer-card-img">
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
                    <div className="offer-card-body">
                      <p className="offer-rest-name">{res.name}</p>
                      <h3 className="offer-title">{offer.title}</h3>
                      <div className="offer-price-row">
                        <span className="offer-price">{offer.offer_price} ₺</span>
                        {offer.original_price && <span className="offer-original">{offer.original_price} ₺</span>}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── CATEGORIES ─────────────────────────────────────── */}
        {!searchQuery && categories.length > 0 && (
          <section>
            <div className="section-title-row">
              <h2 className="section-title">التصنيفات</h2>
              {activeCat && (
                <button onClick={() => setActiveCat(null)} className="clear-filter-btn">عرض الكل ✕</button>
              )}
            </div>
            <div className="cats-scroll">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
                  className={`cat-chip${activeCat === cat.id ? ' active' : ''}`}
                >
                  <span className="cat-chip-icon">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── RESTAURANTS ────────────────────────────────────── */}
        <section>
          <div className="section-title-row" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="section-icon-badge" style={{ background: '#EFF6FF', color: '#2563EB' }}>🏪</div>
              <h2 className="section-title">
                {searchQuery ? 'نتائج البحث' : activeCat ? 'مطاعم التصنيف' : 'مطاعم قريبة منك'}
              </h2>
            </div>
            <span className="section-count">{filtered.length}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍽️</div>
              <p className="empty-title">لا توجد مطاعم</p>
              <p className="empty-sub">جرّب تغيير التصنيف أو موقعك</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map(restaurant => {
                const deliveryInfo = restaurant.distance !== null
                  ? getDeliveryFeeForDistance(restaurant.distance, restaurant.delivery_tiers)
                  : null
                const restaurantCats = (restaurant.platform_category_ids || [])
                  .map((cid: string) => categories.find(c => c.id === cid))
                  .filter(Boolean)

                return (
                  <Link key={restaurant.id} href={`/m/${restaurant.slug}`} className="rest-card">
                    {/* Cover */}
                    <div className="rest-cover">
                      {restaurant.cover_url
                        ? <img src={restaurant.cover_url} alt="" className="rest-cover-img" draggable={false} />
                        : <div className="rest-cover-fallback" style={{ background: `linear-gradient(135deg, ${restaurant.primary_color || '#F97316'}dd, ${restaurant.primary_color || '#F97316'}66)` }} />
                      }
                      {/* Dark gradient */}
                      <div className="rest-cover-gradient" />

                      {/* Distance badge */}
                      {restaurant.distance !== null && (
                        <div className="rest-distance-badge">
                          <MapPin size={10} style={{ color: '#FB923C' }} />
                          {restaurant.distance < 1 ? 'أقل من 1 كم' : `${restaurant.distance.toFixed(1)} كم`}
                        </div>
                      )}

                      {/* Category tags */}
                      {restaurantCats.length > 0 && (
                        <div className="rest-cat-tags">
                          {restaurantCats.slice(0, 2).map((c: any) => (
                            <div key={c.id} className="rest-cat-tag">{c.icon} {c.name}</div>
                          ))}
                        </div>
                      )}

                      {/* Restaurant name on image */}
                      <div className="rest-name-overlay">
                        <h3 className="rest-name">{restaurant.name}</h3>
                      </div>

                      {/* Floating logo */}
                      <div className="rest-logo-float">
                        {restaurant.logo_url
                          ? <img src={restaurant.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }} />
                          : <div style={{ width: '100%', height: '100%', borderRadius: 10, background: restaurant.primary_color || '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 900 }}>{restaurant.name[0]}</div>
                        }
                      </div>
                    </div>

                    {/* Body */}
                    <div className="rest-body">
                      {/* Rating */}
                      <div className="rest-rating-row">
                        <div className="rest-rating-badge">
                          ⭐ {restaurant.avg_rating || 'جديد'}
                          {restaurant.ratings_count > 0 && <span style={{ fontSize: 10, opacity: 0.75 }}>({restaurant.ratings_count})</span>}
                        </div>
                        <div className="rest-time-badge">
                          <Clock size={11} />
                          <span>25-40 د</span>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="rest-delivery-row">
                        {deliveryInfo?.available ? (
                          <div className="delivery-badge delivery-ok">
                            <Bike size={12} />
                            <span>توصيل {deliveryInfo.fee} TL</span>
                          </div>
                        ) : (
                          <div className="delivery-badge delivery-na">
                            <span>🚫 {deliveryInfo?.reason || 'خارج نطاق التوصيل'}</span>
                          </div>
                        )}
                        <ChevronLeft size={16} style={{ color: '#CBD5E1', marginRight: 'auto' }} />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
