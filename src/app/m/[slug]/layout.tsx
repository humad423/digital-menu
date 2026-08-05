import { createClient } from '@/utils/supabase/server'
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
    .select('id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, latitude, longitude, delivery_radius_km')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', background: '#F8FAFC' }} dir="rtl">
        <div style={{ width: 72, height: 72, background: '#FEF2F2', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, marginBottom: 16 }}>🏪</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1E293B', marginBottom: 8 }}>المطعم غير موجود</h1>
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, maxWidth: 260, lineHeight: 1.6, marginBottom: 24 }}>عذراً، هذا المطعم غير موجود أو الرابط غير صحيح.</p>
        <Link href="/" style={{ background: '#F97316', color: '#fff', fontWeight: 900, fontSize: 14, padding: '12px 24px', borderRadius: 16, textDecoration: 'none' }}>العودة للرئيسية 🏠</Link>
      </div>
    )
  }

  const primary = restaurant.primary_color || '#F97316'

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        paddingBottom: 120,
        background: '#F8FAFC',
        '--color-primary': primary,
        '--brand-secondary': '#0F172A',
        '--brand-accent': `${primary}18`,
        fontFamily: "'Tajawal','Cairo',sans-serif",
      } as React.CSSProperties}
    >
      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <div style={{ position: 'relative' }}>

        {/* Cover Image */}
        <div style={{ position: 'relative', height: 250, overflow: 'hidden', background: '#E2E8F0' }}>
          {restaurant.cover_url ? (
            <img src={restaurant.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${primary}ee 0%, ${primary}77 100%)` }} />
          )}

          {/* Gradient overlay — strong at bottom for text readability */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.06) 40%, rgba(0,0,0,0.78) 100%)' }} />

          {/* Back button */}
          <Link
            href="/"
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 20,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', textDecoration: 'none',
            }}
          >
            <ArrowRight size={20} />
          </Link>

          {/* User auth button */}
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }}>
            <UserAuthButton />
          </div>

          {/* Restaurant name on image */}
          <div style={{ position: 'absolute', bottom: 0, right: 0, left: 60, padding: '0 18px 18px', zIndex: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.5)', margin: 0, lineHeight: 1.25 }}>
              {restaurant.name}
            </h1>
          </div>

          {/* Floating logo */}
          <div style={{
            position: 'absolute', bottom: 0, left: 14, transform: 'translateY(50%)',
            width: 54, height: 54, background: '#fff', borderRadius: 16,
            padding: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            border: '2.5px solid #fff', zIndex: 20, overflow: 'hidden',
          }}>
            {restaurant.logo_url ? (
              <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 11 }} />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: 11, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 900 }}>
                {restaurant.name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div style={{ margin: '0 16px', marginTop: -1 }}>
          <div className="restaurant-info-card" style={{ paddingTop: 20, paddingRight: 16, paddingBottom: 14, paddingLeft: 16 }}>
            {/* Spacer for floating logo */}
            <div style={{ width: 54, flexShrink: 0 }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', margin: '0 0 6px' }}>{restaurant.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 5px rgba(16,185,129,0.7)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>مفتوح الآن</span>
                </div>
                <RestaurantRating restaurantId={restaurant.id} restaurantSlug={restaurant.slug} />
              </div>
            </div>

            <div style={{ width: 36, height: 36, borderRadius: 12, background: `${primary}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              🍽️
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: 500, margin: '0 auto', padding: '18px 16px 0' }}>
        {children}
      </main>

      <CartButton restaurant={restaurant} />
    </div>
  )
}
