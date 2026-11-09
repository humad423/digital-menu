'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getBusinessDayStart } from '@/utils/visitsHelper'

const PERIODS = [
  { key: 'today', label: 'اليوم', days: 0 },
  { key: 'week', label: 'آخر 7 أيام', days: 7 },
  { key: 'month', label: 'آخر 30 يوماً', days: 30 },
] as const

type PeriodKey = (typeof PERIODS)[number]['key']
interface Numbers { visits: number; contacts: number; orders: number }

function startOf(period: PeriodKey): string {
  const days = PERIODS.find(item => item.key === period)!.days
  return (days === 0 ? getBusinessDayStart() : new Date(Date.now() - days * 86_400_000)).toISOString()
}

/** Shows the owner the real movement on their menu: who visited, who got in touch, and who sent an order. */
export default function StoreStats({ restaurantId }: { restaurantId: string }) {
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [numbers, setNumbers] = useState<Numbers | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true
    const since = startOf(period)
    const count = (table: 'qr_scans' | 'contact_clicks' | 'orders') =>
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', since)

    setNumbers(null)
    setFailed(false)
    Promise.all([count('qr_scans'), count('contact_clicks'), count('orders')]).then(([visits, contacts, orders]) => {
      if (!current) return
      if (visits.error || contacts.error || orders.error) {
        setFailed(true)
        return
      }
      setNumbers({ visits: visits.count ?? 0, contacts: contacts.count ?? 0, orders: orders.count ?? 0 })
    })
    return () => { current = false }
  }, [restaurantId, period])

  const stats = [
    { label: 'زاروا المنيو', value: numbers?.visits },
    { label: 'ضغطوا مراسلة', value: numbers?.contacts },
    { label: 'أرسلوا طلباً', value: numbers?.orders },
  ]

  return (
    <section className="card p-4 space-y-3">
      <h2 className="section-title">حركة متجرك</h2>

      <div role="tablist" aria-label="الفترة" className="grid grid-cols-3 gap-2">
        {PERIODS.map(item => (
          <button
            key={item.key}
            role="tab"
            aria-selected={period === item.key}
            aria-pressed={period === item.key}
            onClick={() => setPeriod(item.key)}
            className="chip"
          >
            {item.label}
          </button>
        ))}
      </div>

      {failed ? (
        <p className="notice notice-warn">تعذر تحميل الأرقام. حاول مرة أخرى.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          {stats.map(stat => (
            <div key={stat.label} className="border border-line rounded-xl p-2 min-w-0">
              <p className="text-2xl font-black">{stat.value ?? '…'}</p>
              <p className="text-muted font-medium text-sm leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
