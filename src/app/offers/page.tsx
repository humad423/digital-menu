'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { ArrowRight, Search, Tag, X, Store } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import BrandLogo from '@/components/BrandLogo'
import UserAuthButton from '@/components/UserAuthButton'

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
        .select('*, restaurants(id, name, slug, store_type), primary_item:menu_items!primary_item_id(image_url), bonus_item:menu_items!bonus_item_id(image_url), item3:menu_items!item3_id(image_url), item4:menu_items!item4_id(image_url)')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (data) setOffers(data)
      setLoading(false)
    }
    fetchOffers()
  }, [])

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

    return true
  })

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-xl md:max-w-4xl lg:max-w-6xl mx-auto px-4 py-3.5 space-y-3">
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

          {/* Store Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5 pb-1">
            {[
              { key: 'all', label: 'كافة العروض 🛍️' },
              { key: 'restaurant', label: 'عروض المطاعم 🍔' },
              { key: 'supermarket', label: 'عروض السوبر ماركت 🛒' },
              { key: 'clothing', label: 'عروض الأزياء 👗' },
              { key: 'other', label: 'عروض المتاجر الأخرى 🎁' },
            ].map(tab => {
              const isActive = selectedType === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedType(tab.key)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-xl md:max-w-4xl lg:max-w-6xl mx-auto px-4 mt-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredOffers.map(offer => {
              const res = offer.restaurants
              if (!res) return null
              return (
                <Link
                  key={offer.id}
                  href={`/m/${res.slug}`}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all active:scale-98 overflow-hidden flex flex-col group relative"
                >
                  {/* Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    {offer.min_quantity > 1 ? `🔥 ${offer.min_quantity}X` : offer.bonus_item ? '🎁 هدية' : '🏷️ عرض مميز'}
                  </div>

                  {/* Image */}
                  <div className="h-36 w-full bg-slate-100 relative">
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
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 truncate mb-1 flex items-center gap-1">
                        <Store size={12} className="text-orange-500" />
                        <span>{res.name}</span>
                      </p>
                      <h3 className="font-black text-xs text-slate-900 group-hover:text-orange-600 transition mb-3 line-clamp-2">
                        {offer.title}
                      </h3>
                    </div>

                    <div className="flex items-baseline justify-between pt-2.5 border-t border-slate-100 mt-auto">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-orange-600">{offer.offer_price} ₺</span>
                        {offer.original_price && (
                          <span className="text-[11px] font-bold text-slate-400 line-through">{offer.original_price} ₺</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                        اطلب من المتجر ⟵
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
