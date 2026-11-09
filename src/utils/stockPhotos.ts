// Finds ready-made photos for a product by its name. Free of imports so it can be tested.

export interface StockPhoto {
  id: string
  name: string
  keywords: string[]
  image_url: string
}

const comparable = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()

/** Ready-made photos whose name, or one of its other names, appears in the product's name. */
export function matchStockPhotos(productName: string, photos: StockPhoto[]): StockPhoto[] {
  const product = comparable(productName)
  if (product.length < 2) return []
  return photos.filter(photo =>
    [photo.name, ...photo.keywords].some(term => {
      const word = comparable(term)
      return word.length >= 2 && (product.includes(word) || word.includes(product))
    }),
  )
}

/** "بيبسي، كولا لترين" as a clean list of names. */
export const readKeywords = (text: string): string[] =>
  [...new Set(text.split(/[,،\n]/).map(word => word.trim()).filter(Boolean))]
