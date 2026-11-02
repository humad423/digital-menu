import Link from 'next/link'
import { getDeliveryFeeForDistance } from '@/utils/distance'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { getStoreStatus } from '@/utils/storeStatus'
import { CURRENCY_SYMBOL } from '@/config/site'

function deliveryText(store: any): string {
  if (store.has_delivery === false) return 'استلام من المتجر فقط'
  if (store.distance === null) return 'يوجد توصيل'
  const info = getDeliveryFeeForDistance(store.distance, store.delivery_tiers, store.delivery_radius_km)
  if (!info.available) return 'خارج نطاق التوصيل'
  if (!info.hasTiers) return 'يوجد توصيل'
  return info.fee === 0 ? 'توصيل مجاني' : `التوصيل ${info.fee} ${CURRENCY_SYMBOL}`
}

/** Rendered only in the browser: open/closed depends on the current time. */
export default function StoreCard({ store }: { store: any }) {
  const status = getStoreStatus(store)
  const image = store.cover_url || store.logo_url

  return (
    <Link href={`/m/${store.slug}`} prefetch={false} className="card text-ink no-underline">
      {image && (
        <img
          src={getOptimizedImageUrl(image, 640)}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full h-36 object-cover bg-slate-200"
        />
      )}
      <div className="p-4">
        <h3 className="text-lg font-black leading-snug">{store.name}</h3>

        <p className="mt-1 font-bold">
          <span className={status.isOpen ? 'text-whatsapp' : 'text-red-700'}>{status.statusText}</span>
          {status.subText && <span className="text-muted font-medium"> · {status.subText}</span>}
        </p>

        <p className="text-muted font-medium">
          {store.distance !== null && <>يبعد {store.distance < 1 ? 'أقل من 1' : store.distance.toFixed(1)} كم · </>}
          {deliveryText(store)}
        </p>

        <span className="btn btn-secondary btn-block mt-3">
          {store.store_type === 'supermarket' ? 'عرض العروض' : 'عرض المنتجات والأسعار'}
        </span>
      </div>
    </Link>
  )
}
