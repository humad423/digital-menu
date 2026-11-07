'use client'

import { type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { reportWriteResult } from '@/utils/notify'
import { triggerRevalidate } from '@/utils/revalidate'
import { deliveryNow, describeSpecialDay, openNow, readSpecialDays, upcomingSpecialDays } from '@/utils/schedule'

/**
 * Changes made for a while, often through the WhatsApp assistant: a day with other hours, or delivery paused.
 * Shown so the owner always knows about them, and can cancel one before it ends on its own.
 */
export default function TemporaryChanges({ store }: { store: PanelStore }) {
  const { restaurant, restaurantId, refresh, canEdit } = store
  const days = upcomingSpecialDays(restaurant)
  const paused = Date.parse(String(restaurant?.delivery_paused_until ?? '')) > Date.now()
  const closedFor = openNow({ ...restaurant, special_days: [] }).closedUntil
  if (!days.length && !paused && !closedFor) return null

  const save = async (changes: Record<string, unknown>) => {
    if (!canEdit()) return
    if (reportWriteResult(await supabase.from('restaurants').update(changes).eq('id', restaurantId))) {
      triggerRevalidate(restaurant?.slug, 'home', restaurantId)
      await refresh()
    }
  }

  const row = (key: string, text: string, cancel: () => void) => (
    <div key={key} className="flex items-center justify-between gap-3">
      <p className="font-bold leading-snug min-w-0">{text}</p>
      <button onClick={cancel} className="btn btn-secondary btn-sm shrink-0">إلغاء</button>
    </div>
  )

  return (
    <section className="card p-4 space-y-3">
      <div>
        <h2 className="section-title">تعديلات مؤقتة</h2>
        <p className="text-muted font-medium">تنتهي وحدها في وقتها، ولا تغيّر دوامك المعتاد.</p>
      </div>
      {closedFor && row('closed', `المتجر مغلق مؤقتاً، يفتح ${closedFor}`, () => save({ closed_until: null }))}
      {paused && row('pause', deliveryNow({ ...restaurant, special_days: [] }).reason || 'التوصيل متوقف', () => save({ delivery_paused_until: null }))}
      {days.map(day => row(day.date, describeSpecialDay(day, restaurant), () =>
        save({ special_days: readSpecialDays(restaurant?.special_days).filter(other => other.date !== day.date) })))}
    </section>
  )
}
