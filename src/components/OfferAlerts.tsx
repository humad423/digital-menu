'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { notifyError } from '@/utils/notify'
import { OFFER_ALERTS_CHANGED, readAlertsState, turnOnAlerts, type AlertsState } from '@/utils/offerAlerts'

type State = AlertsState | 'loading'

/**
 * Invites a visitor to hear about offers from stores near them. Once they hear about them it disappears:
 * there is no switch here to turn them off (the phone's own settings still can).
 */
export default function OfferAlerts() {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    const refresh = () => { readAlertsState().then(setState) }
    refresh()
    window.addEventListener(OFFER_ALERTS_CHANGED, refresh)
    return () => window.removeEventListener(OFFER_ALERTS_CHANGED, refresh)
  }, [])

  const turnOn = async () => {
    setState('loading')
    try {
      setState(await turnOnAlerts())
    } catch {
      notifyError('تعذر تشغيل الإشعارات. حاول مرة أخرى.')
      setState('off')
    }
  }

  if (state === 'unsupported' || state === 'loading' || state === 'on') return null

  if (state === 'blocked') {
    return (
      <aside className="card p-4 space-y-1">
        <p className="font-bold">لا تفوّت عروض المتاجر القريبة منك</p>
        <p className="text-sm text-slate-600">الإشعارات متوقفة على هاتفك. شغّلها من إعدادات المتصفح أو التطبيق لتصلك العروض أولاً بأول.</p>
      </aside>
    )
  }

  return (
    <aside className="card p-4 space-y-3">
      <div>
        <p className="font-bold">لا تفوّت عروض المتاجر القريبة منك</p>
        <p className="text-sm text-slate-600">نرسل لك العروض والخصومات الجديدة أولاً بأول.</p>
      </div>
      <button type="button" onClick={turnOn} className="btn btn-primary btn-block">
        <Bell size={18} className="shrink-0" />
        <span>فعّل الإشعارات</span>
      </button>
    </aside>
  )
}
