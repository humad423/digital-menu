'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { formatNumber } from '@/utils/numbers'

const PERIODS = [
  { days: 7, label: 'آخر 7 أيام' },
  { days: 30, label: 'آخر 30 يوم' },
] as const

const CARDS = [
  { key: 'install', label: 'ثبّتوا التطبيق وفتحوه', hint: 'أول مرة يُفتح فيها كتطبيق على هاتف' },
  { key: 'app_open', label: 'زيارات من التطبيق المثبت', hint: 'كل زيارة تُحسب مرة واحدة' },
  { key: 'home_visit', label: 'زيارات الصفحة الرئيسية', hint: 'كل زيارة تُحسب مرة واحدة' },
  { key: 'share', label: 'ضغطوا شارك', hint: 'في صفحة متجر أو عرض' },
  { key: 'share_visit', label: 'دخلوا من رابط مشاركة', hint: 'زيارات صفحات المحلات' },
  { key: 'app_store_visit', label: 'فتحوا متجراً من التطبيق', hint: 'زيارات صفحات المحلات' },
  { key: 'push_visit', label: 'فتحوا متجراً من إشعار', hint: 'زيارات صفحات المحلات' },
] as const

type Counts = Record<(typeof CARDS)[number]['key'], number | null>

/** How the app itself is used: installs, visits from it, the home page and sharing. */
export default function AdminAppStats() {
  const [days, setDays] = useState<number>(7)
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const events = (kind: string) =>
      supabase.from('app_events').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since)
    const visits = (source: string) =>
      supabase.from('qr_scans').select('id', { count: 'exact', head: true }).eq('source', source).gte('created_at', since)

    setCounts(null)
    Promise.all([events('install'), events('app_open'), events('home_visit'), events('share'), visits('share'), visits('app'), visits('push')])
      .then(([install, appOpen, home, share, shareVisit, appVisit, pushVisit]) => setCounts({
        install: install.count,
        app_open: appOpen.count,
        home_visit: home.count,
        share: share.count,
        share_visit: shareVisit.count,
        app_store_visit: appVisit.count,
        push_visit: pushVisit.count,
      }))
  }, [days])

  return (
    <section className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">التطبيق والمشاركة</h2>
        <div className="flex gap-2">
          {PERIODS.map(period => (
            <button
              key={period.days}
              type="button"
              onClick={() => setDays(period.days)}
              aria-pressed={days === period.days}
              className={`btn btn-sm ${days === period.days ? 'btn-primary' : 'btn-secondary'}`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {CARDS.map(card => (
          <div key={card.key} className="rounded-2xl border border-line p-4">
            <p className="text-sm font-black text-muted">{card.label}</p>
            <p className="text-2xl font-black text-slate-900 my-1">
              {counts === null ? '...' : counts[card.key] === null ? '--' : formatNumber(counts[card.key] ?? 0)}
            </p>
            <p className="text-sm font-bold text-muted">{card.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
