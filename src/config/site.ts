export const SITE_URL = 'https://alfsouq.com'
export const SITE_NAME = 'ألف سوق'
export const SITE_SLOGAN = 'كل السوق في جوالك'
export const PARTNER_URL = 'https://partner.alfsouq.com'

export const SUPPORT_WHATSAPP = '905352574134'
export const CURRENCY_SYMBOL = '₺'
// Each store's hours are read in its own zone, whatever the visitor's device is set to. New stores start on this one.
export const STORE_TIMEZONE = 'Europe/Istanbul'

// Zones an admin can pick for a store. Named zones rather than fixed offsets, so summer time is handled.
export const STORE_TIMEZONES = [
  { value: 'Europe/Istanbul', label: 'تركيا' },
  { value: 'Asia/Damascus', label: 'سوريا' },
  { value: 'Asia/Beirut', label: 'لبنان' },
  { value: 'Asia/Amman', label: 'الأردن' },
  { value: 'Asia/Baghdad', label: 'العراق' },
  { value: 'Asia/Riyadh', label: 'السعودية' },
  { value: 'Asia/Dubai', label: 'الإمارات' },
  { value: 'Africa/Cairo', label: 'مصر' },
  { value: 'Europe/Berlin', label: 'ألمانيا' },
]

export function supportWhatsappUrl(message?: string): string {
  const base = `https://wa.me/${SUPPORT_WHATSAPP}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}
