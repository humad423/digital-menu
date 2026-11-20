'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, Search } from 'lucide-react'
import { confirmCartStoreSwitch, useCartStore } from '@/store/cartStore'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { matchesSearch } from '@/utils/text'
import { offerToMenuItem } from '@/utils/offerItems'
import { trackEvent, trackGAAddToCart, usePageDurationTracker } from '@/utils/analytics'
import { CURRENCY_SYMBOL } from '@/config/site'
import { useDeals } from '@/components/PromotionsContext'

/** What a product sells for now, and before, when it's on offer. */
interface Price { price: number; was: number | null; percent: number | null; ends: string | null }

function DealCard({ item, deal, restaurantId, canOrder }: { item: any; deal: Price; restaurantId: string; canOrder: boolean }) {
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const quantity = useCartStore(s =>
    s.restaurantId === restaurantId ? s.items.find(i => i.id === item.id)?.quantity ?? 0 : 0
  )
  const discount = deal.percent
  const isKilo = item.unit === 'kg' || item.allow_custom_amount === true
  const isOutOfStock = item.is_available === false

  const add = () => {
    if (!confirmCartStoreSwitch(restaurantId)) return
    addItem({ id: item.id, name: item.name, price: deal.price, ...(deal.was ? { was: deal.was } : {}) }, restaurantId)
    trackGAAddToCart(item.name, deal.price)
  }

  return (
    <article className={`card flex flex-col ${isOutOfStock ? 'opacity-70' : ''}`}>
      {/* The photo fills a square, so a tall photo can't stretch its card and every row lines up */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {item.image_url && (
          <img src={getOptimizedImageUrl(item.image_url, 400)} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {discount !== null && (
          <span className="absolute top-2 right-2 bg-red-700 text-white font-black px-2 py-0.5 rounded-lg">خصم {discount}%</span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="font-black leading-snug">{item.name}</h3>
        {item.description && <p className="text-sm text-muted font-medium leading-snug line-clamp-2">{item.description}</p>}
        <div className="mt-auto">
          {discount !== null && (
            <p className="text-muted font-medium line-through">كان {deal.was} {CURRENCY_SYMBOL}</p>
          )}
          <p className="text-xl font-black text-brand leading-snug">
            {deal.price} {CURRENCY_SYMBOL}
            {isKilo && <span className="text-base text-muted font-medium"> للكيلو</span>}
          </p>
          {deal.ends && <p className="text-sm text-muted font-medium">{deal.ends}</p>}
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

  // A bundle carries its own price before; a product's comes from an offer running now
  const dealFor = useDeals()
  const priceOf = (item: any): Price => {
    const price = Number(item.price)
    if (item.is_offer) {
      const was = Number(item.original_price) > price ? Number(item.original_price) : null
      return { price, was, percent: was ? Math.round(((was - price) / was) * 100) : null, ends: null }
    }
    const deal = dealFor(item, '', price)
    return deal ? { price: deal.price, was: deal.was, percent: deal.percent, ends: deal.ends } : { price, was: null, percent: null, ends: null }
  }

  const deals = useMemo(() => {
    // Biggest discounts first, because that is what a flyer leads with
    const bundles = activeCategory ? [] : offers.map(offerToMenuItem)
    const items = activeCategory ? menuItems.filter(i => i.category_id === activeCategory) : menuItems
    return [...bundles, ...items]
      .filter(item => matchesSearch(query, item.name, item.description))
      .sort((a, b) => (priceOf(b).percent ?? 0) - (priceOf(a).percent ?? 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, menuItems, offers, query, dealFor])

  const categoriesWithDeals = categories.filter(c => menuItems.some(i => i.category_id === c.id))
  const canOrder = restaurant.enable_whatsapp_orders !== false
  // A shop with no discounts, like one selling home-made food, is a product list, not a flyer
  const hasDeals = offers.length > 0 || menuItems.some(item => priceOf(item).percent !== null)
  const word = hasDeals ? 'العروض' : 'المنتجات'
  // With nothing searched or picked, a plain product list reads best category by category, in the shop's own order
  const sections = !hasDeals && !query && !activeCategory && categoriesWithDeals.length > 1
    ? categoriesWithDeals.map(category => ({ category, items: deals.filter(item => item.category_id === category.id) }))
    : null

  const grid = (items: any[]) => (
    // Two in a row on any phone, even with the phone's text made larger, and more on wider screens
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
      {items.map(item => (
        <DealCard key={item.id} item={item} deal={priceOf(item)} restaurantId={restaurant.id} canOrder={canOrder} />
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <h2 className="section-title">{hasDeals ? 'عروض' : 'منتجات'} {restaurant.name}</h2>

      <div>
        <label htmlFor="deal-search" className="field-label">ابحث في {word}</label>
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
          {[{ id: null, name: hasDeals ? 'كل العروض' : 'الكل' }, ...categoriesWithDeals].map(category => (
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
        <p className="notice notice-info text-center">لا توجد نتائج مطابقة.</p>
      ) : sections ? (
        sections.filter(section => section.items.length).map(({ category, items }) => (
          <section key={category.id} className="space-y-3 pt-2">
            <h3 className="text-lg font-black">{category.name}</h3>
            {grid(items)}
          </section>
        ))
      ) : (
        grid(deals)
      )}
    </div>
  )
}
