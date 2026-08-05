'use client'

interface SmartOfferImageProps {
  primaryImage?: string | null
  bonusImage?: string | null
  customImage?: string | null
  minQuantity?: number
  bonusQuantity?: number
  className?: string
}

export default function SmartOfferImage({
  primaryImage,
  bonusImage,
  customImage,
  minQuantity = 1,
  bonusQuantity = 1,
  className = "w-full h-full"
}: SmartOfferImageProps) {
  // If custom image is uploaded, display it directly
  if (customImage) {
    return (
      <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
        <img src={customImage} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-orange-100 to-amber-50 rounded-xl ${className}`}>
      {/* Primary Image */}
      {primaryImage ? (
        <img src={primaryImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
      )}

      {/* Quantity Badge (e.g. 5x) */}
      {minQuantity > 1 && (
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-md text-white text-xs font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20">
          {minQuantity}x
        </div>
      )}

      {/* Bonus Image Overlay */}
      {bonusImage && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center">
          <div className="w-10 h-10 rounded-full border-2 border-white shadow-xl bg-white overflow-hidden relative z-10 shrink-0">
            <img src={bonusImage} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="px-1.5 py-0.5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-black shadow-md -mr-2 z-20 border border-white">
            {bonusQuantity > 1 ? `+${bonusQuantity}` : '+'}
          </div>
        </div>
      )}
    </div>
  )
}
