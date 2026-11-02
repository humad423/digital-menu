'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, PlusSquare, Share, X } from 'lucide-react'
import { promptInstall, useInstallAvailability } from '@/utils/pwaInstall'

const STYLES = {
  // Sits in the customer header
  header: 'flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-200 text-[11px] font-bold transition',
  // Sits with the store panel's action buttons
  panel: 'px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0',
  // Text link, for footers
  link: 'inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-orange-400 transition',
  // Solid button inside a card
  solid: 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition active:scale-95',
}

export function IosInstallGuide({ appName, onClose }: { appName: string; onClose: () => void }) {
  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-label={`تثبيت ${appName}`} className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl text-right">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">تثبيت {appName} على الآيفون</h3>
          <button onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <ol className="space-y-3 text-xs font-bold text-slate-700">
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Share size={16} /></span>
            <span>اضغط زر المشاركة في متصفح Safari</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"><PlusSquare size={16} /></span>
            <span>اختر «إضافة إلى الشاشة الرئيسية»</span>
          </li>
        </ol>

        <button onClick={onClose} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs py-3 rounded-2xl transition">
          تمام
        </button>
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
        <Download size={13} className="shrink-0" />
        <span>{label}</span>
      </button>
      {showGuide && <IosInstallGuide appName={appName} onClose={() => setShowGuide(false)} />}
    </>
  )
}
