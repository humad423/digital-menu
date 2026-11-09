// What a customer's WhatsApp message says about where they came from, so the store sees Alfsouq brought them.

export const ORDER_SOURCE_LINE = 'عبر ألف سوق'

/** The text a customer starts with when they press the message button. */
export const CONTACT_MESSAGE = 'مرحباً، رأيت متجرك على ألف سوق'

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
