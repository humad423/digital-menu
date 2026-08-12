'use client'

import React from 'react'
import Link from 'next/link'

interface RestaurantRatingProps {
  restaurantSlug: string
  avgRating: string | number
  ratingsCount: number
}

export default function RestaurantRating({ restaurantSlug, avgRating, ratingsCount }: RestaurantRatingProps) {
  return (
    <Link
      href={`/m/${restaurantSlug}/reviews`}
      className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 transition shadow-sm active:scale-95 shrink-0"
      title="عرض التقييمات وآراء الزبائن"
    >
      <span className="text-amber-500">⭐</span>
      <span>{avgRating}</span>
      {ratingsCount > 0 && <span className="text-[10px] text-amber-600 font-bold">({ratingsCount})</span>}
    </Link>
  )
}
