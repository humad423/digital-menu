import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Footer from '@/components/Footer'
import { getOffersPageData } from '@/utils/menuCache'
import OffersClient from './OffersClient'

export const metadata: Metadata = {
  title: 'كل العروض | ألف سوق',
  description: 'أحدث عروض المتاجر القريبة منك وأسعارها على ألف سوق.',
}

export default async function AllOffersPage() {
  const { offers, businessTypes } = await getOffersPageData()

  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-page">
      <header className="site-header">
        <div className="page py-3">
          <Link href="/" className="btn btn-secondary btn-sm">
            <ArrowRight size={18} />
            <span>الرئيسية</span>
          </Link>
        </div>
      </header>

      <main className="page py-4 flex-1 space-y-4">
        <h1 className="text-2xl font-black">كل العروض</h1>
        <OffersClient offers={offers} businessTypes={businessTypes} />
      </main>

      <Footer />
    </div>
  )
}
