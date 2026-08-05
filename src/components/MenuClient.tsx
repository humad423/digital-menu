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
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' })
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
    <div style={{ paddingBottom: 32 }} dir="rtl">

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          ref={searchRef}
          type="text"
          placeholder={`ابحث في منيو ${restaurantName}...`}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="menu-search-input"
          style={{ paddingRight: 44, paddingLeft: searchQuery ? 44 : 16 }}
        />
        <Search size={17} style={{ position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}
          >
            <X size={17} />
          </button>
        )}
      </div>

      {/* ── Category Tabs ── */}
      {!searchQuery && displayCats.length > 1 && (
        <div className="menu-tabs-bar">
          {displayCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => scrollTo(cat.id)}
              className={`menu-tab${activeCat === cat.id ? ' active' : ''}${cat.id === 'offers-special' && activeCat !== cat.id ? ' offer-tab' : ''}`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.id === 'offers-special' ? 'العروض' : cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 20 }}>
        {displayCats.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 900, color: '#1E293B', fontSize: 16 }}>لا توجد نتائج</p>
            <p style={{ color: '#94A3B8', fontSize: 13, fontWeight: 600, marginTop: 6 }}>جرّب كلمة بحث مختلفة</p>
          </div>
        ) : (
          displayCats.map(cat => (
            <section key={cat.id} id={`cat-sec-${cat.id}`} style={{ scrollMarginTop: 72 }}>
              <div className="menu-section-h">
                <span>{cat.id === 'offers-special' ? '🔥' : (cat.icon || '🍽️')}</span>
                <span style={{ flex: 1 }}>{cat.id === 'offers-special' ? 'العروض والبكجات' : cat.name}</span>
                <span className="count">{cat.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
