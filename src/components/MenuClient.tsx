'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import MenuItem from '@/components/MenuItem'
import { trackEvent, usePageDurationTracker } from '@/utils/analytics'
import { offerToMenuItem } from '@/utils/offerItems'
import { matchesSearch } from '@/utils/text'

const OFFERS_SECTION_ID = 'offers-special'

export default function MenuClient({
  restaurantId,
  storeType = 'restaurant',
  restaurant,
  categories,
  menuItems,
  offers = [],
}: {
  restaurantId: string
  restaurantName?: string
  storeType?: string
  restaurant?: any
  categories: any[]
  menuItems: any[]
  offers?: any[]
}) {
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (restaurantId) trackEvent({ event_type: 'menu_view', store_id: restaurantId })
  }, [restaurantId])

  usePageDurationTracker({ store_id: restaurantId, store_slug: restaurant?.slug })

  const sections = useMemo(() => {
    const query = searchQuery.trim()
    const productSections = [...categories]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(category => ({
        id: category.id,
        name: category.name,
        items: menuItems.filter(item => item.category_id === category.id && matchesSearch(query, item.name, item.description)),
      }))
      .filter(section => section.items.length > 0)

    return offers.length > 0 && !query
      ? [{ id: OFFERS_SECTION_ID, name: 'العروض', items: offers.map(offerToMenuItem) }, ...productSections]
      : productSections
  }, [categories, menuItems, offers, searchQuery])

  const goToSection = (id: string) => {
    document.getElementById(`section-${id}`)?.scrollIntoView()
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="product-search" className="field-label">ابحث عن منتج</label>
        <div className="relative">
          <Search size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            id="product-search"
            type="search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            placeholder={storeType === 'clothing' ? 'مثال: قميص' : 'اكتب اسم المنتج'}
            className="field pr-11"
          />
        </div>
      </div>

      {/* Stays visible while scrolling, so any section is one tap away */}
      {!searchQuery && sections.length > 1 && (
        <nav aria-label="أقسام المتجر" className="sticky top-0 z-20 bg-page py-2 -mx-4 px-4 flex gap-2 overflow-x-auto hide-scrollbar">
          {sections.map(section => (
            <button key={section.id} onClick={() => goToSection(section.id)} className="chip">
              {section.name}
            </button>
          ))}
        </nav>
      )}

      {sections.length === 0 ? (
        <p className="notice notice-info text-center">لا توجد منتجات مطابقة.</p>
      ) : (
        sections.map(section => (
          <section key={section.id} id={`section-${section.id}`} className="space-y-3 scroll-mt-16">
            <h2 className="section-title">{section.name}</h2>
            <div className="space-y-3">
              {section.items.map((item: any) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  restaurantId={restaurantId}
                  canOrder={restaurant?.enable_whatsapp_orders !== false}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
