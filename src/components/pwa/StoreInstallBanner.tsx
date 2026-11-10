'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { IosInstallGuide } from '@/components/pwa/InstallAppButton'
import { promptInstall, useInstallAvailability } from '@/utils/pwaInstall'

const HIDDEN_KEY = 'alfsouq_install_banner_hidden'
const HIDDEN_DAYS = 7
// Long enough to look at the store first, so it never greets the visitor at the door
const DELAY_MS = 8_000

function hiddenRecently(): boolean {
  try {
    const hiddenAt = Number(localStorage.getItem(HIDDEN_KEY))
    return hiddenAt > 0 && Date.now() - hiddenAt < HIDDEN_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/**
 * A small card that floats in at the top of a store's page a few seconds after it opens and offers the app,
 * like the banners phones show for store apps. It sits over the page rather than pushing the menu down.
 * Only shown where the app can actually be installed; the cross hides it for a week.
 */
export default function StoreInstallBanner() {
  const availability = useInstallAvailability()
  const [hidden, setHidden] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    if (hiddenRecently()) return
    const timer = window.setTimeout(() => setHidden(false), DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const hide = () => {
    try { localStorage.setItem(HIDDEN_KEY, String(Date.now())) } catch {}
    setHidden(true)
  }

  if (showGuide) return <IosInstallGuide appName="ألف سوق" onClose={() => setShowGuide(false)} />
  if (hidden || availability === 'none') return null

  return (
    <div data-install-banner dir="rtl" className="fixed top-3 inset-x-3 z-[85] flex justify-center pointer-events-none">
      <div role="dialog" aria-label="تثبيت ألف سوق" className="pointer-events-auto w-full max-w-md bg-brand-soft border border-orange-200 rounded-2xl shadow-lg ps-3 pe-1 py-2 flex items-center gap-2 sm:gap-3">
        <img src="/icon-192.png" alt="" width={40} height={40} className="w-10 h-10 rounded-xl shrink-0 shadow-sm" />
        <div className="flex-1 min-w-0 leading-snug">
          <p className="font-black text-sm text-ink truncate">تطبيق ألف سوق</p>
          <p className="text-sm text-slate-600">المحلات القريبة بلمسة</p>
        </div>
        <button
          type="button"
          onClick={() => (availability === 'ios' ? setShowGuide(true) : promptInstall())}
          className="shrink-0 min-h-11 px-4 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-hover"
        >
          ثبّت
        </button>
        <button type="button" onClick={hide} aria-label="إخفاء" className="shrink-0 w-11 h-11 inline-flex items-center justify-center text-slate-500 hover:text-slate-700">
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
