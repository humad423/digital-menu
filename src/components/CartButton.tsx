'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { calculateDistance, getDeliveryFeeForDistance } from '@/utils/distance'
import { getStoreStatus, type StoreStatus } from '@/utils/storeStatus'
import { trackGAWhatsAppOrder } from '@/utils/analytics'
import { getPrecisePosition, readUserLocation } from '@/utils/userLocation'
import { CURRENCY_SYMBOL } from '@/config/site'
import InstallAppButton from '@/components/pwa/InstallAppButton'

const money = (value: number) => `${value.toFixed(2)} ${CURRENCY_SYMBOL}`

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
    parts.push('🏪 استلام من الفرع')
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
  const [sentUrl, setSentUrl] = useState<string | null>(null)
  const cartStore = useCartStore()

  const isPickup = restaurant.has_delivery === false
  const items = cartStore.restaurantId === restaurant.id ? cartStore.items : []
  const totalItems = items.reduce((a, i) => a + i.quantity, 0)
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0)

  useEffect(() => {
    if (!isOpen) return
    setStatus(getStoreStatus(restaurant))

    // Delivery fee estimate comes from the visitor's saved area or GPS
    const saved = readUserLocation()
    if (!isPickup && saved && restaurant.latitude && restaurant.longitude) {
      const info = getDeliveryFeeForDistance(
        calculateDistance(saved.lat, saved.lng, Number(restaurant.latitude), Number(restaurant.longitude)),
        restaurant.delivery_tiers,
        restaurant.delivery_radius_km
      )
      setEstimate({ fee: info.available && info.hasTiers ? info.fee : null, outOfRange: !info.available })
    }
  }, [isOpen, isPickup, restaurant])

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
  if (!items.length && !sentUrl) return null

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

    // Open in the click itself. The real order lives on WhatsApp, so a failed
    // statistics insert must never hold it up.
    window.open(url, '_blank')
    setSentUrl(url)
    trackGAWhatsAppOrder(restaurant.name, subtotal)

    supabase
      .from('orders')
      .insert({
        restaurant_id: restaurant.id,
        total_price: subtotal,
        items,
        location_url: locationUrl,
        status: 'pending',
      })
      .then(({ error }) => {
        if (error) console.warn('Could not record order:', error.message)
      })
  }

  const finishOrder = () => {
    cartStore.clearCart()
    setSentUrl(null)
    setNote('')
    setIsOpen(false)
  }

  return (
    <>
      {/* ── Floating Bottom Cart Bar ── */}
      <div className="fixed bottom-5 left-4 right-4 z-40 flex justify-center max-w-md mx-auto">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full text-white font-black py-3.5 px-4 rounded-2xl flex items-center justify-between shadow-xl active:scale-98 transition-all"
          style={{
            background: 'var(--color-primary, #F97316)',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--color-primary, #F97316) 40%, transparent)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-xs font-black">
              {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span className="text-sm font-black">عرض السلة</span>
            </div>
          </div>
          <span className="text-base font-black">{money(subtotal)}</span>
        </button>
      </div>

      {/* ── Drawer Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-1 shrink-0" />

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--color-primary, #F97316) 12%, transparent)' }}
                >
                  <ShoppingBag size={18} style={{ color: 'var(--color-primary, #F97316)' }} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">سلة الطلب</h3>
                  <p className="text-[11px] text-slate-400 font-bold">{totalItems} عنصر</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق السلة"
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {sentUrl ? (
              /* ── After sending: the cart stays until the customer confirms ── */
              <div className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm mb-1">جهّزنا طلبك على واتساب</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    اضغط إرسال داخل واتساب ليصل طلبك للمتجر.
                  </p>
                </div>
                <a
                  href={sentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-white font-black text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 no-underline"
                  style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
                >
                  <MessageCircle size={18} />
                  <span>ما فتح واتساب؟ افتحه من هون</span>
                </a>
                <button
                  onClick={finishOrder}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs py-3 rounded-2xl transition"
                >
                  تم إرسال الطلب، أفرغ السلة
                </button>
                <InstallAppButton variant="link" label="لطلب أسرع المرة القادمة، ثبّت التطبيق" />
              </div>
            ) : (
              <>
                {/* Items List */}
                <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
                  {items.map(item => (
                    <div key={item.id} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-black text-xs text-slate-900 truncate">{item.name}</h4>
                        <p className="text-xs font-black mt-0.5" style={{ color: 'var(--color-primary, #F97316)' }}>
                          {money(item.price * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                          aria-label="إنقاص الكمية"
                          className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs hover:bg-slate-100 transition"
                        >
                          {item.quantity === 1 ? <Trash2 size={13} className="text-red-500" /> : <Minus size={13} className="text-slate-600" />}
                        </button>
                        <span className="font-black text-xs text-slate-900 w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                          aria-label="زيادة الكمية"
                          className="w-7 h-7 rounded-xl text-white flex items-center justify-center transition shadow-2xs"
                          style={{ background: 'var(--color-primary, #F97316)' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Optional details, sent only inside the WhatsApp message */}
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="اسمك (اختياري)"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500"
                    />
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder={isPickup ? 'ملاحظة على الطلب (اختياري)' : 'العنوان بالتفصيل أو ملاحظة على الطلب (اختياري)'}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-white space-y-3">
                  {status && !status.isOpen && (
                    <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl flex items-center gap-2">
                      <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                      <p className="text-xs font-black text-rose-700">
                        المتجر مغلق حالياً ({status.statusText}). لا يمكن إرسال الطلبات في هذا الوقت.
                      </p>
                    </div>
                  )}

                  {estimate.outOfRange && !isPickup && (
                    <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center gap-2">
                      <MapPin size={16} className="text-amber-600 shrink-0" />
                      <p className="text-xs font-bold text-amber-800">
                        موقعك خارج نطاق التوصيل المعتاد، اتفق مع المتجر عبر واتساب.
                      </p>
                    </div>
                  )}

                  {status?.isOpen && !isPickup && (
                    <label className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl cursor-pointer select-none transition hover:bg-slate-100/80">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className={shareLocation ? 'text-orange-500' : 'text-slate-400'} />
                        <span className="text-xs font-bold text-slate-700">إرفاق موقعي مع رسالة الطلب</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={shareLocation}
                        onChange={e => setShareLocation(e.target.checked)}
                        className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                      />
                    </label>
                  )}

                  {isPickup && (
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700">
                      🏪 هذا الطلب للاستلام من الفرع، المتجر لا يوفر توصيلاً.
                    </div>
                  )}

                  <div className="space-y-1 px-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">إجمالي المنتجات</span>
                      <span className="text-sm font-black text-slate-900">{money(subtotal)}</span>
                    </div>
                    {!isPickup && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500">أجور التوصيل المتوقعة</span>
                        <span className="text-xs font-black text-slate-700">
                          {estimate.fee === null ? 'حسب العنوان' : estimate.fee === 0 ? 'مجاني' : money(estimate.fee)}
                        </span>
                      </div>
                    )}
                    {!isPickup && estimate.fee !== null && estimate.fee > 0 && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-xs font-black text-slate-700">الإجمالي</span>
                        <span className="text-lg font-black text-slate-900">{money(subtotal + estimate.fee)}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!status?.isOpen}
                    className="w-full text-white font-black text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: !status?.isOpen ? '#94A3B8' : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                      boxShadow: !status?.isOpen ? 'none' : '0 6px 20px rgba(37,211,102,0.35)'
                    }}
                  >
                    {status && !status.isOpen ? (
                      <span>المتجر مغلق حالياً ⛔</span>
                    ) : (
                      <>
                        <MessageCircle size={18} />
                        <span>إرسال الطلب عبر الواتساب</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
