function parseImageList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {}
  }
  return []
}

function itemImages(item: any): string[] {
  if (!item) return []
  const images = parseImageList(item.images)
  return images.length > 0 ? images : item.image_url ? [item.image_url] : []
}

/** Shapes a bundle offer like a menu item, so it can be listed and added to the cart. */
export function offerToMenuItem(offer: any) {
  const customImages = parseImageList(offer.images)
  if (customImages.length === 0 && offer.image_url) customImages.push(offer.image_url)

  const bundleImages = Array.from(
    new Set([offer.primary_item, offer.bonus_item, offer.item3, offer.item4].flatMap(itemImages))
  )
  const images = customImages.length > 0 ? customImages : bundleImages

  return {
    id: offer.id,
    name: offer.title,
    description: offer.description,
    price: offer.offer_price,
    original_price: offer.original_price,
    image_url: images[0] || offer.image_url || offer.primary_item?.image_url,
    images,
    item_images: bundleImages,
    has_custom_image: customImages.length > 0,
    primary_image_url: offer.primary_item?.image_url,
    bonus_image_url: offer.bonus_item?.image_url,
    item3_image_url: offer.item3?.image_url,
    item4_image_url: offer.item4?.image_url,
    min_quantity: offer.min_quantity,
    bonus_quantity: offer.bonus_quantity,
    is_offer: true,
  }
}
