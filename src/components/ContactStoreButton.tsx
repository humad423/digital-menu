'use client'

import { MessageCircle } from 'lucide-react'
import { publicInsert } from '@/utils/publicInsert'
import { logCampaignEvent } from '@/utils/campaign'
import { CONTACT_MESSAGE, whatsappLink } from '@/utils/whatsappMessage'

/** Opens WhatsApp with a message saying the customer came from Alfsouq, and counts the press for the store's numbers. */
export default function ContactStoreButton({ restaurantId, whatsappNumber }: { restaurantId: string; whatsappNumber: string }) {
  const countPress = () => {
    // One customer pressing twice is still one person getting in touch
    const key = `contact_pressed_${restaurantId}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {}
    // A failed count must never hold up the message
    publicInsert('contact_clicks', { restaurant_id: restaurantId }).catch(error => console.warn(error.message))
    logCampaignEvent('contact', restaurantId)
  }

  return (
    <a
      href={whatsappLink(whatsappNumber, CONTACT_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={countPress}
      className="btn btn-secondary"
    >
      <MessageCircle size={18} className="shrink-0" />
      <span>مراسلة</span>
    </a>
  )
}
