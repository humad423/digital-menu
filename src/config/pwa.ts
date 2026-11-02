import type { Metadata } from 'next'

/** The store panel installs as its own app, with its own name and icon. */
export const partnerAppMetadata: Metadata = {
  manifest: '/partner-manifest.json',
  icons: {
    icon: '/partner-icon-192.png',
    apple: '/partner-apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'لوحة الشريك',
  },
}
