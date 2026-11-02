import type { Metadata } from 'next'
import { partnerAppMetadata } from '@/config/pwa'

export const metadata: Metadata = {
  ...partnerAppMetadata,
  title: 'لوحة الشريك | ألف سوق',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
