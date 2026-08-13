import { getRestaurantBySlug } from '@/utils/menuCache'
import CartButton from '@/components/CartButton'
import UserAuthButton from '@/components/UserAuthButton'
import RestaurantRating from '@/components/RestaurantRating'
import StoreHeaderBanner from '@/components/StoreHeaderBanner'
import StoreDeliveryBadge from '@/components/StoreDeliveryBadge'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, MapPin } from 'lucide-react'
import { getStoreStatus } from '@/utils/storeStatus'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import MenuLocationNotice from '@/components/MenuLocationNotice'

// No time-based revalidation — cache is invalidated on-demand via /api/revalidate
// when the restaurant owner saves any change in the dashboard.
export const revalidate = false
export const dynamic = 'force-static'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  // Reuses the same cache as RestaurantLayout — no extra Supabase query
  const r = await getRestaurantBySlug(slug)
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
  // Single cached Supabase query shared with generateMetadata above
  const restaurant = await getRestaurantBySlug(slug)

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

  // Compute avg rating server-side (no separate DB call needed)
  const ratingsList: { rating: number }[] = (restaurant as any).ratings || []
  const avgRating = ratingsList.length > 0
    ? (ratingsList.reduce((acc, curr) => acc + curr.rating, 0) / ratingsList.length).toFixed(1)
    : 'جديد'
  const ratingsCount = ratingsList.length

  const primary = restaurant.primary_color || '#F97316'

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-200 text-slate-800 font-sans pb-28"
      style={{ '--color-primary': primary } as React.CSSProperties}
    >
      {/* Centered mobile-frame wrapper */}
      <div className="max-w-md sm:max-w-lg mx-auto bg-slate-50 min-h-screen relative shadow-2xl">
        <MenuLocationNotice restaurant={restaurant} />

        {/* Cover Header */}
        <div className="relative">
        <div className="h-44 sm:h-52 w-full bg-slate-900 relative overflow-hidden">
          {restaurant.cover_url ? (
            <img src={getOptimizedImageUrl(restaurant.cover_url, 1000)} alt="" className="w-full h-full object-cover opacity-90" />
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

          {/* Subtle gradient at bottom only for visual polish */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-slate-950/60 to-transparent" />
        </div>

        {/* Info Box */}
        <div className="max-w-md sm:max-w-lg mx-auto px-4 -mt-4 relative z-20">
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
            {/* Logo */}
            <div className="w-14 h-14 rounded-2xl bg-white p-1 border-2 border-slate-100 shadow-xs shrink-0 overflow-hidden">
              {restaurant.logo_url ? (
                <img src={getOptimizedImageUrl(restaurant.logo_url, 200)} alt="" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-lg font-black text-white"
                  style={{ background: primary }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Meta - name + status + rating next to logo */}
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-black text-slate-900 truncate mb-1 leading-tight">{restaurant.name}</h2>
              <div className="flex items-center gap-3 flex-wrap text-xs mt-0">
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
                <RestaurantRating restaurantSlug={restaurant.slug} avgRating={avgRating} ratingsCount={ratingsCount} />
                <StoreDeliveryBadge restaurant={restaurant} />
              </div>
            </div>

            {/* Google Maps Store Location Button */}
            {(() => {
              const hasCoords = restaurant.latitude && restaurant.longitude && Number(restaurant.latitude) !== 0
              const mapUrl = hasCoords 
                ? `https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name)}`
              
              return (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-orange-50 hover:bg-orange-500 hover:text-white border border-orange-200/80 text-orange-600 transition-all duration-150 active:scale-95 shadow-2xs group"
                  title="فتح موقع المحل على الخرائط"
                >
                  <MapPin size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-black mt-0.5 whitespace-nowrap">الخريطة</span>
                </a>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="px-4 mt-4">
        <StoreHeaderBanner restaurant={restaurant} />
        {children}
      </main>

      {restaurant.enable_whatsapp_orders === false ? null : restaurant.has_delivery === false ? (
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
