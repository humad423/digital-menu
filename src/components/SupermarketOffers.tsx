'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
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
    <article className={`card flex flex-col ${isOutOfStock ? 'opacity-70' : ''}`}>
      <div className="relative aspect-square bg-slate-200">
        {item.image_url && (
          <img src={getOptimizedImageUrl(item.image_url, 400)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        )}
        {discount !== null && (
          <span className="absolute top-2 right-2 bg-red-700 text-white font-black px-2 py-0.5 rounded-lg">خصم {discount}%</span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="font-black leading-snug">{item.name}</h3>
        <div className="mt-auto">
          {discount !== null && (
            <p className="text-muted font-medium line-through">كان {item.original_price} {CURRENCY_SYMBOL}</p>
          )}
          <p className="text-xl font-black text-brand leading-snug">
            {item.price} {CURRENCY_SYMBOL}
            {isKilo && <span className="text-base text-muted font-medium"> للكيلو</span>}
          </p>
        </div>

        {isOutOfStock ? (
          <p className="notice notice-info text-center !p-2">غير متوفر</p>
        ) : !canOrder ? null : quantity === 0 ? (
          <button onClick={add} className="btn btn-primary btn-block mt-1">أضف إلى السلة</button>
        ) : (
          <div className="grid grid-cols-3 items-center border border-line rounded-xl overflow-hidden mt-1">
            <button onClick={() => updateQuantity(item.id, quantity - 1)} aria-label="إنقاص الكمية" className="min-h-12 flex items-center justify-center bg-slate-100">
              <Minus size={20} />
            </button>
            <span className="text-center text-lg font-black">{quantity}</span>
            <button onClick={add} aria-label="زيادة الكمية" className="min-h-12 flex items-center justify-center bg-slate-100">
              <Plus size={20} />
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
    const bundles = activeCategory ? [] : offers.map(offerToMenuItem)
    const items = activeCategory ? menuItems.filter(i => i.category_id === activeCategory) : menuItems
    return [...bundles, ...items]
      .filter(item => matchesSearch(query, item.name, item.description))
      .sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0))
  }, [activeCategory, menuItems, offers, query])

  const categoriesWithDeals = categories.filter(c => menuItems.some(i => i.category_id === c.id))
  const canOrder = restaurant.enable_whatsapp_orders !== false

  return (
    <div className="space-y-4">
      <h2 className="section-title">عروض {restaurant.name} ({deals.length})</h2>

      <div>
        <label htmlFor="deal-search" className="field-label">ابحث في العروض</label>
        <div className="relative">
          <Search size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="deal-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="اكتب اسم المنتج"
            className="field pr-11"
          />
        </div>
      </div>

      {categoriesWithDeals.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {[{ id: null, name: 'كل العروض' }, ...categoriesWithDeals].map(category => (
            <button
              key={category.id ?? 'all'}
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
              className="chip"
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {deals.length === 0 ? (
        <p className="notice notice-info text-center">لا توجد عروض مطابقة.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-3">
          {deals.map(item => (
            <DealCard key={item.id} item={item} restaurantId={restaurant.id} canOrder={canOrder} />
          ))}
        </div>
      )}
    </div>
  )
}
