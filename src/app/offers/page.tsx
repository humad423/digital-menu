'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowRight, Search, Tag, X, Store } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import BrandLogo from '@/components/BrandLogo'
import UserAuthButton from '@/components/UserAuthButton'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'

export default function AllOffersPage() {
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true)
      const { data } = await supabase
        .from('offers')
        .select('*, restaurants(id, name, slug, store_type, latitude, longitude, delivery_tiers, has_delivery), primary_item:menu_items!primary_item_id(image_url), bonus_item:menu_items!bonus_item_id(image_url), item3:menu_items!item3_id(image_url), item4:menu_items!item4_id(image_url)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (data) setOffers(data)
      setLoading(false)
    }
    fetchOffers()
  }, [])

  let userLoc: { lat: number, lng: number } | null = null
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('user_location')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.lat && parsed.lng) {
          userLoc = { lat: Number(parsed.lat), lng: Number(parsed.lng) }
        }
      }
    } catch(e) {}
  }

  const filteredOffers = offers.filter(offer => {
    const store = offer.restaurants
    if (!store) return false

    // Filter by store type if selected
    if (selectedType !== 'all' && store.store_type !== selectedType) {
      return false
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const titleMatch = offer.title?.toLowerCase().includes(q)
      const storeMatch = store.name?.toLowerCase().includes(q)
      if (!titleMatch && !storeMatch) return false
    }

    // Exclude if store is outside delivery radius for user
    if (userLoc && store.has_delivery !== false && store.latitude && store.longitude) {
      const dist = calculateDistance(userLoc.lat, userLoc.lng, store.latitude, store.longitude)
      const deliveryInfo = getDeliveryFeeForDistance(dist, store.delivery_tiers)
      if (deliveryInfo && deliveryInfo.available === false) {
        return false
      }
    }

    return true
  })

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition border border-slate-700"
                title="العودة للرئيسية"
              >
                <ArrowRight size={18} />
              </Link>
              <div>
                <h1 className="font-black text-base text-white flex items-center gap-2">
                  <span>🔥</span> جميع العروض والتخفيضات
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">استكشف كافة عروض وبكجات المنصة المتاحة</p>
              </div>
            </div>

            <UserAuthButton variant="light" />
          </div>

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
            {[
              { key: 'all', label: 'الكل', icon: '🛍️' },
              { key: 'restaurant', label: 'مطاعم', icon: '🍔' },
              { key: 'supermarket', label: 'سوبر ماركت', icon: '🛒' },
              { key: 'clothing', label: 'ألبسة وموضة', icon: '👗' },
              { key: 'other', label: 'متاجر أخرى', icon: '🎁' },
            ].map(tab => {
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
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-slate-400">جاري تحميل العروض والتخفيضات...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
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
                  className="group bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden block relative flex flex-col justify-between"
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
      </main>
    </div>
  )
}
