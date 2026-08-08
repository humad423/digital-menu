'use client'

interface SmartOfferImageProps {
  primaryImage?: string | null
  bonusImage?: string | null
  item3Image?: string | null
  item4Image?: string | null
  itemImages?: (string | null | undefined)[]
  customImage?: string | null
  hasCustomImage?: boolean
  minQuantity?: number
  bonusQuantity?: number
  className?: string
}

export default function SmartOfferImage({
  primaryImage,
  bonusImage,
  item3Image,
  item4Image,
  itemImages,
  customImage,
  hasCustomImage = false,
  minQuantity = 1,
  bonusQuantity = 1,
  className = "w-full h-full"
}: SmartOfferImageProps) {
  // If store owner explicitly uploaded a custom offer image, show it
  if (hasCustomImage && customImage && customImage.trim() !== '') {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
        <img src={customImage} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  // Gather list of item images from all props
  let images: string[] = []
  if (Array.isArray(itemImages) && itemImages.length > 0) {
    images = itemImages.filter((img): img is string => typeof img === 'string' && img.trim() !== '')
  } else {
    images = [primaryImage, bonusImage, item3Image, item4Image].filter((img): img is string => typeof img === 'string' && img.trim() !== '')
  }

  // Fallback to customImage if no item images found
  if (images.length === 0 && customImage) {
    images = [customImage]
  }

  // 0 images: Fallback gradient
  if (images.length === 0) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-slate-900 flex items-center justify-center ${className}`}>
        <span className="text-3xl drop-shadow-md">🏷️</span>
      </div>
    )
  }

  // 1 image: Full cover
  if (images.length === 1) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
        <img src={images[0]} alt="" className="w-full h-full object-cover" />
        {minQuantity > 1 && (
          <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20">
            {minQuantity}x
          </div>
        )}
      </div>
    )
  }

  // 2 images: 2-split vertical (50% / 50%)
  if (images.length === 2) {
    return (
      <div className={`relative overflow-hidden bg-slate-200 grid grid-cols-2 gap-0.5 ${className}`}>
        <div className="w-full h-full overflow-hidden relative">
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="w-full h-full overflow-hidden relative">
          <img src={images[1]} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
    )
  }

  // 3 images: 1 large on right (50%) + 2 stacked on left (50%)
  if (images.length === 3) {
    return (
      <div className={`relative overflow-hidden bg-slate-200 grid grid-cols-2 gap-0.5 ${className}`}>
        <div className="w-full h-full overflow-hidden relative">
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-rows-2 gap-0.5 w-full h-full">
          <div className="w-full h-full overflow-hidden relative">
            <img src={images[1]} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="w-full h-full overflow-hidden relative">
            <img src={images[2]} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  // 4+ images: 2x2 grid (4 equal quadrants)
  return (
    <div className={`relative overflow-hidden bg-slate-200 grid grid-cols-2 grid-rows-2 gap-0.5 ${className}`}>
      {images.slice(0, 4).map((img, idx) => (
        <div key={idx} className="w-full h-full overflow-hidden relative">
          <img src={img} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  )
}
