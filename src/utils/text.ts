/**
 * Makes Arabic search forgiving: treats أ/إ/آ as ا, ة as ه, ى as ي, and ignores
 * diacritics and tatweel, so "احمد" finds "أحمد" and "شاورمة" finds "شاورمه".
 */
export function normalizeForSearch(text: string | null | undefined): string {
  return (text || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .trim()
}

export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = normalizeForSearch(query)
  if (!needle) return true
  return fields.some(field => normalizeForSearch(field).includes(needle))
}
