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
  const [activeCat, setActiveCat] = useState(categories[0]?.id)
  const observer = useRef<IntersectionObserver | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      const visible = entries.find(entry => entry.isIntersecting)
      if (visible) setActiveCat(visible.target.id.replace('category-', ''))
    }, { rootMargin: '-90px 0px -55% 0px' })

    const sections = document.querySelectorAll('section[id^="category-"]')
    sections.forEach(section => observer.current?.observe(section))

    return () => observer.current?.disconnect()
  }, [categories])

  const scrollToCategory = (id: string) => {
    setActiveCat(id)
    const el = document.getElementById(`category-${id}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70
      window.scrollTo({ top: y, behavior: 'smooth' })
    }
  }

  const filteredCategories = categories.map(cat => {
    const items = menuItems.filter(i =>
      i.category_id === cat.id &&
      (i.name.includes(searchQuery) || (i.description && i.description.includes(searchQuery)))
    )
    return { ...cat, items }
  }).filter(cat => cat.items.length > 0)

  // Map dedicated offers to MenuItem format
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
      offer_title: o.min_quantity > 1 ? `🔥 عرض ${o.min_quantity}X` : o.bonus_item ? '🎁 مع هدية' : '🏷️ خصم',
      category_id: 'offers-special'
    }))

  const displayCategories = [
    ...(formattedOffers.length > 0 ? [{ id: 'offers-special', name: '🔥 العروض والبكجات', items: formattedOffers }] : []),
    ...filteredCategories
  ]

  return (
    <div className="pb-6" dir="rtl">

      {/* ── Search Bar ── */}
      <div className="relative mb-1">
        <input
          ref={searchRef}
          type="text"
          placeholder={`ابحث في منيو ${restaurantName}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="menu-search"
          style={{ paddingRight: '44px', paddingLeft: searchQuery ? '44px' : '16px' }}
        />
        <Search className="absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} style={{ right: 14 }} />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
            className="absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            style={{ left: 14 }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Category Tabs ── */}
      {!searchQuery && displayCategories.length > 1 && (
        <div className="menu-cat-tabs -mx-4 px-4">
          {displayCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className={`menu-cat-tab ${activeCat === cat.id ? 'active' : ''} ${cat.id === 'offers-special' && activeCat !== cat.id ? 'offer-tab' : ''}`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Menu Sections ── */}
      <div className="space-y-8 mt-5">
        {displayCategories.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-black text-gray-700 text-lg">لا توجد نتائج</p>
            <p className="text-sm text-gray-400 mt-1 font-medium">جرّب كلمة بحث مختلفة</p>
          </div>
        ) : (
          displayCategories.map(category => (
            <section key={category.id} id={`category-${category.id}`} className="scroll-mt-[70px]">
              <h2 className="menu-section-header">
                {category.id === 'offers-special' && (
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-base">🔥</span>
                )}
                <span className="truncate">{category.id === 'offers-special' ? 'العروض والبكجات' : category.name}</span>
                <span
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.06)', color: '#6B7280' }}
                >
                  {category.items.length}
                </span>
              </h2>
              <div className="space-y-3">
                {category.items.map((item: any) => (
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
