import { Metadata } from 'next'
import LandingPageClient from '@/components/LandingPageClient'

export const metadata: Metadata = {
  title: 'منصة ألف سوق | المنيو الرقمي السريع والطلبات الذكية للشركاء والزبائن',
  description: 'المنصة الذكية الأولى لربط المطاعم والمتاجر بالزبائن مع منيو رقمي فائق السرعة، رموز QR مخصصة، وطلبات واتساب مباشرة.',
}

export default function LandingPage() {
  return <LandingPageClient />
}
