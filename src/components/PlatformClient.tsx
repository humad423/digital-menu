'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MapPin, Search } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'
import LocationGate, { type LocationIssue } from '@/components/LocationGate'
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
  clearUserLocation,
  getPrecisePosition,
  isLocationDenied,
  lookupCityName,
  readUserLocation,
  saveUserLocation,
  watchLocationPermission,
  type SavedLocation,
} from '@/utils/userLocation'

// The city name is only looked up again after moving this far
const CITY_REFRESH_KM = 2
// Loaded in small batches so a slow connection only fetches the images people reach
const STORES_PER_BATCH = 8
const OFFERS_ON_HOME = 3

export default function PlatformClient({
  restaurants,
  categories,
  ads,
  offers = [],
  businessTypes = [],
}: {
  restaurants: any[]
  categories: any[]
  ads: any[]
  offers?: any[]
  businessTypes?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(STORES_PER_BATCH)

  const [location, setLocation] = useState<SavedLocation | null>(null)
  const [locationReady, setLocationReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationIssue, setLocationIssue] = useState<LocationIssue>(null)
  const userLoc = location ? { lat: location.lat, lng: location.lng } : null

  const locate = useCallback((quiet = false) => {
    setLocating(true)
    setLocationIssue(null)
    getPrecisePosition()
      .then(pos => {
        const previous = readUserLocation()
        const sameCity = previous?.city && calculateDistance(previous.lat, previous.lng, pos.lat, pos.lng) <= CITY_REFRESH_KM
        setLocation(saveUserLocation({ ...pos, city: sameCity ? previous.city : undefined }))
        if (sameCity) return
        lookupCityName(pos).then(city => {
          if (city) setLocation(saveUserLocation({ ...pos, city }))
        })
      })
      .catch(error => {
        if (isLocationDenied(error)) {
          clearUserLocation()
          setLocation(null)
          setLocationIssue('denied')
        } else if (!quiet) {
          setLocationIssue('unavailable')
        }
      })
      .finally(() => setLocating(false))
  }, [])

  useEffect(() => {
    trackEvent({ event_type: 'page_view' })

    setLocation(readUserLocation())
    setLocationReady(true)

    // Only customers who allow their location see stores, and an allowed location follows them
    return watchLocationPermission(state => {
      if (state === 'granted') {
        locate(true)
      } else if (state === 'denied') {
        clearUserLocation()
        setLocation(null)
        setLocationIssue('denied')
      }
    })
  }, [locate])

  // Location is only known in the browser, so wait instead of flashing the wrong screen
  if (!locationReady) {
    return <div className="min-h-screen bg-page" />
  }

  const storesWithDistance = restaurants.map(r => ({
    ...r,
    distance: userLoc && r.latitude && r.longitude
      ? calculateDistance(userLoc.lat, userLoc.lng, r.latitude, r.longitude)
      : null,
  }))

  const nearbyStores = storesWithDistance.filter(r =>
    !!userLoc && isStoreWithinRange(userLoc.lat, userLoc.lng, r)
  )

  const locationRow = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="font-bold flex items-center gap-1.5 min-w-0">
        <MapPin size={18} className="text-brand shrink-0" />
        <span>{location?.city || 'موقعك الحالي'}</span>
      </p>
      <button onClick={() => locate()} disabled={locating} className="btn btn-secondary btn-sm">
        {locating ? 'جاري التحديد...' : 'تحديث موقعي'}
      </button>
    </div>
  )

  if (!location || nearbyStores.length === 0) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col bg-page">
        <header className="site-header">
          <div className="page-narrow py-3"><BrandLogo /></div>
        </header>

        <main className="page-narrow py-6 flex-1 space-y-5">
          {location ? (
            <>
              {locationRow}
              <div>
                <h1 className="text-2xl font-black leading-snug">لا توجد متاجر تصل إلى موقعك حالياً</h1>
                <p className="text-muted font-medium mt-1">نعمل على الوصول إلى مدن جديدة.</p>
              </div>
              {locationIssue === 'unavailable' && <p className="notice notice-warn">لم نتمكن من تحديث موقعك. تأكد أن خدمة الموقع (GPS) تعمل في هاتفك.</p>}
            </>
          ) : (
            <LocationGate issue={locationIssue} locating={locating} onLocate={() => locate()} />
          )}

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
        {locationRow}
        {locationIssue === 'unavailable' && <p className="notice notice-warn">لم نتمكن من تحديث موقعك. تأكد أن خدمة الموقع (GPS) تعمل في هاتفك.</p>}

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

      <Footer />
    </div>
  )
}
