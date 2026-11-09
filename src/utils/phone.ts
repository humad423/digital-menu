/**
 * Normalizes phone numbers:
 * - Strips all hidden Unicode directional marks (LTR, RTL, isolates, zero-width chars)
 * - Strips spaces, dashes, parentheses, dots
 * - Handles duplicate country codes (e.g. +90+90, +9090, 9090)
 * - Handles leading zeros (e.g. 0535... -> +90535...)
 * - Returns clean E.164 format (e.g. +905352574134)
 */
export function normalizePhoneNumber(phone: string | null | undefined, defaultCountryCode = '90'): string {
  if (!phone) return ''

  // 1. Remove all Unicode bidirectional / invisible characters and formatting
  const clean = phone
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .trim()
    .replace(/[\s\-\(\)\.]/g, '')

  if (!clean) return ''

  const cc = defaultCountryCode.replace(/[^0-9]/g, '') || '90'
  const hasPlus = clean.startsWith('+')
  let digits = clean.replace(/[^0-9]/g, '')

  if (!digits) return ''

  // 2. Remove leading double zeros (e.g. 0090... -> 90...)
  if (digits.startsWith('00')) {
    digits = digits.replace(/^00+/, '')
  }

  // 3. Remove repetitive duplicate country code patterns (e.g. 90905348442389 -> 905348442389)
  while (cc && digits.length > cc.length * 2 && digits.startsWith(cc + cc)) {
    digits = digits.slice(cc.length)
  }

  // 4. If starts with 0 (e.g. 05348442389), remove leading zero
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '')
  }

  // 5. If digits don't start with country code (e.g. 10 digits 5348442389 or without +), prepend country code
  if (cc && !digits.startsWith(cc) && (digits.length === 10 || !hasPlus)) {
    digits = cc + digits
  }

  // 6. Final safety check for duplicate country code
  while (cc && digits.length > cc.length * 2 && digits.startsWith(cc + cc)) {
    digits = digits.slice(cc.length)
  }

  return '+' + digits
}

/**
 * Finds the one store whose WhatsApp number is exactly this phone number.
 * Returns null when no store matches, or when several do and the owner is ambiguous.
 */
export function findStoreIdByPhone(
  stores: { id: string; whatsapp_number: string | null }[],
  phone: string
): string | null {
  const target = normalizePhoneNumber(phone)
  if (target.length < 9) return null

  const matches = stores.filter(store => normalizePhoneNumber(store.whatsapp_number) === target)
  return matches.length === 1 ? matches[0].id : null
}

/** The numbers that manage a store, cleaned, without blanks or repeats. */
export function managerPhones(phones: (string | null | undefined)[]): string[] {
  return [...new Set(phones.map(phone => normalizePhoneNumber(phone)).filter(phone => phone.length >= 9))]
}

/**
 * Returns a clean readable string or empty string
 */
export function formatPhoneDisplay(phone: string | null | undefined, defaultCountryCode = '90'): string {
  if (!phone) return ''
  const norm = normalizePhoneNumber(phone, defaultCountryCode)
  return norm || phone.trim()
}

export const COUNTRY_CODES = [
  { code: '+90', name: 'تركيا' },
  { code: '+963', name: 'سوريا' },
  { code: '+961', name: 'لبنان' },
  { code: '+962', name: 'الأردن' },
  { code: '+964', name: 'العراق' },
  { code: '+966', name: 'السعودية' },
  { code: '+971', name: 'الإمارات' },
  { code: '+965', name: 'الكويت' },
]

const DEFAULT_COUNTRY_CODE = COUNTRY_CODES[0].code

/** Splits a full number into its country code and the rest, for showing in two boxes. */
export function splitPhone(value: string | null | undefined): { code: string; local: string } {
  const digits = (value || '').replace(/\D/g, '').replace(/^00/, '')
  if (!(value || '').trim().startsWith('+') && !(value || '').trim().startsWith('00')) {
    return { code: DEFAULT_COUNTRY_CODE, local: digits.replace(/^0+/, '') }
  }
  const country = COUNTRY_CODES.find(candidate => digits.startsWith(candidate.code.slice(1)))
  if (country) return { code: country.code, local: digits.slice(country.code.length - 1) }
  // An unknown country: keep its first digits as the code, so nothing is lost
  return { code: `+${digits.slice(0, 3)}`, local: digits.slice(3) }
}

/**
 * Builds the full number. A leading zero is dropped, and a number pasted with its
 * own code (+963..., 00963...) keeps that code instead of getting a second one.
 */
export function joinPhone(code: string, local: string): string {
  const typed = local.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\s\-().]/g, '')
  if (typed.startsWith('+') || typed.startsWith('00')) {
    const pasted = splitPhone(typed)
    return pasted.local ? `${pasted.code}${pasted.local}` : ''
  }
  const digits = typed.replace(/\D/g, '').replace(/^0+/, '')
  return digits ? `${code}${digits}` : ''
}
