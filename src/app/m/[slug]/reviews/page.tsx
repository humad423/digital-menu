import { getRestaurantBySlug } from '@/utils/menuCache'
import { createPublicClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ReviewsClient from './ReviewsClient'

// force-dynamic: eliminates ISR Write Units completely.
// Ratings are cached for 5 minutes via the ratings memoryCache key below.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Reuses the same restaurant cache — no extra Supabase query
  const restaurant = await getRestaurantBySlug(slug)
  return {
    title: restaurant ? `تقييمات وآراء الزبائن | ${restaurant.name}` : 'التقييمات',
  }
}

export default async function RestaurantReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Reuses cached restaurant data — no extra Supabase query
  const restaurant = await getRestaurantBySlug(slug)

  if (!restaurant) {
    notFound()
  }

  // Ratings still need a fresh query (time-based ISR handles freshness)
  const supabase = createPublicClient()
  const { data: ratings } = await supabase
    .from('ratings')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  return (
    <ReviewsClient
      restaurant={restaurant}
      initialRatings={ratings || []}
    />
  )
}

