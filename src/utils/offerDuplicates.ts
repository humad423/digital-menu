/** The four product slots of a bundle, in the columns that store them. */
const SLOTS = [
  ['primary_item_id', 'min_quantity'],
  ['bonus_item_id', 'bonus_quantity'],
  ['item3_id', 'item3_quantity'],
  ['item4_id', 'item4_quantity'],
] as const

type Bundle = { id?: string; title?: string | null; is_active?: boolean | null } & Partial<Record<(typeof SLOTS)[number][number], string | number | null>>

/** The products in a bundle and how many of each, in any order. Empty when it has none. */
export function bundleProducts(bundle: Bundle): string {
  const counts = new Map<string, number>()
  for (const [item, quantity] of SLOTS) {
    const id = bundle[item]
    if (id) counts.set(String(id), (counts.get(String(id)) ?? 0) + (Number(bundle[quantity]) || 1))
  }
  return [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([id, amount]) => `${id}x${amount}`).join(',')
}

/** So "حلاوة الجبنة" and "حلاوة  الجبنه" count as the same name. */
export const comparableName = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Why this bundle would repeat another one of the store, or null when it doesn't.
 * Hidden bundles count too. When editing, only what changed is checked, so an older pair can still be fixed.
 */
export function duplicateBundleMessage(bundle: Bundle, others: Bundle[], editing?: Bundle | null): string | null {
  const products = bundleProducts(bundle)
  const checkProducts = !editing || products !== bundleProducts(editing)
  const checkTitle = !editing || comparableName(bundle.title) !== comparableName(editing.title)

  for (const other of others) {
    if (editing?.id && other.id === editing.id) continue
    const hidden = other.is_active === false
    if (checkProducts && products && bundleProducts(other) === products) {
      return `عندك بكج فيه نفس المنتجات: «${other.title}»${hidden ? '، وهو مخفي حالياً. أظهره أو عدّله' : '. عدّله'} بدل ما تعمل واحد جديد.`
    }
    if (checkTitle && comparableName(bundle.title) && comparableName(other.title) === comparableName(bundle.title)) {
      return `في بكج تاني اسمه «${other.title}»${hidden ? ' (مخفي)' : ''}. اختار اسم مختلف.`
    }
  }
  return null
}
