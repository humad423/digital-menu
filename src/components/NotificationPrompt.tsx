'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, X } from 'lucide-react'
import { notifyError } from '@/utils/notify'
import { readAlertsState, syncAlerts, turnOnAlerts } from '@/utils/offerAlerts'

const LATER_KEY = 'alfsouq_alerts_later'
// Asked again soon: hearing about offers is what keeps people coming back
const LATER_DAYS = 3
// Long enough to see what the site is before being asked anything
const DELAY_MS = 15_000

/** Pages for the team and the stores, not for customers */
function isStaffPage(pathname: string): boolean {
  if (/^(admin|partner|restaurant)[.-]/.test(window.location.hostname)) return true
  return /^\/(admin|dashboard|restaurant-panel|login)(\/|$)/.test(pathname)
}

function askedRecently(): boolean {
  try {
    const later = Number(localStorage.getItem(LATER_KEY))
    return later > 0 && Date.now() - later < LATER_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/**
 * A small banner that invites a visitor to hear about offers. The browser's own question only appears
 * after they press yes, because browsers hide sites that ask without a tap. "Later" waits three days.
 *
 * It also makes sure a phone that allows notifications in any way (this banner, the phone's settings,
 * the installed app) is saved, so offers reach it without any tap.
 */
export default function NotificationPrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  // Saved as soon as notifications are allowed: on opening, on coming back from the settings, or the moment it changes
  useEffect(() => {
    if (isStaffPage(window.location.pathname)) return
    syncAlerts()
    const onReturn = () => { if (document.visibilityState === 'visible') syncAlerts() }
    document.addEventListener('visibilitychange', onReturn)
    let status: PermissionStatus | null = null
    navigator.permissions?.query({ name: 'notifications' as PermissionName })
      .then(result => { status = result; result.onchange = () => { syncAlerts(); if (result.state === 'granted') setVisible(false) } })
      .catch(() => {})
    return () => {
      document.removeEventListener('visibilitychange', onReturn)
      if (status) status.onchange = null
    }
  }, [])

  useEffect(() => {
    if (visible || isStaffPage(pathname) || askedRecently()) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled || isStaffPage(window.location.pathname)) return
      if ((await readAlertsState()) !== 'off' || Notification.permission !== 'default') return
      if (cancelled) return
      // The app card is showing: ask on the next page instead of on top of it
      if (document.querySelector('[data-install-banner]')) return
      setVisible(true)
    }, DELAY_MS)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [pathname, visible])

  // Leaving for a staff page takes it away
  useEffect(() => {
    if (visible && isStaffPage(pathname)) setVisible(false)
  }, [pathname, visible])

  const later = () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now())) } catch {}
    setVisible(false)
  }

  const yes = async () => {
    setBusy(true)
    try {
      const state = await turnOnAlerts()
      // Saying no in the browser's own question also counts as "later"
      if (state !== 'on') later()
      setVisible(false)
    } catch {
      notifyError('تعذر تشغيل الإشعارات. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  if (!visible) return null

  return (
    <div dir="rtl" role="dialog" aria-label="إشعارات العروض" className="fixed top-3 inset-x-3 z-[90] flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-white border border-line rounded-2xl shadow-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-full bg-orange-50 text-orange-600 inline-flex items-center justify-center">
            <Bell size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">لا تفوّت عروض المتاجر القريبة منك</p>
            <p className="text-sm text-slate-600">نرسل لك العروض والخصومات الجديدة أولاً بأول.</p>
          </div>
          <button type="button" onClick={later} aria-label="إغلاق" className="shrink-0 w-11 h-11 -m-2 inline-flex items-center justify-center text-slate-500 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={yes} disabled={busy} className="btn btn-primary btn-sm">
            فعّل الإشعارات
          </button>
          <button type="button" onClick={later} disabled={busy} className="btn btn-secondary btn-sm">
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  )
}
