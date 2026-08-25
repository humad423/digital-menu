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
  let clean = phone
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
 * Returns a clean readable string or empty string
 */
export function formatPhoneDisplay(phone: string | null | undefined, defaultCountryCode = '90'): string {
  if (!phone) return ''
  const norm = normalizePhoneNumber(phone, defaultCountryCode)
  return norm || phone.trim()
}
