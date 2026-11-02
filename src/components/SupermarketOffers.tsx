'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search, X } from 'lucide-react'
import { confirmCartStoreSwitch, useCartStore } from '@/store/cartStore'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { matchesSearch } from '@/utils/text'
import { offerToMenuItem } from '@/utils/offerItems'
import { trackEvent, trackGAAddToCart, usePageDurationTracker } from '@/utils/analytics'
import { CURRENCY_SYMBOL } from '@/config/site'

function discountPercent(item: any): number | null {
  const original = Number(item.original_price)
  const price = Number(item.price)
  return original > price ? Math.round(((original - price) / original) * 100) : null
}

function DealCard({ item, restaurantId, canOrder }: { item: any; restaurantId: string; canOrder: boolean }) {
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const quantity = useCartStore(s =>
    s.restaurantId === restaurantId ? s.items.find(i => i.id === item.id)?.quantity ?? 0 : 0
  )
  const discount = discountPercent(item)
  const isKilo = item.unit === 'kg' || item.allow_custom_amount === true
  const isOutOfStock = item.is_available === false

  const add = () => {
    if (!confirmCartStoreSwitch(restaurantId)) return
    addItem({ id: item.id, name: item.name, price: Number(item.price) }, restaurantId)
    trackGAAddToCart(item.name, Number(item.price))
  }

  return (
    <article className={`relative bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col ${isOutOfStock ? 'opacity-60' : ''}`}>
      {discount !== null && (
        <div className="absolute top-2 right-2 z-10 bg-red-600 text-white font-black text-sm px-2 py-1 rounded-xl shadow-sm leading-none">
          -{discount}%
        </div>
      )}

      <div className="aspect-square bg-slate-100">
        {item.image_url ? (
          <img
            src={getOptimizedImageUrl(item.image_url, 400)}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
        )}
      </div>

      <div className="p-2.5 flex-1 flex flex-col gap-1.5">
        <h3 className="font-black text-xs text-slate-900 leading-snug line-clamp-2">{item.name}</h3>
        {item.description && (
          <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{item.description}</p>
        )}

        <div className="mt-auto">
          {discount !== null && (
            <span className="block text-[11px] font-bold text-slate-400 line-through leading-none">
              {item.original_price} {CURRENCY_SYMBOL}
            </span>
          )}
          <span className="text-lg font-black text-red-600 leading-tight">
            {item.price} {CURRENCY_SYMBOL}
            {isKilo && <span className="text-[10px] font-bold text-slate-400"> / كغ</span>}
          </span>
        </div>

        {isOutOfStock ? (
          <span className="text-center text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-200 py-1.5 rounded-xl">
            نفد
          </span>
        ) : !canOrder ? null : quantity === 0 ? (
          <button
            onClick={add}
            className="w-full py-1.5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-1 transition active:scale-95"
            style={{ background: 'var(--color-primary, #F97316)' }}
          >
            <Plus size={14} />
            <span>أضف للسلة</span>
          </button>
        ) : (
          <div
            className="flex items-center justify-between p-1 rounded-xl text-white"
            style={{ background: 'var(--color-primary, #F97316)' }}
          >
            <button
              onClick={() => updateQuantity(item.id, quantity - 1)}
              aria-label="إنقاص الكمية"
              className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center active:scale-90 transition"
            >
              <Minus size={13} />
            </button>
            <span className="font-black text-xs">{quantity}</span>
            <button
              onClick={add}
              aria-label="زيادة الكمية"
              className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center active:scale-90 transition"
            >
              <Plus size={13} />
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

export default function SupermarketOffers({
  restaurant,
  categories,
  menuItems,
  offers,
}: {
  restaurant: any
  categories: any[]
  menuItems: any[]
  offers: any[]
}) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    trackEvent({ event_type: 'menu_view', store_id: restaurant.id })
  }, [restaurant.id])
  usePageDurationTracker({ store_id: restaurant.id, store_slug: restaurant.slug })

  const deals = useMemo(() => {
    // Biggest discounts first, because that is what a flyer leads with
    const byDiscount = (a: any, b: any) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0)
    const bundles = activeCategory ? [] : offers.map(offerToMenuItem)
    const items = activeCategory ? menuItems.filter(i => i.category_id === activeCategory) : menuItems
    return [...bundles, ...items]
      .filter(item => matchesSearch(query, item.name, item.description))
      .sort(byDiscount)
  }, [activeCategory, menuItems, offers, query])

  const categoriesWithDeals = categories.filter(c => menuItems.some(i => i.category_id === c.id))
  const canOrder = restaurant.enable_whatsapp_orders !== false

  return (
    <div className="pb-10">
      <div className="rounded-3xl p-4 mb-3 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #F97316 100%)' }}>
        <p className="text-[11px] font-black opacity-90">🔥 عروض {restaurant.name}</p>
        <h2 className="text-xl font-black leading-tight mt-0.5">أقوى العروض والتخفيضات</h2>
        <p className="text-[11px] font-bold opacity-90 mt-1">{deals.length} عرض متوفر حالياً</p>
      </div>

      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md py-2 space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث في العروض..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/90 rounded-2xl py-2.5 pr-10 pl-9 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 shadow-2xs transition-all"
          />
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {categoriesWithDeals.length > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
            {[{ id: null, name: 'كل العروض' }, ...categoriesWithDeals].map(category => (
              <button
                key={category.id ?? 'all'}
                onClick={() => setActiveCategory(category.id)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-black transition active:scale-95 ${
                  activeCategory === category.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-200/90'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {deals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6 mt-3">
          <div className="text-4xl mb-2">🏷️</div>
          <p className="font-black text-slate-800 text-sm">لا توجد عروض مطابقة</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {deals.map(item => (
            <DealCard key={item.id} item={item} restaurantId={restaurant.id} canOrder={canOrder} />
          ))}
        </div>
      )}
    </div>
  )
}
