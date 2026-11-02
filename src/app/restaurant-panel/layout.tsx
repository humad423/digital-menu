import type { Metadata } from 'next'
import { partnerAppMetadata } from '@/config/pwa'

export const metadata: Metadata = {
  ...partnerAppMetadata,
  title: 'لوحة الشريك | ألف سوق',
  robots: { index: false },
}

export default function RestaurantPanelLayout({ children }: { children: React.ReactNode }) {
  return children
}
