import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, MapPin } from 'lucide-react'
import CartButton from '@/components/CartButton'
import CartHydrator from '@/components/CartHydrator'
import ContactStoreButton from '@/components/ContactStoreButton'
import HideFromQrVisitors from '@/components/HideFromQrVisitors'
import MenuQrTracker from '@/components/MenuQrTracker'
import InstallAppButton from '@/components/pwa/InstallAppButton'
import ShareButton from '@/components/ShareButton'
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

  // Its own switch, apart from the home page: a listed store can still keep its customers to itself
  const showStoresButton = restaurant.show_stores_button === true

  // A store is hidden when the admin suspends its menu or its subscription ends.
  // Its customers are sent on to the other stores, whatever its stores button is set to.
  if (restaurant.is_menu_active === false || restaurant.is_subscription_active === false) {
    return (
      <div dir="rtl" className="min-h-screen bg-page">
        <main className="page-narrow py-8 space-y-4">
          <h1 className="text-2xl font-black">{restaurant.name}</h1>
          <p className="notice notice-warn">هذا المتجر غير متاح حالياً على ألف سوق.</p>
          <HideFromQrVisitors>
            <Link href="/" className="btn btn-primary btn-block">تصفح المتاجر الأخرى</Link>
          </HideFromQrVisitors>
        </main>
      </div>
    )
  }

  const hasCoords = restaurant.latitude && restaurant.longitude
  // Contact or the map fills the row when it is the only one
  const quickActions = (restaurant.whatsapp_number ? 1 : 0) + (hasCoords ? 1 : 0)

  return (
    <div dir="rtl" className="min-h-screen bg-page pb-28">
      <CartHydrator />
      <MenuQrTracker restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />

      <header className="bg-white border-b border-line">
        <div className="page-narrow py-3 flex items-center justify-between gap-3 empty:hidden">
          {/* Someone who scanned the QR code in the shop stays on its menu */}
          {showStoresButton && (
            <HideFromQrVisitors>
              <Link href="/" className="btn btn-secondary btn-sm">
                <ArrowRight size={18} />
                <span>كل المتاجر</span>
              </Link>
            </HideFromQrVisitors>
          )}
          <InstallAppButton variant="header" />
        </div>

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
            <h1 className="text-2xl font-black leading-snug min-w-0 flex-1">{restaurant.name}</h1>
            {/* Small, beside the name, out of the way of the store's own buttons */}
            <ShareButton
              restaurantId={restaurant.id}
              slug={restaurant.slug}
              text={`شوف ${restaurant.name} على ألف سوق، المنيو والأسعار`}
              iconOnly
              className="shrink-0 w-11 h-11 inline-flex items-center justify-center rounded-full border border-line bg-white text-slate-600 hover:bg-slate-50"
            />
          </div>

          <StoreInfo restaurant={restaurant} />

          {quickActions > 0 && (
          <div className={`grid gap-2 ${quickActions === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {restaurant.whatsapp_number && (
              <ContactStoreButton restaurantId={restaurant.id} whatsappNumber={restaurant.whatsapp_number} />
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
          )}
        </div>
      </header>

      <main className="page-narrow pt-4">{children}</main>

      <CartButton restaurant={restaurant} />
    </div>
  )
}
