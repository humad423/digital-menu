'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, Store } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import { isStoreWithinRange } from '@/utils/distance'

interface OffersClientProps {
  offers: any[]
  businessTypes: any[]
}

export default function OffersClient({ offers, businessTypes }: OffersClientProps) {
  const [searchQuery, setSearchQuery]     = useState('')
  const [selectedType, setSelectedType]   = useState<string>('all')

  // Read user location from localStorage (client-only, runs after hydration)
  let userLoc: { lat: number; lng: number } | null = null
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('alfsouq_user_loc')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) userLoc = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
      }
    } catch {}
  }

  const filteredOffers = offers.filter(offer => {
    const store = offer.restaurants
    if (!store) return false
    if (selectedType !== 'all' && store.store_type !== selectedType) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = offer.title?.toLowerCase().includes(q)
      const storeMatch = store.name?.toLowerCase().includes(q)
      if (!titleMatch && !storeMatch) return false
    }
    if (userLoc && !isStoreWithinRange(userLoc.lat, userLoc.lng, store)) return false
    return true
  })

  const tabs = [
    { key: 'all', label: 'الكل', icon: '🛍️' },
    ...(businessTypes.length > 0
      ? businessTypes.map(bt => ({ key: bt.slug, label: bt.name, icon: bt.icon }))
      : [
          { key: 'restaurant', label: 'مطاعم', icon: '🍔' },
          { key: 'supermarket', label: 'سوبر ماركت', icon: '🛒' },
          { key: 'clothing', label: 'ألبسة وموضة', icon: '👗' },
          { key: 'other', label: 'متاجر أخرى', icon: '🎁' },
        ]),
  ]

  return (
    <>
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="ابحث عن عرض أو اسم متجر..."
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

      {/* Business Type Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5 pb-1 -mx-1 px-1">
        {tabs.map(tab => {
          const isActive = selectedType === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedType(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Offers Grid */}
      <div className="mt-6">
        {filteredOffers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <p className="text-5xl">🏷️</p>
            <h3 className="font-black text-slate-800 text-base">لا توجد عروض مطابقة للبحث</h3>
            <p className="text-xs text-slate-400 font-medium">جرب تغيير كلمات البحث أو اختر نوع متجر آخر</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredOffers.map(offer => {
              const res = offer.restaurants
              if (!res) return null
              return (
                <Link
                  key={offer.id}
                  href={`/m/${res.slug}`}
                  prefetch={false}
                  className="group bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] active:brightness-95 transition-all duration-150 overflow-hidden block relative flex flex-col justify-between cursor-pointer select-none"
                >
                  {/* Offer Badge */}
                  <div className="absolute top-3 right-3 z-10 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs">
                    {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ خصم مميز'}
                  </div>

                  {/* Image */}
                  <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
                    <SmartOfferImage
                      primaryImage={offer.primary_item?.image_url}
                      bonusImage={offer.bonus_item?.image_url}
                      item3Image={offer.item3?.image_url}
                      item4Image={offer.item4?.image_url}
                      customImage={offer.image_url}
                      minQuantity={offer.min_quantity}
                      bonusQuantity={offer.bonus_quantity}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold mb-1">
                        <Store size={13} className="text-orange-500" />
                        <span>{res.name}</span>
                      </div>
                      <h3 className="font-black text-sm text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                        {offer.title}
                      </h3>
                      {offer.description && (
                        <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1">
                          {offer.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-baseline justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-black text-orange-600">{offer.offer_price} ₺</span>
                        {offer.original_price && (
                          <span className="text-xs font-bold text-slate-400 line-through">{offer.original_price} ₺</span>
                        )}
                      </div>
                      <span className="text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform">
                        تصفح العرض ⟵
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
