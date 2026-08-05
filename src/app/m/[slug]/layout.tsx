import { createClient } from '@/utils/supabase/server'
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
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, latitude, longitude, delivery_radius_km')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center text-4xl mb-5 shadow-sm">
          🏪
        </div>
        <h1 className="text-xl font-black text-slate-800 mb-2">المطعم غير موجود</h1>
        <p className="text-sm text-slate-400 max-w-xs mb-6 font-medium leading-relaxed">
          عذراً، هذا المطعم غير موجود أو قد يكون الرابط غير صحيح.
        </p>
        <Link
          href="/"
          className="px-6 py-3.5 text-white font-black text-sm rounded-2xl shadow-lg transition active:scale-95"
          style={{ background: restaurant ? `${(restaurant as any).primary_color}` : '#F97316' }}
        >
          العودة للمنصة الرئيسية 🏠
        </Link>
      </div>
    )
  }

  const primaryColor = restaurant.primary_color || '#F97316'

  return (
    <div
      className="min-h-screen pb-32 relative"
      dir="rtl"
      style={{
        '--color-primary': primaryColor,
        '--brand-secondary': '#1A1A2E',
        '--brand-accent': `${primaryColor}18`,
        '--background': '#F8FAFC',
        background: '#F8FAFC'
      } as React.CSSProperties}
    >
      {/* ── Hero Section ── */}
      <div className="relative">
        {/* Cover */}
        <div className="relative w-full overflow-hidden" style={{ height: 230 }}>
          {restaurant.cover_url ? (
            <img
              src={restaurant.cover_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(145deg, ${primaryColor}ff 0%, ${primaryColor}99 50%, ${primaryColor}44 100%)`
              }}
            />
          )}
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.65) 100%)' }}
          />

          {/* Back Button */}
          <Link
            href="/"
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center border transition active:scale-90"
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255,255,255,0.25)'
            }}
          >
            <ArrowRight size={20} className="text-white" />
          </Link>

          {/* User Auth */}
          <div className="absolute top-4 left-4 z-20">
            <UserAuthButton />
          </div>

          {/* Restaurant name overlay on cover */}
          <div className="absolute bottom-0 right-0 left-0 px-4 pb-3 z-10">
            <h1 className="text-2xl font-black text-white drop-shadow-md leading-tight">
              {restaurant.name}
            </h1>
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative mx-4 -mt-5 z-10">
          <div className="restaurant-profile-card flex items-center gap-3">
            {/* Logo */}
            <div
              className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden border-2 shadow-sm"
              style={{ borderColor: `${primaryColor}30`, background: '#F8FAFC' }}
            >
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-2xl font-black text-white"
                  style={{ background: primaryColor }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-400 truncate">{restaurant.name}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                    style={{ boxShadow: '0 0 5px rgba(16,185,129,0.7)' }}
                  />
                  <span className="text-xs text-slate-500 font-bold">مفتوح الآن</span>
                </div>
                <RestaurantRating restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />
              </div>
            </div>

            {/* Primary color dot accent */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              style={{ background: `${primaryColor}15` }}
            >
              🍽️
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
