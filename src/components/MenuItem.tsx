'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Plus, Minus } from 'lucide-react'
import { Database } from '@/types/database.types'
import SmartOfferImage from '@/components/SmartOfferImage'

type Item = Database['public']['Tables']['menu_items']['Row'] & {
  primary_image_url?: string
  bonus_image_url?: string
  min_quantity?: number
  bonus_quantity?: number
  offer_title?: string
}

export default function MenuItem({ item, restaurantId }: { item: Item, restaurantId: string }) {
  const addItem = useCartStore(state => state.addItem)
  const updateQuantity = useCartStore(state => state.updateQuantity)
  const cartItems = useCartStore(state => state.items)
  const cartRestaurantId = useCartStore(state => state.restaurantId)
  const [added, setAdded] = useState(false)

  const quantity = cartRestaurantId === restaurantId
    ? (cartItems.find(i => i.id === item.id)?.quantity ?? 0)
    : 0

  const handleAdd = () => {
    addItem(item, restaurantId)
    setAdded(true)
    setTimeout(() => setAdded(false), 400)
  }

  const hasImage = !!(item.image_url || item.primary_image_url)
  const isSpecialOffer = item.is_offer

  return (
    <div className="menu-item-card">
      {/* Offer Badge */}
      {isSpecialOffer && (
        <div className="offer-badge">
          {item.offer_title || '🔥 عرض خاص'}
        </div>
      )}

      {/* Image */}
      {hasImage && (
        <div className="relative shrink-0" style={{ width: 110, height: 110, background: '#F8FAFC' }}>
          {item.primary_image_url || item.bonus_image_url ? (
            <SmartOfferImage
              primaryImage={item.primary_image_url}
              bonusImage={item.bonus_image_url}
              customImage={item.image_url}
              minQuantity={item.min_quantity || 1}
              bonusQuantity={item.bonus_quantity || 1}
              className="w-full h-full"
            />
          ) : (
            <img
              src={item.image_url!}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
          {/* Image shimmer overlay if offer */}
          {isSpecialOffer && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between p-3.5 min-w-0">
        <div>
          <h3
            className="font-black text-[15px] leading-snug truncate"
            style={{ color: 'var(--brand-secondary, #1A1A2E)' }}
          >
            {item.name}
          </h3>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2 font-medium">
              {item.description}
            </p>
          )}
        </div>

        {/* Price + Qty */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {/* Price */}
          <div className="price-badge">
            <span className="text-lg">{item.price}</span>
            <span className="currency">₺</span>
            {isSpecialOffer && item.original_price && (
              <span className="original">{item.original_price} ₺</span>
            )}
          </div>

          {/* Add / Qty Control */}
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              className={`add-btn ${added ? 'qty-pop' : ''}`}
              aria-label="أضف للسلة"
            >
              <Plus size={18} strokeWidth={2.8} />
            </button>
          ) : (
            <div className="qty-control">
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="qty-btn"
                aria-label="تقليل"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="text-white font-black text-sm min-w-[18px] text-center tabular-nums">
                {quantity}
              </span>
              <button
                onClick={handleAdd}
                className="qty-btn"
                aria-label="زيادة"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
