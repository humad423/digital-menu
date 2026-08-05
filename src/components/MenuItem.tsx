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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-3 flex gap-3 shadow-xs hover:shadow-md transition-all">
      {/* Image */}
      {hasImage && (
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative">
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
            <img src={item.image_url!} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
          )}
          {isOffer && (
            <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
              {item.offer_title || '🔥 عرض'}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-black text-sm text-slate-900 truncate">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black" style={{ color: 'var(--color-primary, #F97316)' }}>
              {item.price}
            </span>
            <span className="text-xs font-bold text-slate-400">₺</span>
            {isOffer && item.original_price && (
              <span className="text-xs font-bold text-slate-400 line-through mr-1">
                {item.original_price} ₺
              </span>
            )}
          </div>

          {/* Add / Qty Buttons */}
          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className={`w-9 h-9 rounded-full text-white flex items-center justify-center shadow-sm transition active:scale-90 ${
                popped ? 'scale-110' : ''
              }`}
              style={{ background: 'var(--color-primary, #F97316)' }}
              aria-label="أضف للسلة"
            >
              <Plus size={18} strokeWidth={2.8} />
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full text-white"
              style={{ background: 'var(--color-primary, #F97316)' }}
            >
              <button
                onClick={() => updateQty(item.id, qty - 1)}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="font-black text-xs min-w-[16px] text-center">{qty}</span>
              <button
                onClick={handleAdd}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
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
