'use client'

import { useState, useRef, useEffect } from 'react'
import MenuItem from '@/components/MenuItem'
import RestaurantRating from '@/components/RestaurantRating'
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

  useEffect(() => {
    observer.current = new IntersectionObserver((entries) => {
      const visible = entries.find(entry => entry.isIntersecting)
      if (visible) setActiveCat(visible.target.id.replace('category-', ''))
    }, { rootMargin: '-100px 0px -60% 0px' })

    const sections = document.querySelectorAll('section[id^="category-"]')
    sections.forEach(section => observer.current?.observe(section))

    return () => observer.current?.disconnect()
  }, [categories])

  const scrollToCategory = (id: string) => {
    setActiveCat(id)
    const el = document.getElementById(`category-${id}`)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 65
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
    <div className="space-y-4 pb-6">

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="ابحث عن وجبة..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 px-11 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-base font-medium"
          style={{ '--tw-ring-color': 'var(--color-primary)', '--tw-ring-opacity': '0.3' } as any}
        />
        <Search className="absolute right-3.5 top-3.5 text-gray-400" size={20} />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute left-3.5 top-3.5 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {!searchQuery && (
        <div
          className="sticky top-0 z-20 -mx-4 px-4 pt-2 pb-3 flex gap-2 overflow-x-auto hide-scrollbar border-b border-gray-100"
          style={{ background: 'var(--background)', backdropFilter: 'blur(12px)' }}
        >
          {displayCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              className="shrink-0 px-4 py-2 rounded-2xl text-sm font-black transition-all duration-200 border whitespace-nowrap flex items-center gap-1.5"
              style={
                activeCat === cat.id
                  ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)', boxShadow: '0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent)' }
                  : cat.id === 'offers-special'
                  ? { background: '#FFF7ED', color: '#EA580C', borderColor: '#FFEDD5' }
                  : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }
              }
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Menu Sections */}
      <div className="space-y-8">
        {displayCategories.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-bold text-gray-600">لا توجد نتائج</p>
            <p className="text-sm">جرّب كلمة بحث مختلفة</p>
          </div>
        ) : (
          displayCategories.map(category => (
            <section key={category.id} id={`category-${category.id}`} className="scroll-mt-[65px]">
              <h2 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                {category.name}
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
