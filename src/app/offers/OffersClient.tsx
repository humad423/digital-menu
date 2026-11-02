'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import OfferCard from '@/components/OfferCard'
import { isStoreWithinRange } from '@/utils/distance'
import { matchesSearch } from '@/utils/text'
import { readUserLocation } from '@/utils/userLocation'

const OFFERS_PER_BATCH = 9

export default function OffersClient({ offers, businessTypes }: { offers: any[]; businessTypes: any[] }) {
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [visibleCount, setVisibleCount] = useState(OFFERS_PER_BATCH)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [locationChecked, setLocationChecked] = useState(false)

  useEffect(() => {
    setUserLoc(readUserLocation())
    setLocationChecked(true)
  }, [])

  const filtered = offers.filter(offer => {
    const store = offer.restaurants
    if (!store) return false
    if (selectedType !== 'all' && store.store_type !== selectedType) return false
    if (!matchesSearch(query, offer.title, store.name)) return false
    return !!userLoc && isStoreWithinRange(userLoc.lat, userLoc.lng, store)
  })

  if (!locationChecked) return null

  if (!userLoc) {
    return (
      <div className="notice notice-info space-y-3">
        <p>اسمح لنا بمعرفة موقعك لنعرض لك العروض القريبة منك.</p>
        <Link href="/" className="btn btn-primary btn-block">تحديد موقعي</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="offer-search" className="field-label">ابحث عن عرض أو متجر</label>
        <div className="relative">
          <Search size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="offer-search"
            type="search"
            value={query}
            onChange={event => { setQuery(event.target.value); setVisibleCount(OFFERS_PER_BATCH) }}
            placeholder="اكتب هنا"
            className="field pr-11"
          />
        </div>
      </div>

      {businessTypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 lg:flex-wrap">
          {[{ slug: 'all', name: 'الكل' }, ...businessTypes].map(type => (
            <button
              key={type.slug}
              aria-pressed={selectedType === type.slug}
              onClick={() => { setSelectedType(type.slug); setVisibleCount(OFFERS_PER_BATCH) }}
              className="chip"
            >
              {type.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="notice notice-info text-center">لا توجد عروض مطابقة.</p>
      ) : (
        <div className="card-grid">
          {filtered.slice(0, visibleCount).map(offer => <OfferCard key={offer.id} offer={offer} />)}
        </div>
      )}

      {filtered.length > visibleCount && (
        <button onClick={() => setVisibleCount(count => count + OFFERS_PER_BATCH)} className="btn btn-secondary btn-block">
          عرض المزيد من العروض
        </button>
      )}
    </div>
  )
}
