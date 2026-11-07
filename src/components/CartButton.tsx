'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { publicInsert } from '@/utils/publicInsert'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'
import { deliveryNow, type DeliveryNow } from '@/utils/schedule'
import { getStoreStatus, type StoreStatus } from '@/utils/storeStatus'
import { trackGAWhatsAppOrder } from '@/utils/analytics'
import { getPrecisePosition, readUserLocation } from '@/utils/userLocation'
import { CURRENCY_SYMBOL } from '@/config/site'

const money = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2)} ${CURRENCY_SYMBOL}`

function buildOrderMessage({
  storeName,
  lines,
  subtotal,
  isPickup,
  deliveryFee,
  customerName,
  note,
  locationUrl,
}: {
  storeName: string
  lines: string[]
  subtotal: number
  isPickup: boolean
  deliveryFee: number | null
  customerName: string
  note: string
  locationUrl: string | null
}): string {
  const parts = [`مرحباً ${storeName}، أود طلب التالي:`, lines.join('\n'), `🧾 إجمالي المنتجات: ${money(subtotal)}`]

  if (isPickup) {
    parts.push('🏪 استلام من المتجر')
  } else if (deliveryFee !== null) {
    parts.push(`🛵 أجور التوصيل المتوقعة: ${deliveryFee === 0 ? 'مجاني' : money(deliveryFee)}\n💰 الإجمالي: ${money(subtotal + deliveryFee)}`)
  } else {
    parts.push('🛵 تُضاف أجور التوصيل حسب العنوان')
  }

  if (customerName.trim()) parts.push(`👤 الاسم: ${customerName.trim()}`)
  if (note.trim()) parts.push(`📝 ملاحظة: ${note.trim()}`)
  if (locationUrl) parts.push(`📍 موقع التوصيل:\n${locationUrl}`)

  return parts.join('\n\n')
}

export default function CartButton({ restaurant }: { restaurant: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [shareLocation, setShareLocation] = useState(true)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [note, setNote] = useState('')
  const [status, setStatus] = useState<StoreStatus | null>(null)
  const [estimate, setEstimate] = useState<{ fee: number | null; outOfRange: boolean }>({ fee: null, outOfRange: false })
  const [delivery, setDelivery] = useState<DeliveryNow | null>(null)
  const cartStore = useCartStore()

  // No delivery at all, or not at this hour: the order is picked up from the store
  const isPickup = restaurant.has_delivery === false || delivery?.available === false
  const items = cartStore.restaurantId === restaurant.id ? cartStore.items : []
  const totalItems = items.reduce((a, i) => a + i.quantity, 0)
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0)

  useEffect(() => {
    if (!isOpen) return
    setStatus(getStoreStatus(restaurant))
    setDelivery(deliveryNow(restaurant))

    // Delivery fee estimate comes from the exact position when shared, else the last known one
    const from = position || readUserLocation()
    if (!isPickup && from && restaurant.latitude && restaurant.longitude) {
      const info = getDeliveryFeeForDistance(
        calculateDistance(from.lat, from.lng, Number(restaurant.latitude), Number(restaurant.longitude)),
        restaurant.delivery_tiers,
        restaurant.delivery_radius_km
      )
      setEstimate({ fee: info.available && info.hasTiers ? info.fee : null, outOfRange: !info.available })
    }
  }, [isOpen, isPickup, restaurant, position])

  // Ask for the exact location when the cart opens, so sending stays instant.
  // Browsers block new tabs opened after a delay, so the send button can't wait for GPS.
  useEffect(() => {
    if (!isOpen || isPickup || !shareLocation) return
    let active = true
    getPrecisePosition()
      .then(pos => { if (active) setPosition(pos) })
      .catch(() => { if (active) setShareLocation(false) })
    return () => { active = false }
  }, [isOpen, isPickup, shareLocation])

  if (restaurant.enable_whatsapp_orders === false) return null
  if (!items.length) return null

  const locationUrl = !isPickup && shareLocation && position
    ? `https://www.google.com/maps?q=${position.lat},${position.lng}`
    : null

  const handleSend = () => {
    if (!status?.isOpen) return

    const lines = items.map(i =>
      i.quantity > 1
        ? `• ${i.name} (عدد ${i.quantity}) - ${money(i.price * i.quantity)}`
        : `• ${i.name} - ${money(i.price)}`
    )
    const message = buildOrderMessage({
      storeName: restaurant.name,
      lines,
      subtotal,
      isPickup,
      deliveryFee: estimate.fee,
      customerName,
      note,
      locationUrl,
    })
    const url = `https://wa.me/${restaurant.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

    trackGAWhatsAppOrder(restaurant.name, subtotal)

    // The real order lives on WhatsApp, so a failed statistics insert must never hold it up
    publicInsert('orders', {
      restaurant_id: restaurant.id,
      total_price: subtotal,
      items,
      location_url: locationUrl,
      status: 'pending',
    }).catch(error => console.warn(error.message))

    cartStore.clearCart()
    setNote('')
    setIsOpen(false)

    // Open in the click itself. If the browser blocks a new tab, go there in this one,
    // because the cart is already empty and the order would otherwise be lost.
    if (!window.open(url, '_blank')) window.location.href = url
  }

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line p-3">
        <div className="page-narrow !px-0">
          <button onClick={() => setIsOpen(true)} className="btn btn-primary btn-lg btn-block justify-between">
            <span className="flex items-center gap-2">
              <ShoppingBag size={22} />
              <span>عرض السلة ({totalItems})</span>
            </span>
            <span>{money(subtotal)}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center"
          onClick={event => { if (event.target === event.currentTarget) setIsOpen(false) }}
        >
          <div role="dialog" aria-label="سلة الطلب" className="bg-white w-full max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col sm:rounded-2xl overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-line shrink-0">
              <h2 className="section-title">سلة الطلب</h2>
              <button onClick={() => setIsOpen(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
                <span>إغلاق</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {items.map(item => (
                <div key={item.id} className="border border-line rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold leading-snug min-w-0">{item.name}</h3>
                    <span className="font-black shrink-0">{money(item.price * item.quantity)}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center border border-line rounded-xl overflow-hidden">
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                      aria-label={item.quantity === 1 ? 'حذف من السلة' : 'إنقاص الكمية'}
                      className="min-h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200"
                    >
                      {item.quantity === 1 ? <Trash2 size={20} className="text-red-700" /> : <Minus size={20} />}
                    </button>
                    <span className="text-center text-lg font-black">{item.quantity}</span>
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                      aria-label="زيادة الكمية"
                      className="min-h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Optional, and sent only inside the WhatsApp message */}
              <div>
                <label htmlFor="customer-name" className="field-label">اسمك (اختياري)</label>
                <input id="customer-name" type="text" value={customerName} onChange={event => setCustomerName(event.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="order-note" className="field-label">
                  {isPickup ? 'ملاحظة (اختياري)' : 'العنوان أو ملاحظة (اختياري)'}
                </label>
                <textarea id="order-note" rows={2} value={note} onChange={event => setNote(event.target.value)} className="field" />
              </div>

              {!isPickup && (
                <label className="flex items-center gap-3 min-h-12 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={shareLocation}
                    onChange={event => setShareLocation(event.target.checked)}
                    className="w-6 h-6 accent-[var(--color-brand)] shrink-0"
                  />
                  <span>أرسل موقعي مع الطلب</span>
                </label>
              )}

              {restaurant.has_delivery === false
                ? <p className="notice notice-info">هذا المتجر لا يوفر توصيلاً، والاستلام يكون من المتجر.</p>
                : isPickup && <p className="notice notice-info">{delivery?.reason}، فالطلب يكون استلاماً من المتجر.</p>}
              {status && !status.isOpen && <p className="notice notice-bad">المتجر مغلق الآن، ولا يمكن إرسال الطلب.</p>}
              {estimate.outOfRange && !isPickup && <p className="notice notice-warn">موقعك خارج نطاق التوصيل المعتاد. اتفق مع المتجر عبر واتساب.</p>}
            </div>

            <div className="p-4 border-t border-line space-y-2 shrink-0">
              <div className="flex justify-between gap-3 font-bold">
                <span>المنتجات</span>
                <span>{money(subtotal)}</span>
              </div>
              {!isPickup && (
                <div className="flex justify-between gap-3 font-bold">
                  <span>التوصيل المتوقع</span>
                  <span>{estimate.fee === null ? 'حسب العنوان' : estimate.fee === 0 ? 'مجاني' : money(estimate.fee)}</span>
                </div>
              )}
              {!isPickup && !!estimate.fee && (
                <div className="flex justify-between gap-3 text-lg font-black">
                  <span>الإجمالي</span>
                  <span>{money(subtotal + estimate.fee)}</span>
                </div>
              )}

              <button onClick={handleSend} disabled={!status?.isOpen} className="btn btn-whatsapp btn-lg btn-block">
                <MessageCircle size={22} />
                <span>{status && !status.isOpen ? 'المتجر مغلق الآن' : 'إرسال الطلب على واتساب'}</span>
              </button>
              <p className="text-muted font-medium text-center leading-snug">
                يصل طلبك إلى المتجر مباشرة، والدفع والتوصيل تتفق عليهما معه.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
