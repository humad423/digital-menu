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
    <aside className="card p-4 space-y-3">
      <p className="font-bold">هل تريد ألف سوق على شاشتك الرئيسية؟ يفتح بلمسة واحدة.</p>
      <div className="grid grid-cols-2 gap-2">
        <InstallAppButton variant="solid" label="تثبيت" />
        <button onClick={dismiss} className="btn btn-secondary btn-sm">
          <X size={16} />
          <span>لا، شكراً</span>
        </button>
      </div>
    </aside>
  )
}
