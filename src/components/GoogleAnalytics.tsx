import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

export default function GoogleAnalytics({ gaId }: { gaId?: string }) {
  const measurementId = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-24MTPCGDE7'

  if (!measurementId) return null

  return <NextGoogleAnalytics gaId={measurementId} />
}
