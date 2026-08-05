'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface RestaurantRatingProps {
  restaurantId: string
  restaurantSlug: string
}

export default function RestaurantRating({ restaurantId, restaurantSlug }: RestaurantRatingProps) {
  const [ratings, setRatings] = useState<any[]>([])

  useEffect(() => {
    const fetchRatings = async () => {
      const { data } = await supabase
        .from('ratings')
        .select('rating')
        .eq('restaurant_id', restaurantId)

      if (data) setRatings(data)
    }

    fetchRatings()
  }, [restaurantId])

  const avgRating = ratings.length > 0
    ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
    : 'جديد'

  return (
    <Link
      href={`/m/${restaurantSlug}/reviews`}
      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 transition shadow-sm active:scale-95 shrink-0"
      title="عرض التقييمات وآراء الزبائن"
    >
      <span className="text-amber-500">⭐</span>
      <span>{avgRating}</span>
      {ratings.length > 0 && <span className="text-[10px] text-amber-600 font-bold">({ratings.length})</span>}
    </Link>
  )
}
