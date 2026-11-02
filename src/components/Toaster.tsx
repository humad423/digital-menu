'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { TOAST_EVENT, type ToastDetail } from '@/utils/notify'

interface ActiveToast extends ToastDetail {
  id: number
}

let nextId = 1

export default function Toaster() {
  const [toasts, setToasts] = useState<ActiveToast[]>([])

  useEffect(() => {
    const onToast = (event: Event) => {
      const id = nextId++
      setToasts(current => [...current, { ...(event as CustomEvent<ToastDetail>).detail, id }])
      setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), 5000)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div dir="rtl" aria-live="polite" className="fixed top-4 inset-x-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-full max-w-sm flex items-start gap-2 rounded-2xl border p-3 shadow-xl text-xs font-bold ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} className="shrink-0" /> : <CheckCircle2 size={16} className="shrink-0" />}
          <span className="flex-1 leading-relaxed">{toast.message}</span>
          <button
            onClick={() => setToasts(current => current.filter(t => t.id !== toast.id))}
            aria-label="إغلاق"
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
