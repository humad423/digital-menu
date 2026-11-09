'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { matchStockPhotos, type StockPhoto } from '@/utils/stockPhotos'

/** Offers a ready-made photo when the product's name matches one, so the owner can add it with one tap. */
export default function StockPhotoPicker({ productName, onPick }: { productName: string; onPick: (url: string) => void }) {
  const [photos, setPhotos] = useState<StockPhoto[]>([])

  useEffect(() => {
    supabase.from('stock_photos').select('id, name, keywords, image_url').then(({ data }) => setPhotos(data || []))
  }, [])

  const matches = matchStockPhotos(productName, photos).slice(0, 4)
  if (matches.length === 0) return null

  return (
    <div className="mt-2 space-y-2">
      <p className="font-bold">عندنا صورة جاهزة، اضغط عليها لإضافتها:</p>
      <div className="flex gap-2 overflow-x-auto">
        {matches.map(photo => (
          <button
            key={photo.id}
            type="button"
            onClick={() => onPick(photo.image_url)}
            aria-label={`إضافة صورة ${photo.name}`}
            className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-line bg-slate-100"
          >
            <img src={getOptimizedImageUrl(photo.image_url, 160)} alt="" loading="lazy" className="w-full h-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  )
}
