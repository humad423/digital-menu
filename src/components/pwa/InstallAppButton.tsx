'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, PlusSquare, Share, X } from 'lucide-react'
import { promptInstall, useInstallAvailability } from '@/utils/pwaInstall'

const STYLES = {
  // Pushed to the far end of a header row, whatever else is in it
  header: 'btn btn-primary btn-sm shrink-0 ms-auto',
  panel: 'btn btn-secondary btn-sm shrink-0',
  link: 'inline-flex items-center gap-1.5 min-h-11 font-bold text-ink underline underline-offset-4',
  solid: 'btn btn-secondary btn-sm shrink-0',
  tile: 'btn btn-secondary',
}

export function IosInstallGuide({ appName, onClose }: { appName: string; onClose: () => void }) {
  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[90] bg-slate-950/60 flex items-end sm:items-center justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-label={`تثبيت ${appName}`} className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-4 text-right">
        <div className="flex items-center justify-between gap-3">
          <h3 className="section-title">تثبيت {appName}</h3>
          <button onClick={onClose} className="btn btn-secondary btn-sm shrink-0">
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>

        <ol className="space-y-3 font-bold">
          <li className="flex items-center gap-3">
            <Share size={24} className="shrink-0 text-brand" />
            <span>اضغط زر المشاركة في متصفح Safari</span>
          </li>
          <li className="flex items-center gap-3">
            <PlusSquare size={24} className="shrink-0 text-brand" />
            <span>اختر «إضافة إلى الشاشة الرئيسية»</span>
          </li>
        </ol>
      </div>
    </div>,
    document.body
  )
}

/** Renders nothing unless this device can actually install the app. */
export default function InstallAppButton({
  variant,
  appName = 'ألف سوق',
  label = 'ثبّت التطبيق',
}: {
  variant: keyof typeof STYLES
  appName?: string
  label?: string
}) {
  const availability = useInstallAvailability()
  const [showGuide, setShowGuide] = useState(false)

  if (availability === 'none' && !showGuide) return null

  return (
    <>
      <button
        type="button"
        className={STYLES[variant]}
        onClick={() => (availability === 'ios' ? setShowGuide(true) : promptInstall())}
      >
        <Download size={16} className="shrink-0" />
        <span>{label}</span>
      </button>
      {showGuide && <IosInstallGuide appName={appName} onClose={() => setShowGuide(false)} />}
    </>
  )
}
