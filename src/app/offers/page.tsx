// Server Component — data fetching only (no 'use client')
// On-demand revalidation via /api/revalidate — offers only change when admin edits them
import { createPublicClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import UserAuthButton from '@/components/UserAuthButton'
import OffersClient from './OffersClient'

export const revalidate = false

export default async function AllOffersPage() {
  const supabase = createPublicClient()

  const [offRes, btRes] = await Promise.all([
    supabase
      .from('offers')
      .select('*, restaurants(id, name, slug, store_type, latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery), primary_item:menu_items!primary_item_id(image_url), bonus_item:menu_items!bonus_item_id(image_url), item3:menu_items!item3_id(image_url), item4:menu_items!item4_id(image_url)')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false }),
    supabase
      .from('business_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
  ])

  const offers       = offRes.data  || []
  const businessTypes = btRes.data  || []

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
        <div className="max-w-md sm:max-w-lg mx-auto px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition border border-slate-700"
                title="العودة للرئيسية"
              >
                <ArrowRight size={18} />
              </Link>
              <div>
                <h1 className="font-black text-base text-white flex items-center gap-2">
                  <span>🔥</span> جميع العروض والتخفيضات
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">استكشف كافة عروض وبكجات المنصة المتاحة</p>
              </div>
            </div>
            <UserAuthButton variant="light" />
          </div>

          {/* Interactive parts (search + tabs + grid) */}
          <OffersClient offers={offers} businessTypes={businessTypes} />
        </div>
      </header>

      {/* Main content rendered inside OffersClient */}
      <main className="max-w-md sm:max-w-lg mx-auto px-4" />
    </div>
  )
}
