'use client'

import { Share2 } from 'lucide-react'
import { SITE_URL } from '@/config/site'
import { logAppEvent } from '@/utils/appEvents'

/**
 * Sends a store's page to someone, through the phone's own share sheet when it has one,
 * or straight to WhatsApp. Visits that come from it are counted as shares.
 */
export default function ShareButton({
  restaurantId,
  slug,
  text,
  className = 'btn btn-secondary',
  label = 'شارك',
  iconOnly = false,
}: {
  restaurantId: string
  slug: string
  text: string
  className?: string
  label?: string
  /** Just the icon, with the label read out to screen readers */
  iconOnly?: boolean
}) {
  const share = async () => {
    const url = `${SITE_URL}/m/${slug}?source=share`
    logAppEvent('share', restaurantId)
    if (navigator.share) {
      try {
        await navigator.share({ text, url })
        return
      } catch (error) {
        // Closing the share sheet isn't a failure
        if ((error as Error)?.name === 'AbortError') return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <button type="button" onClick={share} className={className} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
      <Share2 size={18} className="shrink-0" />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}
