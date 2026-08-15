// Server Component — data served from in-memory cache (5 min TTL)
import { getOffersPageData } from '@/utils/menuCache'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import UserAuthButton from '@/components/UserAuthButton'
import OffersClient from './OffersClient'

export const dynamic = 'force-dynamic'

export default async function AllOffersPage() {
  const { offers, businessTypes } = await getOffersPageData()

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

