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
  const [isOpen, setIsOpen]         = useState(false)
  const [isCheckingOut, setChecking] = useState(false)
  const [checkoutError, setError]    = useState('')
  const cartStore = useCartStore()

  const items      = cartStore.restaurantId === restaurant.id ? cartStore.items : []
  const totalItems = items.reduce((a, i) => a + i.quantity, 0)
  const totalPrice = items.reduce((a, i) => a + i.price * i.quantity, 0)

  if (!items.length) return null

  const handleCheckout = async () => {
    setError(''); setChecking(true)
    if (!navigator.geolocation) { setError('المتصفح لا يدعم تحديد الموقع.'); setChecking(false); return }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          if (restaurant.latitude && restaurant.longitude && restaurant.delivery_radius_km) {
            const dist = calculateDistance(lat, lng, restaurant.latitude, restaurant.longitude)
            if (dist > restaurant.delivery_radius_km) { setError('موقعك خارج نطاق التوصيل لهذا المطعم.'); setChecking(false); return }
          }
          const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`
          const { error } = await supabase.from('orders').insert({ restaurant_id: restaurant.id, total_price: totalPrice, items: items as any, location_url: locationUrl, status: 'pending' })
          if (error) { setError('حدث خطأ أثناء حفظ الطلب.'); setChecking(false); return }
          const text = items.map(i => `${i.quantity}x ${i.name} (${(i.price * i.quantity).toFixed(2)} ₺)`).join('\n')
          const msg  = `مرحباً مطعم ${restaurant.name}، أود طلب التالي:\n\n${text}\n\nالإجمالي: ${totalPrice.toFixed(2)} ₺\n\n📍 موقعي:\n${locationUrl}`
          window.open(`https://api.whatsapp.com/send?phone=${restaurant.whatsapp_number.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`, '_blank')
          cartStore.clearCart(); setIsOpen(false)
        } catch { setError('حدث خطأ غير متوقع.') }
        finally { setChecking(false) }
      },
      () => { setError('يرجى السماح بالوصول إلى موقعك لإتمام الطلب.'); setChecking(false) },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
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
          <span className="text-base font-black">{totalPrice.toFixed(2)} ₺</span>
        </button>
      </div>

      {/* ── Drawer Modal ── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget && !isCheckingOut) setIsOpen(false) }}
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
                onClick={() => !isCheckingOut && setIsOpen(false)}
                disabled={isCheckingOut}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Items List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {items.map(item => (
                <div key={item.id} className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-xs text-slate-900 truncate">{item.name}</h4>
                    <p className="text-xs font-black mt-0.5" style={{ color: 'var(--color-primary, #F97316)' }}>
                      {(item.price * item.quantity).toFixed(2)} ₺
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                      disabled={isCheckingOut}
                      className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs hover:bg-slate-100 transition"
                    >
                      {item.quantity === 1 ? <Trash2 size={13} className="text-red-500" /> : <Minus size={13} className="text-slate-600" />}
                    </button>
                    <span className="font-black text-xs text-slate-900 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                      disabled={isCheckingOut}
                      className="w-7 h-7 rounded-xl text-white flex items-center justify-center transition shadow-2xs"
                      style={{ background: 'var(--color-primary, #F97316)' }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 bg-white space-y-3">
              {checkoutError && (
                <div className="p-3 bg-red-50 border border-red-200/80 rounded-2xl flex items-start gap-2">
                  <MapPin size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-700 leading-relaxed">{checkoutError}</p>
                </div>
              )}

              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-500">المجموع</span>
                <span className="text-xl font-black text-slate-900">
                  {totalPrice.toFixed(2)} <span className="text-xs text-slate-400 font-bold">₺</span>
                </span>
              </div>

              <button
                onClick={() => {
                  if (!isLoggedIn) openAuthModal(() => handleCheckout())
                  else handleCheckout()
                }}
                disabled={isCheckingOut}
                className="w-full text-white font-black text-sm py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition disabled:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  boxShadow: '0 6px 20px rgba(37,211,102,0.35)'
                }}
              >
                {isCheckingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري إعداد الطلب...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    <span>إرسال الطلب عبر الواتساب</span>
                  </>
                )}
              </button>

              {!checkoutError && !isCheckingOut && (
                <p className="text-center text-[11px] text-slate-400 font-bold flex items-center justify-center gap-1 pt-1">
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
