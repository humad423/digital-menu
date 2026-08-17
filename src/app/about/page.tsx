import { Metadata } from 'next'
import LandingPageClient from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'عن منصة ألف سوق | التعريف الكامل ومزايا الشركاء والزبائن',
  description: 'تعرف على منصة ألف سوق الرائدة في المنيو الرقمي السريع وإدارة طلبات الواتساب وحساب التوصيل الذكي للمطاعم والمتاجر والزبائن.',
}

export default function AboutPage() {
  return <LandingPageClient />
}
