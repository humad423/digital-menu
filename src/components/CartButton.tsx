'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle, MapPin, CheckCircle } from 'lucide-react'
import { Database } from '@/types/database.types'
import { supabase } from '@/lib/supabase'
import { calculateDistance } from '@/utils/distance'
import { useAuth } from '@/context/AuthContext'

type Restaurant = Pick<Database['public']['Tables']['restaurants']['Row'], 'id' | 'name' | 'whatsapp_number' | 'latitude' | 'longitude' | 'delivery_radius_km'>

export default function CartButton({ restaurant }: { restaurant: Restaurant }) {
  const { isLoggedIn, openAuthModal } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const cartStore = useCartStore()

  const items = cartStore.restaurantId === restaurant.id ? cartStore.items : []
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  if (items.length === 0) return null

  const handleCheckout = async () => {
    setCheckoutError('')
    setIsCheckingOut(true)

    if (!navigator.geolocation) {
      setCheckoutError('المتصفح الخاص بك لا يدعم تحديد الموقع.')
      setIsCheckingOut(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          if (restaurant.latitude && restaurant.longitude && restaurant.delivery_radius_km) {
            const dist = calculateDistance(lat, lng, restaurant.latitude, restaurant.longitude)
            if (dist > restaurant.delivery_radius_km) {
              setCheckoutError('عذراً، موقعك خارج نطاق التوصيل لهذا المطعم.')
              setIsCheckingOut(false)
              return
            }
          }

          const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`

          const { error } = await supabase.from('orders').insert({
            restaurant_id: restaurant.id,
            total_price: totalPrice,
            items: items as any,
            location_url: locationUrl,
            status: 'pending'
          })

          if (error) {
            setCheckoutError('حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.')
            setIsCheckingOut(false)
            return
          }

          const text = items.map(item => `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} ₺)`).join('\n')
          const message = `مرحباً مطعم ${restaurant.name}، أود طلب التالي:\n\n${text}\n\nالإجمالي: ${totalPrice.toFixed(2)} ₺\n\n📍 موقع التوصيل:\n${locationUrl}`
          const encodedMessage = encodeURIComponent(message)

          const cleanPhone = restaurant.whatsapp_number.replace(/\D/g, '')
          window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank')
          cartStore.clearCart()
          setIsOpen(false)
        } catch (err) {
          setCheckoutError('حدث خطأ غير متوقع.')
        } finally {
          setIsCheckingOut(false)
        }
      },
      (err) => {
        setCheckoutError('يرجى السماح بالوصول إلى موقعك الجغرافي لتوصيل طلبك.')
        setIsCheckingOut(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <>
      {/* ── Floating Cart Button ── */}
      <div className="fixed bottom-5 left-4 right-4 flex justify-center z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="cart-float-btn shadow-2xl"
          style={{
            boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 42%, transparent)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl w-10 h-10 flex items-center justify-center font-black text-sm flex-shrink-0">
              {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span className="text-base font-black">عرض السلة</span>
            </div>
          </div>
          <span className="text-base font-black">{totalPrice.toFixed(2)} ₺</span>
        </button>
      </div>

      {/* ── Cart Drawer Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-end sm:items-center"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget && !isCheckingOut) setIsOpen(false) }}
        >
          <div
            className="bg-white w-full max-w-md flex flex-col overflow-hidden animate-slide-down"
            style={{
              borderRadius: '28px 28px 0 0',
              maxHeight: '92vh',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.18)'
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'var(--brand-accent, #FFF7ED)' }}
                >
                  <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-base">سلة الطلب</h2>
                  <p className="text-xs text-slate-400 font-medium">{totalItems} عنصر</p>
                </div>
              </div>
              <button
                onClick={() => !isCheckingOut && setIsOpen(false)}
                disabled={isCheckingOut}
                className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            {/* Items List */}
            <div className="px-4 py-4 overflow-y-auto flex-1 space-y-2.5">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex gap-3 items-center bg-slate-50 rounded-2xl p-3 border border-slate-100"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm text-slate-800 truncate">{item.name}</h4>
                    <p
                      className="text-sm font-black mt-0.5"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {(item.price * item.quantity).toFixed(2)} ₺
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                      disabled={isCheckingOut}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      {item.quantity === 1
                        ? <Trash2 size={14} className="text-red-500" />
                        : <Minus size={14} className="text-slate-600" />
                      }
                    </button>
                    <span
                      className="font-black w-6 text-center text-base tabular-nums"
                      style={{ color: 'var(--brand-secondary, #1A1A2E)' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                      disabled={isCheckingOut}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm disabled:opacity-50 transition"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-7 pt-4 border-t border-slate-100 bg-white">
              {/* Error */}
              {checkoutError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5">
                  <MapPin className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-red-600 font-bold leading-relaxed">{checkoutError}</p>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-slate-500 font-bold">الإجمالي</span>
                <span className="font-black text-2xl" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                  {totalPrice.toFixed(2)}{' '}
                  <span className="text-sm font-bold text-slate-400">₺</span>
                </span>
              </div>

              {/* WhatsApp Button */}
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    openAuthModal(() => { handleCheckout() })
                  } else {
                    handleCheckout()
                  }
                }}
                disabled={isCheckingOut}
                className="w-full text-white rounded-2xl p-4 font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:active:scale-100"
                style={{
                  background: isCheckingOut
                    ? '#1a9c4a'
                    : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  boxShadow: '0 6px 24px rgba(37,211,102,0.4)'
                }}
              >
                {isCheckingOut ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-base">جاري إعداد الطلب...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={22} />
                    <span className="text-base">إرسال الطلب عبر الواتساب</span>
                  </>
                )}
              </button>

              {!checkoutError && !isCheckingOut && (
                <p className="text-center text-xs text-slate-400 font-medium mt-3 flex items-center justify-center gap-1.5">
                  <MapPin size={12} />
                  سيتم طلب موقعك الجغرافي لتأكيد التوصيل
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
