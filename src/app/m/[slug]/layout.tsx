import { createClient } from '@/utils/supabase/server'
import CartButton from '@/components/CartButton'
import UserAuthButton from '@/components/UserAuthButton'
import RestaurantRating from '@/components/RestaurantRating'
import StoreHeaderBanner from '@/components/StoreHeaderBanner'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { getStoreStatus } from '@/utils/storeStatus'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: r } = await supabase.from('restaurants').select('name').eq('slug', slug).maybeSingle()
  return { title: r ? `${r.name} | مِنيو` : 'مطعم غير موجود' }
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, is_on_holiday, opening_time, closing_time, days_off')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-xs">
          🏪
        </div>
        <h1 className="text-lg font-black text-slate-900 mb-1">المطعم غير موجود</h1>
        <p className="text-xs text-slate-400 font-bold max-w-xs mb-5 leading-relaxed">
          عذراً، هذا المطعم غير موجود أو الرابط غير صحيح.
        </p>
        <Link
          href="/"
          className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95"
        >
          العودة للرئيسية 🏠
        </Link>
      </div>
    )
  }

  const primary = restaurant.primary_color || '#F97316'

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-200 text-slate-800 font-sans pb-28"
      style={{ '--color-primary': primary } as React.CSSProperties}
    >
      {/* Centered mobile-frame wrapper */}
      <div className="max-w-md sm:max-w-lg mx-auto bg-slate-50 min-h-screen relative shadow-2xl">

      {/* Cover Header */}
      <div className="relative">
        <div className="h-44 sm:h-52 w-full bg-slate-900 relative overflow-hidden">
          {restaurant.cover_url ? (
            <img src={restaurant.cover_url} alt="" className="w-full h-full object-cover opacity-90" />
          ) : (
            <div
              className="w-full h-full opacity-90"
              style={{
                background: `linear-gradient(135deg, ${primary}ee, ${primary}66)`
              }}
            />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/40" />

          {/* Back Button */}
          <Link
            href="/"
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-900/70 backdrop-blur-md text-white border border-white/25 flex items-center justify-center shadow-md active:scale-90 hover:bg-slate-900/90 transition"
            title="العودة للرئيسية"
          >
            <ArrowRight size={19} />
          </Link>

          {/* User Auth */}
          <div className="absolute top-4 left-4 z-20">
            <UserAuthButton variant="light" />
          </div>

          {/* Restaurant Title Overlay */}
          <div className="absolute bottom-3 right-4 left-20 z-10">
            <h1 className="text-xl sm:text-2xl font-black text-white drop-shadow-md leading-tight">
              {restaurant.name}
            </h1>
          </div>
        </div>

        {/* Info Box */}
        <div className="max-w-md sm:max-w-lg mx-auto px-4 -mt-4 relative z-20">
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-white p-1 border-2 border-slate-100 shadow-xs shrink-0 overflow-hidden">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-lg font-black text-white"
                  style={{ background: primary }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate mb-1">{restaurant.name}</p>
              <div className="flex items-center gap-3 flex-wrap text-xs">
                {(() => {
                  const status = getStoreStatus(restaurant)
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`} />
                      <span className="font-bold text-slate-700">{status.statusText}</span>
                      {status.subText && <span className="text-[10px] text-slate-400 font-bold">({status.subText})</span>}
                    </div>
                  )
                })()}
                <RestaurantRating restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="px-4 mt-4">
        <StoreHeaderBanner restaurant={restaurant} />
        {children}
      </main>

      {restaurant.has_delivery === false ? (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4 max-w-md sm:max-w-lg mx-auto">
          <div className="bg-slate-900 text-white rounded-2xl p-3 px-4 shadow-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🏪</span>
              <div className="min-w-0">
                <p className="font-black text-xs text-white truncate">استلام من الفرع / تصفح فقط</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">هذا المتجر لا يوفر خدمة التوصيل المباشر</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CartButton restaurant={restaurant} />
      )}

      </div>{/* end mobile-frame wrapper */}
    </div>
  )
}
