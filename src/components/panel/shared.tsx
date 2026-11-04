'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export interface PanelStore {
  restaurantId: string
  restaurant: any
  categories: any[]
  menuItems: any[]
  offers: any[]
  /** Reloads everything from the database after a change. */
  refresh: () => Promise<void>
  /** False, with a message, when a suspended store tries to change something. */
  canEdit: () => boolean
}

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {}
  }
  return []
}

/** A form or a question that takes over the screen on phones and sits centered on big screens. */
export function FormSheet({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center"
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
    >
      <div role="dialog" aria-label={title} className={`bg-white w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} h-[100dvh] sm:h-auto sm:max-h-[90dvh] flex flex-col sm:rounded-2xl overflow-hidden`}>
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-line shrink-0">
          <h2 className="section-title min-w-0">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm shrink-0">
            <X size={16} />
            <span>إغلاق</span>
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4">{children}</div>
        {footer && <div className="p-4 border-t border-line space-y-2 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 min-h-12 cursor-pointer font-bold">
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className="w-6 h-6 accent-[var(--color-brand)] shrink-0"
      />
      <span>{label}</span>
    </label>
  )
}
