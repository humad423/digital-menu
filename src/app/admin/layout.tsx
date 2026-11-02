import type { Metadata } from 'next'

// The admin panel isn't an installable app and shouldn't appear in search
export const metadata: Metadata = {
  title: 'لوحة الإدارة | ألف سوق',
  manifest: null,
  robots: { index: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
