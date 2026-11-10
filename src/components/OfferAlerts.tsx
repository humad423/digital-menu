'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { VAPID_PUBLIC_KEY } from '@/config/push'
import { isInstalledApp, isIos } from '@/utils/appMode'
import { notifyError } from '@/utils/notify'
import { keyToBytes } from '@/utils/push'
import { readUserLocation } from '@/utils/userLocation'

type State = 'unsupported' | 'loading' | 'off' | 'on' | 'blocked'

function canNotify(): boolean {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false
  // On iPhones, only the installed app can receive notifications
  return !isIos() || isInstalledApp()
}

/** Lets a visitor hear about offers from stores near them. Nothing is asked until they press the button. */
export default function OfferAlerts() {
  const [state, setState] = useState<State>('loading')

  useEffect(() => {
    if (!canNotify()) return setState('unsupported')
    if (Notification.permission === 'denied') return setState('blocked')
    navigator.serviceWorker.ready
      .then(registration => registration.pushManager.getSubscription())
      .then(subscription => setState(subscription ? 'on' : 'off'))
      .catch(() => setState('unsupported'))
  }, [])

  const turnOn = async () => {
    setState('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setState(permission === 'denied' ? 'blocked' : 'off')
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) })
      const location = readUserLocation()
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), lat: location?.lat, lng: location?.lng }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setState('on')
    } catch {
      notifyError('تعذر تشغيل الإشعارات. حاول مرة أخرى.')
      setState('off')
    }
  }

  const turnOff = async () => {
    setState('loading')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
    } catch {}
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
