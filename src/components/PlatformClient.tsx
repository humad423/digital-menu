'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Search, X } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'
import LocationPicker from '@/components/LocationPicker'
import OfferCard from '@/components/OfferCard'
import StoreCard from '@/components/StoreCard'
import InstallAppButton from '@/components/pwa/InstallAppButton'
import InstallSuggestion from '@/components/pwa/InstallSuggestion'
import { calculateDistance, isStoreWithinRange } from '@/utils/distance'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { trackEvent } from '@/utils/analytics'
import { matchesSearch } from '@/utils/text'
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
// Loaded in small batches so a slow connection only fetches the images people reach
const STORES_PER_BATCH = 8
const OFFERS_ON_HOME = 3

function LocationSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div dir="rtl" role="dialog" aria-label="تغيير المنطقة" className="bg-white w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">أين أنت؟</h2>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function PlatformClient({
  restaurants,
  categories,
  ads,
  offers = [],
  serviceZones = [],
  businessTypes = [],
}: {
  restaurants: any[]
  categories: any[]
  ads: any[]
  offers?: any[]
  serviceZones?: any[]
  businessTypes?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(STORES_PER_BATCH)
  const [showLocationSheet, setShowLocationSheet] = useState(false)

  const [location, setLocation] = useState<SavedLocation | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [movedTo, setMovedTo] = useState<{ lat: number; lng: number } | null>(null)
  const [browseAll, setBrowseAll] = useState(false)
  const userLoc = location ? { lat: location.lat, lng: location.lng } : null

  const applyGpsPosition = useCallback((pos: { lat: number; lng: number }) => {
    const zone = serviceZones
      .map((z: any) => ({ ...z, dist: calculateDistance(pos.lat, pos.lng, z.latitude, z.longitude) }))
      .filter((z: any) => z.dist <= (z.radius_km || 15))
      .sort((a: any, b: any) => a.dist - b.dist)[0]

    setLocation(saveUserLocation({ ...pos, area: zone?.name, source: 'gps' }))
    setMovedTo(null)
    setBrowseAll(false)
    setShowLocationSheet(false)
  }, [serviceZones])

  const requestLocation = useCallback(() => {
    setLocating(true)
    setLocationError('')
    getPrecisePosition()
      .then(applyGpsPosition)
      .catch(() => setLocationError('لم نتمكن من تحديد موقعك. اسمح للمتصفح بالوصول إلى الموقع، أو اختر منطقتك من القائمة.'))
      .finally(() => setLocating(false))
  }, [applyGpsPosition])

  const selectZone = (zone: any) => {
    setLocation(saveUserLocation({
      lat: Number(zone.latitude),
      lng: Number(zone.longitude),
      area: zone.name,
      source: 'zone',
    }))
    setLocationError('')
    setMovedTo(null)
    setBrowseAll(false)
    setShowLocationSheet(false)
  }

  useEffect(() => {
    trackEvent({ event_type: 'page_view' })

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

  const activeZones = serviceZones.filter((z: any) => z.is_active !== false && z.latitude && z.longitude)
  const isInCoverage = activeZones.length === 0 || (!!userLoc && activeZones.some((z: any) =>
    calculateDistance(userLoc.lat, userLoc.lng, Number(z.latitude), Number(z.longitude)) <= (Number(z.radius_km) || 15)
  ))

  // Location is only known in the browser, so wait instead of flashing the wrong screen
  if (!locationReady) {
    return <div className="min-h-screen bg-page" />
  }

  if (!locating && !isInCoverage && !browseAll) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col bg-page">
        <header className="site-header">
          <div className="page-narrow py-3"><BrandLogo /></div>
        </header>

        <main className="page-narrow py-6 flex-1 space-y-5">
          {location ? (
            <div>
              <h1 className="text-2xl font-black leading-snug">ألف سوق غير متوفر في منطقتك بعد</h1>
              <p className="text-muted font-medium mt-1">نعمل على الوصول إلى مناطق جديدة. يمكنك اختيار منطقة أخرى أو تصفح كل المتاجر.</p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-black leading-snug">شو في حواليك؟</h1>
              <p className="text-muted font-medium mt-1">حدد موقعك لنعرض لك المتاجر القريبة منك، ومنتجاتها وأسعارها.</p>
            </div>
          )}

          {locationError && <p className="notice notice-bad">{locationError}</p>}

          <LocationPicker zones={activeZones} locating={locating} onUseGps={requestLocation} onSelectZone={selectZone} />

          <button onClick={() => setBrowseAll(true)} className="btn btn-secondary btn-block">
            تصفح كل المتاجر
          </button>

          <p className="text-center">
            <a href={supportWhatsappUrl('مرحباً، أرغب في إضافة متجري إلى منصة ألف سوق')} target="_blank" rel="noopener noreferrer" className="font-bold text-brand underline">
              هل عندك متجر؟ تواصل معنا لإضافته
            </a>
          </p>
        </main>

        <Footer />
      </div>
    )
  }

  const storesWithDistance = restaurants.map(r => ({
    ...r,
    distance: userLoc && r.latitude && r.longitude
      ? calculateDistance(userLoc.lat, userLoc.lng, r.latitude, r.longitude)
      : null,
  }))

  const nearbyStores = storesWithDistance.filter(r =>
    browseAll || !userLoc || isStoreWithinRange(userLoc.lat, userLoc.lng, r)
  )
  const nearbyIds = new Set(nearbyStores.map(r => r.id))

  const stores = nearbyStores
    .filter(r =>
      (activeType === 'all' || (r.store_type || 'restaurant') === activeType) &&
      (!activeCategory || (r.platform_category_ids || []).includes(activeCategory)) &&
      matchesSearch(searchQuery, r.name)
    )
    .sort((a, b) => (a.distance !== null && b.distance !== null ? a.distance - b.distance : 0))

  const nearbyOffers = offers
    .filter(o => nearbyIds.has(o.restaurants?.id || o.restaurant_id))
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .slice(0, OFFERS_ON_HOME)

  const visibleAds = ads.filter(ad =>
    !ad.latitude || !ad.longitude || !ad.radius_km ||
    (!!userLoc && calculateDistance(userLoc.lat, userLoc.lng, ad.latitude, ad.longitude) <= ad.radius_km)
  )

  const isFiltering = searchQuery.trim() !== '' || activeType !== 'all' || activeCategory !== null
  const typeFilters = [{ slug: 'all', name: 'الكل' }, ...businessTypes]

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-page">
      <header className="site-header">
        <div className="page py-3 flex items-center justify-between gap-3">
          <BrandLogo />
          <InstallAppButton variant="header" label="التطبيق" />
        </div>
      </header>

      <main className="page py-4 flex-1 space-y-6">
        {/* Where am I, and how do I change it */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-bold flex items-center gap-1.5 min-w-0">
            <MapPin size={18} className="text-brand shrink-0" />
            <span>{browseAll ? 'كل المتاجر' : location?.area || 'موقعي الحالي'}</span>
          </p>
          <button onClick={() => setShowLocationSheet(true)} className="btn btn-secondary btn-sm">
            تغيير المنطقة
          </button>
        </div>

        {movedTo && location && (
          <div className="notice notice-info space-y-3">
            <p>يبدو أنك الآن خارج {location.area || 'المنطقة التي اخترتها'}.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={() => applyGpsPosition(movedTo)} className="btn btn-primary">استخدم موقعي الحالي</button>
              <button onClick={() => { rememberStayInZone(); setMovedTo(null) }} className="btn btn-secondary">
                ابقَ في {location.area || 'هذه المنطقة'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div>
          <label htmlFor="store-search" className="field-label">ابحث عن متجر</label>
          <div className="relative">
            <Search size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              id="store-search"
              type="search"
              value={searchQuery}
              onChange={event => { setSearchQuery(event.target.value); setVisibleCount(STORES_PER_BATCH) }}
              placeholder="اكتب اسم المتجر"
              className="field pr-11"
            />
          </div>
        </div>

        {/* What kind of store */}
        {businessTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 lg:flex-wrap">
            {typeFilters.map(type => (
              <button
                key={type.slug}
                aria-pressed={activeType === type.slug}
                onClick={() => { setActiveType(type.slug); setActiveCategory(null); setVisibleCount(STORES_PER_BATCH) }}
                className="chip"
              >
                {type.name}
              </button>
            ))}
          </div>
        )}

        {activeType === 'restaurant' && categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 lg:flex-wrap">
            {categories.map(category => (
              <button
                key={category.id}
                aria-pressed={activeCategory === category.id}
                onClick={() => { setActiveCategory(activeCategory === category.id ? null : category.id); setVisibleCount(STORES_PER_BATCH) }}
                className="chip"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {!isFiltering && visibleAds.length > 0 && (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar snap-x snap-mandatory">
            {visibleAds.map(ad => {
              const banner = (
                <img
                  src={getOptimizedImageUrl(ad.image_url, 800)}
                  alt="إعلان"
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-[16/7] object-cover rounded-2xl bg-slate-200"
                />
              )
              const slide = 'block shrink-0 snap-start w-full max-w-2xl'
              return ad.link_url ? (
                <a
                  key={ad.id}
                  href={ad.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent({ event_type: 'ad_click', ad_id: ad.id })}
                  className={slide}
                >
                  {banner}
                </a>
              ) : (
                <div key={ad.id} className={slide}>{banner}</div>
              )
            })}
          </div>
        )}

        {!isFiltering && nearbyOffers.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">عروض قريبة منك</h2>
              <Link href="/offers" prefetch={false} className="btn btn-secondary btn-sm">كل العروض</Link>
            </div>
            <div className="card-grid">
              {nearbyOffers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="section-title">{searchQuery.trim() ? 'نتائج البحث' : 'المتاجر القريبة منك'} ({stores.length})</h2>

          {stores.length === 0 ? (
            <div className="notice notice-info text-center">
              <p>لا توجد متاجر مطابقة.</p>
              {isFiltering && (
                <button
                  onClick={() => { setSearchQuery(''); setActiveType('all'); setActiveCategory(null) }}
                  className="btn btn-secondary mt-3"
                >
                  عرض كل المتاجر
                </button>
              )}
            </div>
          ) : (
            <div className="card-grid">
              {stores.slice(0, visibleCount).map(store => <StoreCard key={store.id} store={store} />)}
            </div>
          )}

          {stores.length > visibleCount && (
            <button onClick={() => setVisibleCount(count => count + STORES_PER_BATCH)} className="btn btn-secondary btn-block">
              عرض المزيد من المتاجر
            </button>
          )}
        </section>

        <InstallSuggestion />
      </main>

      {showLocationSheet && (
        <LocationSheet onClose={() => setShowLocationSheet(false)}>
          {locationError && <p className="notice notice-bad">{locationError}</p>}
          <LocationPicker zones={activeZones} locating={locating} onUseGps={requestLocation} onSelectZone={selectZone} />
        </LocationSheet>
      )}

      <Footer />
    </div>
  )
}
