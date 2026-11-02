import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/config/site'
import { getHomePageData } from '@/utils/menuCache'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { restaurants } = await getHomePageData()

  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/offers`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    ...restaurants.map(store => ({
      url: `${SITE_URL}/m/${store.slug}`,
      changeFrequency: 'daily' as const,
      priority: 0.9,
    })),
  ]
}
