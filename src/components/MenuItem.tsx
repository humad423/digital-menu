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
  const addItem       = useCartStore(s => s.addItem)
  const updateQty     = useCartStore(s => s.updateQuantity)
  const cartItems     = useCartStore(s => s.items)
  const cartRestId    = useCartStore(s => s.restaurantId)
  const [popped, setPopped] = useState(false)

  const qty = cartRestId === restaurantId ? (cartItems.find(i => i.id === item.id)?.quantity ?? 0) : 0
  const hasImage = !!(item.image_url || item.primary_image_url)
  const isOffer  = !!item.is_offer

  const handleAdd = () => {
    addItem(item, restaurantId)
    setPopped(true)
    setTimeout(() => setPopped(false), 250)
  }

  return (
    <div className="food-card">
      {/* Image */}
      {hasImage && (
        <div className="food-card-img" style={{ minHeight: 110 }}>
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
            <img src={item.image_url!} alt={item.name} loading="lazy" draggable={false} />
          )}
          {isOffer && (
            <div className="food-offer-badge">{item.offer_title || '🔥 عرض'}</div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="food-card-body">
        <div>
          <h3 className="food-name">{item.name}</h3>
          {item.description && (
            <p className="food-desc">{item.description}</p>
          )}
        </div>

        <div className="food-footer">
          {/* Price */}
          <div className="food-price">
            <span className="amount">{item.price}</span>
            <span className="currency">₺</span>
            {isOffer && item.original_price && (
              <span className="original">{item.original_price} ₺</span>
            )}
          </div>

          {/* Add / Qty */}
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className={`add-to-cart${popped ? ' popped' : ''}`}
              aria-label="أضف للسلة"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          ) : (
            <div className="qty-stepper">
              <button onClick={() => updateQty(item.id, qty - 1)} className="qty-step-btn" aria-label="تقليل">
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="qty-count">{qty}</span>
              <button onClick={handleAdd} className="qty-step-btn" aria-label="زيادة">
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
