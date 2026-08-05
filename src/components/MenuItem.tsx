'use client'

import { useCartStore } from '@/store/cartStore'
import { CldImage } from 'next-cloudinary'
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

  // Get quantity of this item in cart (only if same restaurant)
  const quantity = cartRestaurantId === restaurantId
    ? (cartItems.find(i => i.id === item.id)?.quantity ?? 0)
    : 0

  return (
    <div
      className="bg-white rounded-2xl flex gap-3 overflow-hidden border border-gray-100 transition-all duration-200 hover:shadow-md active:scale-[0.99] relative"
      style={{ boxShadow: '0 1px 8px rgba(26,26,46,0.06)' }}
    >
      {/* Image */}
      {(item.image_url || item.primary_image_url) && (
        <div className="w-28 h-28 shrink-0 relative bg-gray-100 overflow-hidden">
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
            />
          )}
          {item.is_offer && (
            <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-600 to-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-10">
              {item.offer_title || '🔥 عرض خاص'}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between py-3.5 pl-3.5 pr-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-base leading-snug" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
              {item.name}
            </h3>
            {item.is_offer && !item.image_url && (
              <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                🔥 {item.offer_title || 'عرض خاصة'}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2 font-medium">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>
              {item.price}
            </span>
            <span className="text-xs text-gray-400 font-medium">₺</span>
            {item.is_offer && item.original_price && (
              <span className="text-xs text-gray-400 line-through font-bold">
                {item.original_price} ₺
              </span>
            )}
          </div>

          {/* Quantity Control */}
          {quantity === 0 ? (
            // Add button
            <button
              onClick={() => addItem(item, restaurantId)}
              className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-sm active:scale-95 transition-all duration-150"
              style={{ background: 'var(--color-primary)' }}
            >
              <Plus size={19} strokeWidth={2.5} />
            </button>
          ) : (
            // Quantity control with animation
            <div
              className="flex items-center gap-1.5 rounded-2xl px-1 py-1"
              style={{ background: 'var(--color-primary)' }}
            >
              <button
                onClick={() => updateQuantity(item.id, quantity - 1)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-90 transition-all"
              >
                <Minus size={14} strokeWidth={2.5} />
              </button>

              <span className="text-white font-black text-sm min-w-[18px] text-center">
                {quantity}
              </span>

              <button
                onClick={() => addItem(item, restaurantId)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center active:scale-90 transition-all"
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
