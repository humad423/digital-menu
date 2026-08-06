'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Plus, Minus, ChevronLeft, ChevronRight, X, Layers } from 'lucide-react'
import { Database } from '@/types/database.types'
import SmartOfferImage from '@/components/SmartOfferImage'

type Item = Database['public']['Tables']['menu_items']['Row'] & {
  primary_image_url?: string
  bonus_image_url?: string
  min_quantity?: number
  bonus_quantity?: number
  offer_title?: string
  images?: any
}

export default function MenuItem({
  item,
  restaurantId,
  storeType = 'restaurant',
  hasDelivery = true
}: {
  item: Item
  restaurantId: string
  storeType?: string
  hasDelivery?: boolean
}) {
  const addItem       = useCartStore(s => s.addItem)
  const updateQty     = useCartStore(s => s.updateQuantity)
  const cartItems     = useCartStore(s => s.items)
  const cartRestId    = useCartStore(s => s.restaurantId)
  const [popped, setPopped] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  // Parse multi-images
  let imageList: string[] = []
  if (Array.isArray(item.images)) {
    imageList = item.images.filter(Boolean)
  } else if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images)
      if (Array.isArray(parsed)) imageList = parsed.filter(Boolean)
    } catch (e) {}
  }
  if (imageList.length === 0 && item.image_url) {
    imageList = [item.image_url]
  }

  // Parse sizes
  let sizesList: string[] = []
  if (Array.isArray(item.sizes)) sizesList = item.sizes.filter(Boolean)
  else if (typeof item.sizes === 'string') {
    try {
      const parsed = JSON.parse(item.sizes)
      if (Array.isArray(parsed)) sizesList = parsed.filter(Boolean)
    } catch (e) {}
  }
  const [selectedSize, setSelectedSize] = useState<string>(sizesList[0] || '')

  const qty = cartRestId === restaurantId ? (cartItems.find(i => i.id === item.id)?.quantity ?? 0) : 0
  const hasImage = imageList.length > 0 || !!item.primary_image_url
  const isOffer  = !!item.is_offer || storeType === 'supermarket'

  const discountPercent = item.original_price && item.original_price > item.price
    ? Math.round(((item.original_price - item.price) / item.original_price) * 100)
    : null

  const handleAdd = () => {
    addItem(item, restaurantId)
    setPopped(true)
    setTimeout(() => setPopped(false), 250)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 flex gap-3 shadow-xs hover:shadow-md transition-all relative">
        {/* Image */}
        {hasImage && (
          <div
            onClick={() => imageList.length > 1 && setShowGallery(true)}
            className={`w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative ${
              imageList.length > 1 ? 'cursor-pointer group' : ''
            }`}
          >
            {item.primary_image_url || item.bonus_image_url ? (
              <SmartOfferImage
                primaryImage={item.primary_image_url}
                bonusImage={item.bonus_image_url}
                customImage={imageList[0] || item.image_url}
                minQuantity={item.min_quantity || 1}
                bonusQuantity={item.bonus_quantity || 1}
                className="w-full h-full"
              />
            ) : (
              <img src={imageList[0] || item.image_url!} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
            )}

            {/* Discount Badge for Supermarket */}
            {discountPercent ? (
              <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                خصم %{discountPercent}
              </div>
            ) : isOffer ? (
              <div className="absolute top-1.5 right-1.5 bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
                {item.offer_title || '🔥 عرض'}
              </div>
            ) : null}

            {/* Multi-Image Badge for Clothing / Fashion */}
            {imageList.length > 1 && (
              <div className="absolute bottom-1.5 right-1.5 bg-slate-900/85 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Layers size={10} className="text-orange-400" />
                <span>{imageList.length} صور</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-black text-sm text-slate-900 truncate">{item.name}</h3>
              {imageList.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowGallery(true)}
                  className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 shrink-0"
                >
                  معرض الصور 📸
                </button>
              )}
            </div>

            {item.description && (
              <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Display Available Sizes */}
            {sizesList.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold">القياسات:</span>
                {sizesList.map((sz, i) => (
                  <span key={i} className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                    {sz}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3">
            {/* Price */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base font-black text-orange-600">
                {item.price} ₺
              </span>
              {item.original_price && item.original_price > item.price && (
                <span className="text-xs font-bold text-slate-400 line-through">
                  {item.original_price} ₺
                </span>
              )}
            </div>

            {/* Add / Qty Buttons OR Pickup Badge */}
            {hasDelivery === false ? (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/60">
                🏪 استلام فقط
              </span>
            ) : qty === 0 ? (
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

      {/* Multi-Image Gallery Lightbox Modal */}
      {showGallery && imageList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h4 className="font-black text-white text-sm">{item.name}</h4>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  صورة {galleryIndex + 1} من {imageList.length}
                </p>
              </div>
              <button
                onClick={() => setShowGallery(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Main Image Slider */}
            <div className="relative h-72 sm:h-96 w-full bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={imageList[galleryIndex]}
                alt=""
                className="w-full h-full object-contain"
              />

              {imageList.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIndex(prev => (prev > 0 ? prev - 1 : imageList.length - 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-sm transition"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={() => setGalleryIndex(prev => (prev < imageList.length - 1 ? prev + 1 : 0))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center backdrop-blur-sm transition"
                  >
                    <ChevronLeft size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 overflow-x-auto justify-center">
              {imageList.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setGalleryIndex(idx)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                    galleryIndex === idx ? 'border-orange-500 scale-105' : 'border-slate-700 opacity-60'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Modal Footer / Action */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-400 font-bold block">السعر</span>
                <span className="text-lg font-black text-orange-500">{item.price} ₺</span>
              </div>
              <button
                onClick={() => {
                  handleAdd()
                  setShowGallery(false)
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-md"
              >
                <Plus size={16} /> إضافة للسلة
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
