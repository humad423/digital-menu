'use client'

import NumberInput from '@/components/NumberInput'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react'
import SmartOfferImage from '@/components/SmartOfferImage'
import { confirmCartStoreSwitch, useCartStore } from '@/store/cartStore'
import { trackGAAddToCart } from '@/utils/analytics'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { notifyError } from '@/utils/notify'
import { CURRENCY_SYMBOL } from '@/config/site'

const WEIGHT_OPTIONS = [
  { label: 'ربع كيلو', kg: 0.25 },
  { label: 'نصف كيلو', kg: 0.5 },
  { label: 'كيلو', kg: 1 },
  { label: 'كيلوين', kg: 2 },
]

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {}
  }
  return []
}

function QuantityStepper({ quantity, onDecrease, onIncrease }: { quantity: number; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <div className="grid grid-cols-3 items-center border border-line rounded-[0.875rem] overflow-hidden">
      <button onClick={onDecrease} aria-label="إنقاص الكمية" className="min-h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200">
        <Minus size={20} />
      </button>
      <span aria-live="polite" className="text-center text-lg font-black">{quantity}</span>
      <button onClick={onIncrease} aria-label="زيادة الكمية" className="min-h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200">
        <Plus size={20} />
      </button>
    </div>
  )
}

function ChoiceRow({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (option: string) => void }) {
  return (
    <div className="mt-2">
      <p className="font-bold mb-1">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className="chip">
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-label={title} className="bg-white w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-title min-w-0">{title}</h3>
          <button onClick={onClose} className="btn btn-secondary btn-sm shrink-0">
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function MenuItem({
  item,
  restaurantId,
  canOrder = true,
}: {
  item: any
  restaurantId: string
  canOrder?: boolean
}) {
  const addItem = useCartStore(s => s.addItem)
  const updateQuantity = useCartStore(s => s.updateQuantity)
  const cartItems = useCartStore(s => s.items)
  const cartStoreId = useCartStore(s => s.restaurantId)

  const images = stringList(item.images)
  if (images.length === 0 && item.image_url) images.push(item.image_url)
  const sizes = stringList(item.sizes)
  const colors = stringList(item.colors)

  const [size, setSize] = useState(sizes[0] || '')
  const [color, setColor] = useState(colors[0] || '')
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [showWeightSheet, setShowWeightSheet] = useState(false)
  const [customAmount, setCustomAmount] = useState('')

  // Checked in the browser because the page can be served from a cache
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => setNow(Date.now()), [])
  const restocked = now !== null && item.out_of_stock_until && new Date(item.out_of_stock_until).getTime() <= now
  const isOutOfStock = item.is_available === false && !restocked

  const price = Number(item.price)
  const isByWeight = item.unit === 'kg' || item.allow_custom_amount === true
  const originalPrice = Number(item.original_price)
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null

  // Each size and color combination is its own line in the cart and the WhatsApp message
  const variant = [size && `مقاس ${size}`, color && `لون ${color}`].filter(Boolean).join('، ')
  const lineId = [item.id, size, color].filter(Boolean).join('|')
  const lineName = variant ? `${item.name} (${variant})` : item.name
  const quantity = cartStoreId === restaurantId ? cartItems.find(i => i.id === lineId)?.quantity ?? 0 : 0

  const addLine = (id: string, name: string, linePrice: number) => {
    if (!confirmCartStoreSwitch(restaurantId)) return
    addItem({ id, name, price: linePrice }, restaurantId)
    trackGAAddToCart(item.name, linePrice)
  }

  const addWeight = (kg: number, label: string) => {
    addLine(`${item.id}|${kg}`, `${item.name} (${label})`, Math.round(kg * price))
    setShowWeightSheet(false)
  }

  const addCustomAmount = () => {
    const amount = parseFloat(customAmount)
    if (!(amount > 0)) {
      notifyError('اكتب المبلغ الذي تريده.')
      return
    }
    addLine(`${item.id}|a${amount}`, `${item.name} (بمبلغ ${amount} ${CURRENCY_SYMBOL})`, amount)
    setCustomAmount('')
    setShowWeightSheet(false)
  }

  return (
    <article className={`card p-3 ${isOutOfStock ? 'opacity-70' : ''}`}>
      <div className="flex gap-3">
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => setGalleryIndex(0)}
            aria-label={`عرض صورة ${item.name}`}
            className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-slate-200"
          >
            {item.is_offer && item.has_custom_image === false ? (
              <SmartOfferImage
                primaryImage={item.primary_image_url}
                bonusImage={item.bonus_image_url}
                item3Image={item.item3_image_url}
                item4Image={item.item4_image_url}
                itemImages={item.item_images}
                minQuantity={item.min_quantity || 1}
                bonusQuantity={item.bonus_quantity || 1}
                className="w-full h-full"
              />
            ) : (
              <img src={getOptimizedImageUrl(images[0], 300)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-black leading-snug">{item.name}</h3>
          {item.description && <p className="text-muted font-medium leading-snug mt-0.5">{item.description}</p>}
          <p className="mt-1">
            <span className="text-xl font-black text-brand">{item.price} {CURRENCY_SYMBOL}</span>
            {isByWeight && <span className="text-muted font-medium"> للكيلو</span>}
          </p>
          {discount !== null && (
            <p className="font-bold">
              <span className="text-muted font-medium line-through">{item.original_price} {CURRENCY_SYMBOL}</span>
              <span className="text-red-700"> · خصم {discount}%</span>
            </p>
          )}
        </div>
      </div>

      {sizes.length > 0 && <ChoiceRow label="المقاس:" options={sizes} value={size} onChange={setSize} />}
      {colors.length > 0 && <ChoiceRow label="اللون:" options={colors} value={color} onChange={setColor} />}

      <div className="mt-3">
        {isOutOfStock ? (
          <p className="notice notice-info text-center">غير متوفر حالياً</p>
        ) : !canOrder ? null : isByWeight ? (
          <button onClick={() => setShowWeightSheet(true)} className="btn btn-primary btn-block">اختر الكمية</button>
        ) : quantity === 0 ? (
          <button onClick={() => addLine(lineId, lineName, price)} className="btn btn-primary btn-block">
            <Plus size={20} />
            <span>أضف إلى السلة</span>
          </button>
        ) : (
          <QuantityStepper
            quantity={quantity}
            onDecrease={() => updateQuantity(lineId, quantity - 1)}
            onIncrease={() => addLine(lineId, lineName, price)}
          />
        )}
      </div>

      {showWeightSheet && (
        <Sheet title={item.name} onClose={() => setShowWeightSheet(false)}>
          <p className="font-bold">السعر {item.price} {CURRENCY_SYMBOL} للكيلو. كم تريد؟</p>
          <div className="grid grid-cols-2 gap-2">
            {WEIGHT_OPTIONS.map(option => (
              <button key={option.kg} onClick={() => addWeight(option.kg, option.label)} className="btn btn-secondary flex-col !gap-0 min-h-16">
                <span>{option.label}</span>
                <span className="text-muted font-medium">{Math.round(option.kg * price)} {CURRENCY_SYMBOL}</span>
              </button>
            ))}
          </div>
          <div>
            <label htmlFor={`amount-${item.id}`} className="field-label">أو اكتب المبلغ الذي تريده ({CURRENCY_SYMBOL})</label>
            <div className="flex gap-2">
              <NumberInput
                id={`amount-${item.id}`}
                inputMode="decimal"
                min="1"
                value={customAmount}
                onChange={event => setCustomAmount(event.target.value)}
                className="field min-w-0"
              />
              <button onClick={addCustomAmount} className="btn btn-primary shrink-0">إضافة</button>
            </div>
          </div>
        </Sheet>
      )}

      {galleryIndex !== null && (
        <Sheet title={item.name} onClose={() => setGalleryIndex(null)}>
          <img
            src={getOptimizedImageUrl(images[galleryIndex], 900)}
            alt={item.name}
            decoding="async"
            className="w-full max-h-[60dvh] object-contain bg-slate-100 rounded-xl"
          />
          {images.length > 1 && (
            <div className="grid grid-cols-3 items-center gap-2">
              <button onClick={() => setGalleryIndex((galleryIndex - 1 + images.length) % images.length)} className="btn btn-secondary">
                <ChevronRight size={20} />
                <span>السابقة</span>
              </button>
              <span className="text-center font-bold">{galleryIndex + 1} من {images.length}</span>
              <button onClick={() => setGalleryIndex((galleryIndex + 1) % images.length)} className="btn btn-secondary">
                <span>التالية</span>
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </Sheet>
      )}
    </article>
  )
}
