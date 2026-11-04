export interface ColorOption {
  name: string
  hex: string
}

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '36', '38', '40', '42', '44', '46']

export const COLOR_OPTIONS: ColorOption[] = [
  { name: 'أسود', hex: '#111827' },
  { name: 'أبيض', hex: '#FFFFFF' },
  { name: 'رمادي', hex: '#9CA3AF' },
  { name: 'بيج', hex: '#E7D8C0' },
  { name: 'بني', hex: '#7C4A21' },
  { name: 'أحمر', hex: '#DC2626' },
  { name: 'وردي', hex: '#F472B6' },
  { name: 'برتقالي', hex: '#F97316' },
  { name: 'أصفر', hex: '#FACC15' },
  { name: 'أخضر', hex: '#16A34A' },
  { name: 'أزرق', hex: '#2563EB' },
  { name: 'كحلي', hex: '#1E3A5F' },
  { name: 'بنفسجي', hex: '#7C3AED' },
]

/** So "احمر" and "أحمر", or "s" and "S", count as the same choice. */
const comparable = (value: string) =>
  value.trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')

const sameOption = (a: string, b: string) => comparable(a) === comparable(b)

/** Ready-made choices in their usual order, then anything the owner added. */
export function orderOptions(selected: string[], presets: string[]): string[] {
  const chosen = presets.filter(preset => selected.some(value => sameOption(value, preset)))
  const others = selected.filter(value => !presets.some(preset => sameOption(value, preset)))
  return [...chosen, ...others]
}

export function toggleOption(selected: string[], option: string): string[] {
  return selected.some(value => sameOption(value, option))
    ? selected.filter(value => !sameOption(value, option))
    : [...selected, option]
}

/** Adds what the owner typed, which may hold several values separated by commas. */
export function addOptions(selected: string[], typed: string, presets: string[]): string[] {
  const next = [...selected]
  for (const part of typed.split(/[,،]/).map(value => value.trim()).filter(Boolean)) {
    if (next.some(value => sameOption(value, part))) continue
    next.push(presets.find(preset => sameOption(preset, part)) ?? part)
  }
  return next
}
