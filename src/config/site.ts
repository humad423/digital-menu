export const SITE_URL = 'https://alfsouq.com'
export const SITE_NAME = 'ألف سوق'

export const SUPPORT_WHATSAPP = '905352574134'
export const CURRENCY_SYMBOL = '₺'
// Store hours are always read in this zone, whatever the visitor's device is set to
export const STORE_TIMEZONE = 'Europe/Istanbul'

export function supportWhatsappUrl(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
