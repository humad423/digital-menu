'use client'

import { useState, useMemo } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Plus, Minus, ChevronLeft, ChevronRight, X, Layers, Scale, DollarSign, ShoppingBag } from 'lucide-react'
import { Database } from '@/types/database.types'
import SmartOfferImage from '@/components/SmartOfferImage'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { trackGAAddToCart } from '@/utils/analytics'

type Item = Database['public']['Tables']['menu_items']['Row'] & {
  primary_image_url?: string
  bonus_image_url?: string
  min_quantity?: number
  bonus_quantity?: number
  offer_title?: string
  images?: any
  unit?: string
  allow_custom_amount?: boolean
}

export default function MenuItem({
  item,
  restaurantId,
  storeType = 'restaurant',
  hasDelivery = true,
  enableWhatsappOrders = true
}: {
  item: Item
  restaurantId: string
  storeType?: string
  hasDelivery?: boolean
  enableWhatsappOrders?: boolean
}) {
  const addItem       = useCartStore(s => s.addItem)
  const updateQty     = useCartStore(s => s.updateQuantity)
  const cartItems     = useCartStore(s => s.items)
  const cartRestId    = useCartStore(s => s.restaurantId)
  const [popped, setPopped] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  // ── Kilo / Custom Weight State ─────────────────────────────────
  const isKiloItem = item.unit === 'kg' || item.allow_custom_amount === true
  const pricePerKg = Number(item.price) || 1
  const [showKiloModal, setShowKiloModal] = useState(false)
  const [kiloMode, setKiloMode] = useState<'amount' | 'weight'>('amount')
  const [customPriceInput, setCustomPriceInput] = useState<string>(() => Math.round(pricePerKg * 0.5).toString())
  const [customWeightInput, setCustomWeightInput] = useState<string>('0.5')

  // Dynamic price presets proportional to item's price per kg
  const pricePresets = useMemo(() => {
    const quarter = Math.round(pricePerKg * 0.25)
    const half = Math.round(pricePerKg * 0.5)
    const threeQuarter = Math.round(pricePerKg * 0.75)
    const full = Math.round(pricePerKg)
    const double = Math.round(pricePerKg * 2)

    return [
      { label: `ربع كغ (${quarter} ₺)`, val: quarter.toString() },
      { label: `نصف كغ (${half} ₺)`, val: half.toString() },
      { label: `3 أرباع (${threeQuarter} ₺)`, val: threeQuarter.toString() },
      { label: `1 كغ (${full} ₺)`, val: full.toString() },
      { label: `2 كغ (${double} ₺)`, val: double.toString() },
    ]
  }, [pricePerKg])

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
  
  const isAutoRestocked = item.out_of_stock_until && new Date(item.out_of_stock_until).getTime() <= Date.now()
  const isOutOfStock = item.is_available === false && !isAutoRestocked

  const handleAdd = () => {
    if (isOutOfStock) return
    if (isKiloItem) {
      const defaultHalfPrice = Math.round(pricePerKg * 0.5) || 100
      if (!customPriceInput || customPriceInput === '100') {
        setCustomPriceInput(defaultHalfPrice.toString())
      }
      setShowKiloModal(true)
      return
    }
    addItem(item, restaurantId)
    trackGAAddToCart(item.name, Number(item.price))
    setPopped(true)
    setTimeout(() => setPopped(false), 250)
  }

  // Kilo Calculations
  const numPriceInput = parseFloat(customPriceInput) || 0
  const numWeightInput = parseFloat(customWeightInput) || 0

  const calculatedWeightFromPrice = numPriceInput > 0 ? (numPriceInput / pricePerKg) : 0
  const calculatedPriceFromWeight = numWeightInput > 0 ? Math.round(numWeightInput * pricePerKg) : 0

  const handleAddKiloItem = () => {
    if (isOutOfStock) return
    const isAmountMode = kiloMode === 'amount'
    if (isAmountMode && numPriceInput <= 0) return alert('يرجى إدخال مبلغ صحيح بالليرة')
    if (!isAmountMode && numWeightInput <= 0) return alert('يرجى إدخال وزن صحيح بالكيلو')

    const finalPrice = isAmountMode ? numPriceInput : calculatedPriceFromWeight
    const calculatedW = isAmountMode ? calculatedWeightFromPrice : numWeightInput
    
    const cartObj = {
      id: `${item.id}-${isAmountMode ? 'p' + numPriceInput : 'w' + numWeightInput}`,
      name: `${item.name} (${isAmountMode ? `بمبلغ ${numPriceInput} ₺ - حوالي ${calculatedW < 1 ? Math.round(calculatedW * 1000) + ' جرام' : calculatedW.toFixed(2) + ' كغ'}` : `وزن ${numWeightInput} كغ - ${finalPrice} ₺`})`,
      price: finalPrice,
      image_url: imageList[0] || item.image_url || null
    }

    addItem(cartObj, restaurantId)
    trackGAAddToCart(cartObj.name, finalPrice)
    setShowKiloModal(false)
    setPopped(true)
    setTimeout(() => setPopped(false), 250)
  }

  return (
    <>
      <div className={`rounded-3xl border p-3.5 flex gap-3.5 shadow-2xs hover:shadow-md transition-all duration-200 active:scale-[0.99] relative overflow-hidden select-none ${
        isOutOfStock
          ? 'bg-slate-50/80 border-slate-200 opacity-85'
          : isOffer
          ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border-orange-400/70 shadow-orange-500/10'
          : 'bg-white border-slate-200/90'
      }`}>
        {/* Image */}
        {hasImage && (
          <div
            onClick={() => imageList.length > 1 && setShowGallery(true)}
            className={`w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 relative shadow-2xs ${
              imageList.length > 1 ? 'cursor-pointer group' : ''
            }`}
          >
            {isOffer ? (
              <SmartOfferImage
                primaryImage={item.primary_image_url}
                bonusImage={item.bonus_image_url}
                item3Image={(item as any).item3_image_url}
                item4Image={(item as any).item4_image_url}
                itemImages={(item as any).item_images || item.images}
                customImage={item.image_url}
                hasCustomImage={(item as any).has_custom_image}
                minQuantity={item.min_quantity || 1}
                bonusQuantity={item.bonus_quantity || 1}
                className="w-full h-full"
              />
            ) : (
              <img src={getOptimizedImageUrl(imageList[0] || item.image_url, 600)} alt={item.name} loading="lazy" className={`w-full h-full object-cover ${isOutOfStock ? 'grayscale-40' : ''}`} />
            )}

            {/* Out of Stock Overlay Badge on Image */}
            {isOutOfStock ? (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center z-10">
                <span className="bg-rose-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <span>🚫</span>
                  <span>نفد</span>
                </span>
              </div>
            ) : discountPercent ? (
              <div className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                خصم %{discountPercent}
              </div>
            ) : isOffer ? (
              <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5">
                <span>🔥</span>
                <span>{item.offer_title || 'عرض خاص'}</span>
              </div>
            ) : isKiloItem ? (
              <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Scale size={10} />
                <span>بالكيلو</span>
              </div>
            ) : null}

            {/* Multi-Image Badge */}
            {imageList.length > 1 && !(isOffer && !(item as any).has_custom_image) && !isOutOfStock && (
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
              <h3 className="font-black text-sm sm:text-base text-slate-900 truncate tracking-tight">{item.name}</h3>
              {imageList.length > 1 && !isOutOfStock && (
                <button
                  type="button"
                  onClick={() => setShowGallery(true)}
                  className="text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 shrink-0 transition"
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
                  <span key={i} className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                    {sz}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-3 pt-1">
            {/* Price */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-base sm:text-lg font-black text-orange-600">
                {item.price} ₺ {isKiloItem && <span className="text-xs font-bold text-slate-400">/ كغ</span>}
              </span>
              {item.original_price && item.original_price > item.price && (
                <span className="text-xs font-bold text-slate-400 line-through">
                  {item.original_price} ₺
                </span>
              )}
            </div>

            {/* Add / Qty Buttons OR Kilo Button OR Out of Stock Badge */}
            {isOutOfStock ? (
              <span className="text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl select-none">
                نفد مؤقتاً
              </span>
            ) : enableWhatsappOrders === false ? null : hasDelivery === false ? (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200/60">
                🏪 استلام فقط
              </span>
            ) : isKiloItem ? (
              <button
                onClick={handleAdd}
                className="px-3.5 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Scale size={13} />
                <span>حدد الكمية</span>
              </button>
            ) : qty === 0 ? (
              <button
                onClick={handleAdd}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl text-white flex items-center justify-center shadow-xs hover:shadow-md transition-all duration-150 active:scale-90 ${
                  popped ? 'scale-110' : ''
                }`}
                style={{ background: 'var(--color-primary, #F97316)' }}
                aria-label="أضف للسلة"
              >
                <Plus size={18} strokeWidth={2.8} />
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 p-1 rounded-2xl text-white shadow-xs"
                style={{ background: 'var(--color-primary, #F97316)' }}
              >
                <button
                  onClick={() => updateQty(item.id, qty - 1)}
                  className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
                >
                  <Minus size={13} strokeWidth={2.5} />
                </button>
                <span className="font-black text-xs min-w-[18px] text-center">{qty}</span>
                <button
                  onClick={handleAdd}
                  className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center active:scale-90 transition"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Kilo / Custom Weight & Amount Selector Modal ── */}
      {showKiloModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in dir-rtl">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-slide-up">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  ⚖️
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">{item.name}</h4>
                  <p className="text-[11px] text-amber-400 font-bold">
                    السعر: {pricePerKg} ₺ لكل كيلو
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowKiloModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              
              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setKiloMode('amount')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
                    kiloMode === 'amount'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <DollarSign size={14} />
                  <span>حسب المبلغ (₺)</span>
                </button>
                <button
                  onClick={() => setKiloMode('weight')}
                  className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition ${
                    kiloMode === 'weight'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scale size={14} />
                  <span>حسب الوزن (كغ)</span>
                </button>
              </div>

              {/* MODE 1: Select by Amount (₺) */}
              {kiloMode === 'amount' && (
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 block">
                    اختر مبلغاً سريعاً أو أدخل أي مبلغ بالليرة:
                  </label>
                  
                  {/* Preset Price Buttons (Quarter, Half, 3/4, 1 Kg) */}
                  <div className="flex flex-wrap gap-2">
                    {pricePresets.map(preset => (
                      <button
                        key={preset.val}
                        onClick={() => setCustomPriceInput(preset.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer active:scale-95 ${
                          customPriceInput === preset.val
                            ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Price Input */}
                  <div className="relative">
                    <input
                      type="number"
                      value={customPriceInput}
                      onChange={e => setCustomPriceInput(e.target.value)}
                      placeholder="أدخل المبلغ بالليرة..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-left font-black text-lg text-slate-900 outline-none focus:border-amber-500 dir-ltr"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">
                      ₺ ليرة
                    </span>
                  </div>

                  {/* Realtime Calculated Weight Badge */}
                  {numPriceInput > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs font-black text-amber-900">
                      <span>⚖️ الكمية المحسوبة:</span>
                      <span className="text-sm font-black text-amber-700">
                        {calculatedWeightFromPrice < 1
                          ? `${Math.round(calculatedWeightFromPrice * 1000)} جرام`
                          : `${calculatedWeightFromPrice.toFixed(2)} كيلو (كغ)`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: Select by Weight (كغ) */}
              {kiloMode === 'weight' && (
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-700 block">
                    اختر وزن شائع أو أدخل أي وزن بالكيلو:
                  </label>

                  {/* Preset Weight Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'ربع كيلو (0.25)', val: '0.25' },
                      { label: 'نصف كيلو (0.5)', val: '0.5' },
                      { label: 'ثلاثة أرباع (0.75)', val: '0.75' },
                      { label: 'كيلو (1.0)', val: '1.0' },
                      { label: 'كيلوين (2.0)', val: '2.0' },
                    ].map(w => (
                      <button
                        key={w.val}
                        onClick={() => setCustomWeightInput(w.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition ${
                          customWeightInput === w.val
                            ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Weight Input */}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      value={customWeightInput}
                      onChange={e => setCustomWeightInput(e.target.value)}
                      placeholder="أدخل الوزن بالكيلو..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-left font-black text-lg text-slate-900 outline-none focus:border-amber-500 dir-ltr"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-sm text-slate-400">
                      كغ (كيلو)
                    </span>
                  </div>

                  {/* Realtime Calculated Price Badge */}
                  {numWeightInput > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between text-xs font-black text-amber-900">
                      <span>💰 السعر الإجمالي:</span>
                      <span className="text-sm font-black text-amber-700">
                        {calculatedPriceFromWeight} ₺
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">إجمالي الصنف</span>
                <span className="text-lg font-black text-amber-600">
                  {kiloMode === 'amount' ? numPriceInput : calculatedPriceFromWeight} ₺
                </span>
              </div>
              <button
                onClick={handleAddKiloItem}
                className="bg-amber-500 hover:bg-amber-600 text-white font-black px-6 py-3 rounded-2xl text-xs flex items-center gap-2 transition shadow-md cursor-pointer active:scale-95"
              >
                <ShoppingBag size={16} />
                <span>إضافة للسلة</span>
              </button>
            </div>

          </div>
        </div>
      )}

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
                <span className="text-lg font-black text-orange-500">{item.price} ₺ {isKiloItem && '/ كغ'}</span>
              </div>
              {enableWhatsappOrders !== false && (
                <button
                  onClick={() => {
                    handleAdd()
                    setShowGallery(false)
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 transition shadow-md"
                >
                  <Plus size={16} /> إضافة للسلة
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
