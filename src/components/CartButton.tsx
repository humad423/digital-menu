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
      {/* ── Floating Button ── */}
      <div className="cart-float">
        <button onClick={() => setIsOpen(true)} className="cart-float-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="cart-badge">{totalItems}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ShoppingBag size={18} />
              <span style={{ fontSize: 15 }}>عرض السلة</span>
            </div>
          </div>
          <span style={{ fontSize: 16 }}>{totalPrice.toFixed(2)} ₺</span>
        </button>
      </div>

      {/* ── Drawer ── */}
      {isOpen && (
        <div
          className="cart-backdrop"
          onClick={e => { if (e.target === e.currentTarget && !isCheckingOut) setIsOpen(false) }}
        >
          <div className="cart-drawer">
            {/* Handle */}
            <div className="cart-handle" />

            {/* Header */}
            <div className="cart-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="cart-header-icon">
                  <ShoppingBag size={18} style={{ color: 'var(--color-primary,#F97316)' }} />
                </div>
                <div>
                  <p style={{ fontWeight: 900, fontSize: 15, color: '#0F172A', margin: 0 }}>سلة الطلب</p>
                  <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, margin: 0 }}>{totalItems} عنصر</p>
                </div>
              </div>
              <button className="cart-close" onClick={() => !isCheckingOut && setIsOpen(false)} disabled={isCheckingOut}>
                <X size={16} />
              </button>
            </div>

            {/* Items */}
            <div className="cart-items">
              {items.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">{(item.price * item.quantity).toFixed(2)} ₺</div>
                  </div>
                  <div className="cart-item-qty">
                    <button
                      className="cart-item-btn"
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity - 1)}
                      disabled={isCheckingOut}
                    >
                      {item.quantity === 1
                        ? <Trash2 size={13} style={{ color: '#EF4444' }} />
                        : <Minus size={13} style={{ color: '#64748B' }} />
                      }
                    </button>
                    <span style={{ fontWeight: 900, fontSize: 15, minWidth: 20, textAlign: 'center', color: '#0F172A' }}>{item.quantity}</span>
                    <button
                      className="cart-item-btn"
                      onClick={() => cartStore.updateQuantity(item.id, item.quantity + 1)}
                      disabled={isCheckingOut}
                      style={{ background: 'var(--color-primary,#F97316)', borderColor: 'transparent', color: '#fff' }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="cart-footer">
              {checkoutError && (
                <div className="cart-error">
                  <MapPin size={15} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 700, lineHeight: 1.5, margin: 0 }}>{checkoutError}</p>
                </div>
              )}

              <div className="cart-total-row">
                <span className="cart-total-label">المجموع</span>
                <span className="cart-total-val">{totalPrice.toFixed(2)}<span className="cart-total-cur">₺</span></span>
              </div>

              <button
                className="cart-wa-btn"
                disabled={isCheckingOut}
                onClick={() => {
                  if (!isLoggedIn) openAuthModal(() => handleCheckout())
                  else handleCheckout()
                }}
              >
                {isCheckingOut ? (
                  <>
                    <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    <span>جاري إعداد الطلب...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle size={20} />
                    <span>إرسال الطلب عبر الواتساب</span>
                  </>
                )}
              </button>

              {!checkoutError && !isCheckingOut && (
                <p className="cart-hint">
                  <MapPin size={12} />
                  سيتم طلب موقعك لتأكيد التوصيل
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
