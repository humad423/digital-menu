import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, MapPin, MessageCircle } from 'lucide-react'
import CartButton from '@/components/CartButton'
import CartHydrator from '@/components/CartHydrator'
import MenuQrTracker from '@/components/MenuQrTracker'
import StoreInfo from '@/components/StoreInfo'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { getRestaurantBySlug } from '@/utils/menuCache'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) return { title: 'المتجر غير موجود', robots: { index: false } }

  const title = `${r.name} | ألف سوق`
  const description = r.menu_note || `منتجات ${r.name} وأسعارها على ألف سوق.`
  const image = getOptimizedImageUrl(r.cover_url || r.logo_url, 1200)

  return {
    title,
    description,
    alternates: { canonical: `/m/${r.slug}` },
    openGraph: { title, description, type: 'website', locale: 'ar', images: image ? [image] : undefined },
  }
}

export default async function RestaurantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const restaurant = await getRestaurantBySlug(slug)

  if (!restaurant) notFound()

  // A store hidden from the home page gets its own customers, so it doesn't send them to other stores
  const isListed = restaurant.show_on_home !== false

  const whatsappUrl = `https://wa.me/${(restaurant.whatsapp_number || '').replace(/\D/g, '')}`

  // A store is hidden when the admin suspends its menu or its subscription ends
  if (restaurant.is_menu_active === false || restaurant.is_subscription_active === false) {
    return (
      <div dir="rtl" className="min-h-screen bg-page">
        <main className="page-narrow py-8 space-y-4">
          <h1 className="text-2xl font-black">{restaurant.name}</h1>
          <p className="notice notice-warn">هذا المتجر غير متاح حالياً على ألف سوق.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {isListed && <Link href="/" className="btn btn-primary">تصفح المتاجر الأخرى</Link>}
            {restaurant.whatsapp_number && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                مراسلة المتجر على واتساب
              </a>
            )}
          </div>
        </main>
      </div>
    )
  }

  const hasCoords = restaurant.latitude && restaurant.longitude

  return (
    <div dir="rtl" className="min-h-screen bg-page pb-28">
      <CartHydrator />
      <MenuQrTracker restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />

      <header className="bg-white border-b border-line">
        {isListed && (
          <div className="page-narrow py-3">
            <Link href="/" className="btn btn-secondary btn-sm">
              <ArrowRight size={18} />
              <span>كل المتاجر</span>
            </Link>
          </div>
        )}

        {restaurant.cover_url && (
          <div className="page-narrow">
            <img
              src={getOptimizedImageUrl(restaurant.cover_url, 800)}
              alt=""
              decoding="async"
              className="w-full h-36 sm:h-48 object-cover rounded-2xl bg-slate-200"
            />
          </div>
        )}

        <div className="page-narrow py-4 space-y-3">
          <div className="flex items-center gap-3">
            {restaurant.logo_url && (
              <img
                src={getOptimizedImageUrl(restaurant.logo_url, 120)}
                alt=""
                width={56}
                height={56}
                className="w-14 h-14 rounded-xl object-contain border border-line bg-white shrink-0"
              />
            )}
            <h1 className="text-2xl font-black leading-snug min-w-0">{restaurant.name}</h1>
          </div>

          <StoreInfo restaurant={restaurant} />

          <div className="grid grid-cols-2 gap-2">
            {restaurant.whatsapp_number && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <MessageCircle size={18} className="shrink-0" />
                <span>مراسلة</span>
              </a>
            )}
            {hasCoords && (
              <a
                href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <MapPin size={18} className="shrink-0" />
                <span>الموقع</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="page-narrow pt-4">{children}</main>

      <CartButton restaurant={restaurant} />
    </div>
  )
}
