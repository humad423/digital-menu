import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import ReviewsClient from './ReviewsClient'

export const revalidate = 60

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()

  return {
    title: restaurant ? `تقييمات وآراء الزبائن | ${restaurant.name}` : 'التقييمات',
  }
}

export default async function RestaurantReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, primary_color, logo_url')
    .eq('slug', slug)
    .maybeSingle()

  if (!restaurant) {
    notFound()
  }

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
