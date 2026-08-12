import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-6QKRPVXYRJ'

  if (!measurementId) return null

  return <NextGoogleAnalytics gaId={measurementId} />
}
