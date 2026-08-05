'use client'

import { useState, useRef, useEffect } from 'react'
import MenuItem from '@/components/MenuItem'
import { Search, X } from 'lucide-react'

export default function MenuClient({
  restaurantId,
  restaurantName = 'المطعم',
  categories,
  menuItems,
  ads,
  offers = []
}: {
  restaurantId: string
  restaurantName?: string
  categories: any[]
  menuItems: any[]
  ads: any[]
  offers?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCat, setActiveCat]     = useState(categories[0]?.id)
  const observer = useRef<IntersectionObserver | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    observer.current = new IntersectionObserver(entries => {
      const visible = entries.find(e => e.isIntersecting)
      if (visible) setActiveCat(visible.target.id.replace('cat-sec-', ''))
    }, { rootMargin: '-80px 0px -55% 0px' })

    const secs = document.querySelectorAll('section[id^="cat-sec-"]')
    secs.forEach(s => observer.current?.observe(s))
    return () => observer.current?.disconnect()
  }, [categories])

  const scrollTo = (id: string) => {
    setActiveCat(id)
    const el = document.getElementById(`cat-sec-${id}`)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 75, behavior: 'smooth' })
  }

  const filteredCats = categories.map(cat => ({
    ...cat,
    items: menuItems.filter(i =>
      i.category_id === cat.id &&
      (i.name.includes(searchQuery) || (i.description && i.description.includes(searchQuery)))
    )
  })).filter(c => c.items.length > 0)

  const formattedOffers = (offers || [])
    .filter(o => o.title.includes(searchQuery) || (o.description && o.description.includes(searchQuery)))
    .map(o => ({
      id: `offer-${o.id}`,
      name: o.title,
      description: o.description,
      price: o.offer_price,
      original_price: o.original_price,
      image_url: o.image_url || o.primary_item?.image_url,
      primary_image_url: o.primary_item?.image_url,
      bonus_image_url: o.bonus_item?.image_url,
      min_quantity: o.min_quantity,
      bonus_quantity: o.bonus_quantity,
      is_offer: true,
      offer_title: o.min_quantity > 1 ? `🔥 ${o.min_quantity}X` : o.bonus_item ? '🎁 هدية' : '🏷️ خصم',
      category_id: 'offers-special'
    }))

  const displayCats = [
    ...(formattedOffers.length > 0 ? [{ id: 'offers-special', name: '🔥 العروض والبكجات', icon: null, items: formattedOffers }] : []),
    ...filteredCats
  ]

  return (
    <div className="pb-8" dir="rtl">

      {/* ── Search Input ── */}
      <div className="relative mb-3">
        <input
          ref={searchRef}
          type="text"
          placeholder={`ابحث في منيو ${restaurantName}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200/80 rounded-2xl py-2.5 pr-10 pl-9 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition shadow-xs"
        />
        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Category Sticky Bar ── */}
      {!searchQuery && displayCats.length > 1 && (
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 -mx-4 px-4 border-b border-slate-200/60 flex gap-2 overflow-x-auto hide-scrollbar">
          {displayCats.map(cat => {
            const isActive = activeCat === cat.id
            const isOfferTab = cat.id === 'offers-special'
            return (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border ${
                  isActive
                    ? 'text-white border-transparent shadow-sm'
                    : isOfferTab
                    ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                    : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-100'
                }`}
                style={isActive ? { background: 'var(--color-primary, #F97316)', borderColor: 'var(--color-primary, #F97316)' } : {}}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{isOfferTab ? '🔥 العروض' : cat.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Menu Sections ── */}
      <div className="mt-5 space-y-7">
        {displayCats.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-black text-slate-800 text-sm mb-1">لا توجد نتائج</p>
            <p className="text-xs text-slate-400 font-bold">جرّب كلمة بحث مختلفة</p>
          </div>
        ) : (
          displayCats.map(cat => (
            <section key={cat.id} id={`cat-sec-${cat.id}`} className="scroll-mt-20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.id === 'offers-special' ? '🔥' : (cat.icon || '🍽️')}</span>
                <h2 className="text-base font-black text-slate-900 flex-1 truncate">
                  {cat.id === 'offers-special' ? 'العروض والبكجات' : cat.name}
                </h2>
                <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {cat.items.length}
                </span>
              </div>

              <div className="space-y-3">
                {cat.items.map((item: any) => (
                  <MenuItem key={item.id} item={item} restaurantId={restaurantId} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

    </div>
  )
}
