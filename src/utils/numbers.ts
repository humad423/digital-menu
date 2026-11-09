// The site's one way of writing numbers: English digits everywhere, whatever the browser's language.
// Free of imports so it can be tested.

/** Turns Arabic and Persian digits into English ones and leaves everything else alone. */
export const latinDigits = (text: string): string =>
  text.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) & 0xf))

/** What someone typed in a number box, in either kind of digit, as a clean number written in English digits. */
export function numberText(text: string, allowNegative = false): string {
  const latin = latinDigits(text).replace(/[٫،,]/g, '.')
  const negative = allowNegative && latin.trimStart().startsWith('-')
  const [whole, ...decimals] = latin.replace(/[^\d.]/g, '').split('.')
  const digits = decimals.length ? `${whole}.${decimals.join('')}` : whole
  return negative ? `-${digits}` : digits
}

/** For showing dates and times: Arabic words, English digits, the everyday calendar. */
export const DATE_LOCALE = 'ar-EG-u-nu-latn'

/** A number with thousands separated, in English digits. */
export const formatNumber = (value: number): string => value.toLocaleString('en-US')
