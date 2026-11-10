'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { notifyError } from '@/utils/notify'
import { OFFER_ALERTS_CHANGED, readAlertsState, turnOffAlerts, turnOnAlerts, type AlertsState } from '@/utils/offerAlerts'

type State = AlertsState | 'loading'

/** Lets a visitor hear about offers from stores near them. Nothing is asked until they press the button. */
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

  const turnOff = async () => {
    setState('loading')
    await turnOffAlerts()
    setState('off')
  }

  if (state === 'unsupported' || state === 'loading') return null

  if (state === 'blocked') {
    return <p className="notice notice-info">الإشعارات متوقفة من إعدادات المتصفح. يمكنك تشغيلها من هناك متى أردت.</p>
  }

  return (
    <aside className="card p-4 space-y-3">
      <p className="font-bold">
        {state === 'on' ? 'ستصلك إشعارات بعروض المتاجر القريبة منك.' : 'هل تريد أن نعلمك بعروض المتاجر القريبة منك؟'}
      </p>
      {state === 'on' ? (
        <button type="button" onClick={turnOff} className="btn btn-secondary btn-sm">
          <BellOff size={16} className="shrink-0" />
          <span>إيقاف الإشعارات</span>
        </button>
      ) : (
        <button type="button" onClick={turnOn} className="btn btn-primary btn-block">
          <Bell size={18} className="shrink-0" />
          <span>نعم، أعلمني</span>
        </button>
      )}
    </aside>
  )
}
