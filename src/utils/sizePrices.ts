// Kept free of imports so the tests can load it directly.

/** One size a product sells in, with its own price, like a cake for 12 people. */
export interface SizePrice {
  name: string
  price: number
}

/** A size row as the owner types it in the panel. */
export interface SizeRow {
  name: string
  price: string
}

function readList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {}
  }
  return []
}

/** A product's sizes that each have a price. Plain size names, as clothing has, aren't among them. */
export function readSizePrices(value: unknown): SizePrice[] {
  return readList(value).flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const { name, price } = entry as { name?: unknown; price?: unknown }
    return typeof name === 'string' && name.trim() && Number(price) > 0 ? [{ name: name.trim(), price: Number(price) }] : []
  })
}

/** A product's plain size names, which all share its one price. */
export function readPlainSizes(value: unknown): string[] {
  return readList(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

/** The cheapest size's price, which the product shows as its own. */
export const lowestSizePrice = (sizes: SizePrice[]): number => Math.min(...sizes.map(size => size.price))

/** The rows the owner typed, checked and tidied. Empty rows are skipped; a half-filled one is a problem to fix. */
export function cleanSizeRows(rows: SizeRow[]): { sizes: SizePrice[]; problem?: string } {
  const sizes: SizePrice[] = []
  for (const row of rows) {
    const name = row.name.trim()
    const price = Number(String(row.price).replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660)))
    if (!name && !row.price.trim()) continue
    if (!name) return { sizes, problem: 'اكتب اسم كل مقاس له سعر.' }
    if (!(price > 0)) return { sizes, problem: `اكتب سعر المقاس «${name}».` }
    if (sizes.some(size => size.name === name)) return { sizes, problem: `المقاس «${name}» مكتوب مرتين.` }
    sizes.push({ name, price })
  }
  return { sizes }
}
