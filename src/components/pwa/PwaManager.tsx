'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
// Imported here so install events are captured on every page, not only where a button shows
import '@/utils/pwaInstall'
import { isInstalledApp } from '@/utils/appMode'
import { logAppEventOnce } from '@/utils/appEvents'

export default function PwaManager() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // The service worker itself is registered by a small script in the root layout, as the page arrives
    const isAdmin = window.location.hostname.startsWith('admin.') || window.location.pathname.startsWith('/admin')

    // The customers' app only: the store panel is an app of its own and isn't counted here
    const isPanel = window.location.hostname.startsWith('partner.') || /^\/(dashboard|restaurant-panel)/.test(window.location.pathname)
    if (!isAdmin && !isPanel && isInstalledApp()) {
      // Counted the first time it opens as an app on this phone, which works on iPhones too
      logAppEventOnce('install', 'alfsouq_app_counted', true)
      logAppEventOnce('app_open', 'alfsouq_app_open_counted')
    }

    const update = () => setIsOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div dir="rtl" role="status" className="fixed bottom-0 inset-x-0 z-[80] bg-slate-900 text-white text-[11px] font-bold py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff size={13} className="shrink-0 text-amber-400" />
      <span>لا يوجد اتصال بالإنترنت. قد لا تكون الأسعار محدّثة.</span>
    </div>
  )
}
