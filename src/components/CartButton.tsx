'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { ShoppingBag, X, Plus, Minus, Trash2, MessageCircle, MapPin } from 'lucide-react'
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
      setCheckoutError('المتصفح الخاص بك لا يدعم تحديد الموقع. يرجى استخدام متصفح حديث.')
      setIsCheckingOut(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude

          // Check delivery radius if restaurant has location set
          if (restaurant.latitude && restaurant.longitude && restaurant.delivery_radius_km) {
            const dist = calculateDistance(lat, lng, restaurant.latitude, restaurant.longitude)
            if (dist > restaurant.delivery_radius_km) {
              setCheckoutError('عذراً، لا يمكن إتمام الطلب لأن موقعك خارج نطاق التوصيل الخاص بهذا المطعم.')
              setIsCheckingOut(false)
              return
            }
          }

          const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`

          // Save to database
          const { error } = await supabase.from('orders').insert({
            restaurant_id: restaurant.id,
            total_price: totalPrice,
            items: items as any, // jsonb
            location_url: locationUrl,
            status: 'pending'
          })

          if (error) {
            console.error('Error saving order:', error)
            setCheckoutError('حدث خطأ أثناء حفظ الطلب. يرجى المحاولة مرة أخرى.')
            setIsCheckingOut(false)
            return
          }

          // Build WhatsApp message
          const text = items.map(item => `${item.quantity}x ${item.name} (${(item.price * item.quantity).toFixed(2)} ₺)`).join('\n')
          const message = `مرحباً مطعم ${restaurant.name}، أود طلب التالي:\n\n${text}\n\nالإجمالي: ${totalPrice.toFixed(2)} ₺\n\n📍 موقع التوصيل:\n${locationUrl}`
          const encodedMessage = encodeURIComponent(message)
          
          const cleanPhone = restaurant.whatsapp_number.replace(/\D/g, '')
          window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`, '_blank')
          // Clear cart after successful checkout direction
          cartStore.clearCart()
          setIsOpen(false)
          
        } catch (err) {
          console.error('Checkout error:', err)
          setCheckoutError('حدث خطأ غير متوقع.')
        } finally {
          setIsCheckingOut(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setCheckoutError('يرجى السماح بالوصول إلى موقعك الجغرافي لنتمكن من توصيل طلبك.')
        setIsCheckingOut(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-6 left-0 right-0 px-5 flex justify-center z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full max-w-md text-white rounded-2xl px-5 py-4 font-black flex items-center justify-between transition-all active:scale-[0.98] shadow-xl"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 40%, transparent)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-xl w-9 h-9 flex items-center justify-center font-black text-sm">
              {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag size={18} />
              <span className="text-base">عرض السلة</span>
            </div>
          </div>
          <span className="text-base font-black">{totalPrice.toFixed(2)} ₺</span>
        </button>
      </div>

      {/* Cart Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-center items-end sm:items-center"
          style={{ background: 'rgba(26,26,46,0.5)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget && !isCheckingOut) setIsOpen(false) }}
        >
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] flex flex-col max-h-[88vh] shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--brand-accent, #FFE0CC)' }}
                >
                  <ShoppingBag size={18} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className="font-black text-lg" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                  سلة الطلب
                </h2>
              </div>
              <button
                onClick={() => !isCheckingOut && setIsOpen(false)}
                disabled={isCheckingOut}
                className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex gap-4 items-center bg-gray-50 rounded-2xl p-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-sm truncate" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                      {item.name}
                    </h4>
                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--color-primary)' }}>
                      {(item.price * item.quantity).toFixed(2)} ₺
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                      disabled={isCheckingOut}
                      className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                    >
                      {item.quantity === 1
                        ? <Trash2 size={15} className="text-red-500" />
                        : <Minus size={15} className="text-gray-600" />
                      }
                    </button>
                    <span className="font-black w-5 text-center text-base" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                      disabled={isCheckingOut}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm transition disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-4 border-t border-gray-100 bg-white">
              {checkoutError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <MapPin className="text-red-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs text-red-600 font-bold leading-relaxed">{checkoutError}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-500 font-medium">الإجمالي</span>
                <span className="font-black text-xl" style={{ color: 'var(--brand-secondary, #1A1A2E)' }}>
                  {totalPrice.toFixed(2)} <span className="text-sm font-bold text-gray-400">₺</span>
                </span>
              </div>
              
              <button
                onClick={() => {
                  if (!isLoggedIn) {
                    openAuthModal(() => {
                      handleCheckout()
                    })
                  } else {
                    handleCheckout()
                  }
                }}
                disabled={isCheckingOut}
                className="w-full text-white rounded-2xl p-4 font-black flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg disabled:opacity-75 disabled:active:scale-100"
                style={{
                  background: '#25D366',
                  boxShadow: '0 6px 24px rgba(37,211,102,0.35)'
                }}
              >
                {isCheckingOut ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-lg">جاري تجهيز الطلب...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={22} />
                    <span className="text-lg">إرسال الطلب عبر الواتساب</span>
                  </>
                )}
              </button>
              
              {!checkoutError && !isCheckingOut && (
                <p className="text-center text-xs text-gray-400 font-medium mt-3">
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
