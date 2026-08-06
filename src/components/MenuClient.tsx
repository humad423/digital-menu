'use client'

import { useState, useRef, useEffect } from 'react'
import MenuItem from '@/components/MenuItem'
import { Search, X } from 'lucide-react'

export default function MenuClient({
  restaurantId,
  restaurantName = 'المطعم',
  storeType = 'restaurant',
  restaurant,
  categories,
  menuItems,
  ads,
  offers = []
}: {
  restaurantId: string
  restaurantName?: string
  storeType?: string
  restaurant?: any
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
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' })
  }

  const filteredCats = categories.map(cat => ({
    ...cat,
    items: menuItems.filter(i =>
      i.category_id === cat.id &&
      (i.name.includes(searchQuery) || (i.description && i.description.includes(searchQuery)))
    )
  })).filter(c => c.items.length > 0)

  // Merge special offers into categories if exists
  const displayCats = offers.length > 0 && !searchQuery
    ? [{
        id: 'offers-special',
        name: 'العروض والتخفيضات',
        icon: '🔥',
        items: offers.map(o => {
          let offerImages: string[] = []

          // 1. Check custom offer images
          if (Array.isArray(o.images)) {
            offerImages = o.images.filter(Boolean)
          } else if (typeof o.images === 'string') {
            try {
              const parsed = JSON.parse(o.images)
              if (Array.isArray(parsed)) offerImages = parsed.filter(Boolean)
            } catch (e) {}
          }

          if (offerImages.length === 0 && o.image_url) {
            offerImages = [o.image_url]
          }

          // 2. Collect images from primary_item, bonus_item, item3, item4
          const collectItemImgs = (itemObj: any) => {
            if (!itemObj) return
            let imgs: string[] = []
            if (Array.isArray(itemObj.images)) {
              imgs = itemObj.images.filter(Boolean)
            } else if (typeof itemObj.images === 'string') {
              try {
                const parsed = JSON.parse(itemObj.images)
                if (Array.isArray(parsed)) imgs = parsed.filter(Boolean)
              } catch (e) {}
            }
            if (imgs.length === 0 && itemObj.image_url) {
              imgs = [itemObj.image_url]
            }
            imgs.forEach(imgUrl => {
              if (!offerImages.includes(imgUrl)) offerImages.push(imgUrl)
            })
          }

          collectItemImgs(o.primary_item)
          collectItemImgs(o.bonus_item)
          collectItemImgs(o.item3)
          collectItemImgs(o.item4)

          return {
            id: o.id,
            name: o.title,
            description: o.description,
            price: o.offer_price,
            original_price: o.original_price,
            image_url: offerImages[0] || o.image_url || o.primary_item?.image_url,
            images: offerImages,
            primary_image_url: o.primary_item?.image_url,
            bonus_image_url: o.bonus_item?.image_url,
            min_quantity: o.min_quantity,
            bonus_quantity: o.bonus_quantity,
            is_offer: true
          }
        })
      }, ...filteredCats]
    : filteredCats

  return (
    <div className="pb-24">

      {/* ── Search Bar ── */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md py-2.5 border-b border-slate-200/80 shadow-2xs">
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            placeholder={
              storeType === 'supermarket'
                ? 'ابحث في منتجات وعروض السوبرماركت...'
                : storeType === 'clothing'
                ? 'ابحث في تشكيلة الموديلات والألبسة...'
                : 'ابحث في المنتجات والكتالوج...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 pr-10 pl-9 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 shadow-2xs transition"
          />
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Pill Tabs ── */}
      {!searchQuery && categories.length > 1 && (
        <div className="sticky top-[54px] z-20 bg-slate-50/95 backdrop-blur-md py-2 border-b border-slate-200/60 flex gap-2 overflow-x-auto hide-scrollbar">
          {displayCats.map(cat => {
            const isActive = activeCat === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cat.id === 'offers-special' ? '🔥' : (cat.icon || '🍽️')}</span>
                <span>{cat.name}</span>
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
            <section key={cat.id} id={`cat-sec-${cat.id}`} className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{cat.id === 'offers-special' ? '🔥' : (cat.icon || (storeType === 'clothing' ? '👗' : storeType === 'supermarket' ? '🛒' : '🍽️'))}</span>
                <h2 className="text-base font-black text-slate-900 flex-1 truncate">
                  {cat.id === 'offers-special' ? 'العروض والتخفيضات' : cat.name}
                </h2>
                <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {cat.items.length}
                </span>
              </div>

              {/* Always single column - mobile-first experience */}
              <div className="grid grid-cols-1 gap-3.5">
                {cat.items.map((item: any) => (
                  <MenuItem key={item.id} item={item} restaurantId={restaurantId} storeType={storeType} hasDelivery={restaurant?.has_delivery !== false} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

    </div>
  )
}
