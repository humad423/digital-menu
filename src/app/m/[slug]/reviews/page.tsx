import { getRestaurantBySlug } from '@/utils/menuCache'
import { createPublicClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ReviewsClient from './ReviewsClient'

// Reviews can be added by any visitor so we use time-based ISR (5 min)
// rather than on-demand, since we don't control when new reviews arrive.
export const revalidate = 300

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

