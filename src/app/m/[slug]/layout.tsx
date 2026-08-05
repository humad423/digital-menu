import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CartButton from '@/components/CartButton'
import UserAuthButton from '@/components/UserAuthButton'
import RestaurantRating from '@/components/RestaurantRating'
import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()

  return {
    title: restaurant ? `${restaurant.name} | مِنيو` : 'مطعم غير موجود',
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
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, latitude, longitude, delivery_radius_km')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center dir-rtl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center text-2xl font-black mb-4">
          🏪
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">المطعم غير موجود</h1>
        <p className="text-xs text-gray-500 max-w-xs mb-6 font-medium leading-relaxed">
          عذراً، هذا المطعم غير موجود أو قد يكون الرابط غير صحيح.
        </p>
        <Link href="/" className="px-6 py-3.5 bg-orange-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition">
          العودة للمنصة الرئيسية 🏠
        </Link>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-28 relative"
      dir="rtl"
      style={{
        '--color-primary': restaurant.primary_color || '#FF5C00',
        background: 'var(--background)'
      } as React.CSSProperties}
    >
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-52 w-full relative overflow-hidden">
          {restaurant.cover_url ? (
            <img src={restaurant.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${restaurant.primary_color || '#FF5C00'}ee, ${restaurant.primary_color || '#FF5C00'}66)` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

          {/* Back Button */}
          <Link
            href="/"
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/30 transition z-20"
          >
            <ArrowRight size={18} />
          </Link>

          {/* User Auth Account Icon Button */}
          <div className="absolute top-4 left-4 z-20">
            <UserAuthButton />
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative mx-5 -mt-12 z-10">
          <div className="bg-white rounded-[1.75rem] shadow-sm border border-gray-100 px-5 py-4 flex items-center gap-4" style={{ boxShadow: '0 4px 24px rgba(26,26,46,0.10)' }}>
            {/* Logo */}
            <div className="w-[72px] h-[72px] rounded-2xl bg-gray-50 p-1.5 border border-gray-100 shrink-0 shadow-sm overflow-hidden">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: `var(--color-primary)` }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black truncate" style={{ color: 'var(--brand-secondary)' }}>
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
                  <span className="text-xs text-gray-500 font-bold">مفتوح الآن</span>
                </div>
                <span className="text-gray-300">•</span>
                <RestaurantRating restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 mt-5">
        {children}
      </main>

      <CartButton restaurant={restaurant} />
    </div>
  )
}
