import Link from 'next/link'
import ShareButton from '@/components/ShareButton'
import SmartOfferImage from '@/components/SmartOfferImage'
import { CURRENCY_SYMBOL } from '@/config/site'

export default function OfferCard({ offer }: { offer: any }) {
  const store = offer.restaurants
  if (!store) return null

  return (
    <div className="card text-ink">
    <Link href={`/m/${store.slug}`} prefetch={false} className="block text-ink no-underline">
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
      <div className="px-4 pb-4">
        <ShareButton
          restaurantId={store.id}
          slug={store.slug}
          text={`${offer.title} بـ ${offer.offer_price} ${CURRENCY_SYMBOL} عند ${store.name} على ألف سوق`}
          label="شارك العرض"
          className="btn btn-secondary btn-sm btn-block"
        />
      </div>
    </div>
  )
}
