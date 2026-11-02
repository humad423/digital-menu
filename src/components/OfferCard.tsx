import Link from 'next/link'
import SmartOfferImage from '@/components/SmartOfferImage'
import { CURRENCY_SYMBOL } from '@/config/site'

export default function OfferCard({ offer }: { offer: any }) {
  const store = offer.restaurants
  if (!store) return null

  return (
    <Link href={`/m/${store.slug}`} prefetch={false} className="card text-ink no-underline">
      <div className="h-40 bg-slate-200">
        <SmartOfferImage
          primaryImage={offer.primary_item?.image_url}
          bonusImage={offer.bonus_item?.image_url}
          item3Image={offer.item3?.image_url}
          item4Image={offer.item4?.image_url}
          customImage={offer.image_url}
          hasCustomImage={!!offer.image_url}
          minQuantity={offer.min_quantity}
          bonusQuantity={offer.bonus_quantity}
          className="w-full h-full"
        />
      </div>
      <div className="p-4">
        <p className="text-muted font-bold">{store.name}</p>
        <h3 className="text-lg font-black leading-snug">{offer.title}</h3>
        <p className="mt-1">
          <span className="text-xl font-black text-brand">{offer.offer_price} {CURRENCY_SYMBOL}</span>
          {offer.original_price > offer.offer_price && (
            <span className="text-muted font-medium line-through ms-2">{offer.original_price} {CURRENCY_SYMBOL}</span>
          )}
        </p>
      </div>
    </Link>
  )
}
