'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import InstallAppButton from '@/components/pwa/InstallAppButton'
import { useInstallAvailability } from '@/utils/pwaInstall'
import { shouldSuggestInstall } from '@/utils/installSuggestion'

const VISITS_KEY = 'alfsouq_visits'
const VISIT_COUNTED_KEY = 'alfsouq_visit_counted'
const DISMISSED_KEY = 'alfsouq_install_dismissed_at'

/** A quiet card in the page flow for returning visitors. It never floats over content. */
export default function InstallSuggestion() {
  const availability = useInstallAvailability()
  const [eligible, setEligible] = useState(false)

  useEffect(() => {
    try {
      let visits = Number(localStorage.getItem(VISITS_KEY)) || 0
      if (!sessionStorage.getItem(VISIT_COUNTED_KEY)) {
        visits += 1
        localStorage.setItem(VISITS_KEY, String(visits))
        sessionStorage.setItem(VISIT_COUNTED_KEY, 'true')
      }
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY)) || null
      setEligible(shouldSuggestInstall(visits, dismissedAt, Date.now()))
    } catch {
      setEligible(false)
    }
  }, [])

  if (!eligible || availability === 'none') return null

  const dismiss = () => {
    setEligible(false)
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {}
  }

  return (
    <aside className="bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
      <img src="/icon-192.png" alt="" width={40} height={40} className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-slate-900">ألف سوق على شاشتك الرئيسية</p>
        <p className="text-[11px] font-medium text-slate-500 truncate">افتحه بلمسة واحدة في المرة القادمة</p>
      </div>
      <InstallAppButton variant="solid" label="تثبيت" />
      <button onClick={dismiss} aria-label="إخفاء" className="text-slate-400 hover:text-slate-600 p-1 shrink-0">
        <X size={15} />
      </button>
    </aside>
  )
}
