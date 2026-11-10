'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import { createClient } from '@/utils/supabase/client'
import { formatNumber } from '@/utils/numbers'
import { notifyError, notifySuccess } from '@/utils/notify'

type AudienceKind = 'all' | 'store' | 'type' | 'category'
type LinkKind = 'home' | 'offers' | 'store' | 'type' | 'category'

const AUDIENCES: { kind: AudienceKind; label: string }[] = [
  { kind: 'all', label: 'كل المشتركين' },
  { kind: 'store', label: 'القريبون من متجر' },
  { kind: 'type', label: 'القريبون من متاجر نوع معيّن' },
  { kind: 'category', label: 'القريبون من مطاعم تصنيف معيّن' },
]

const LINKS: { kind: LinkKind; label: string }[] = [
  { kind: 'offers', label: 'صفحة العروض' },
  { kind: 'home', label: 'الصفحة الرئيسية' },
  { kind: 'store', label: 'صفحة المتجر المختار' },
  { kind: 'type', label: 'الرئيسية على النوع المختار' },
  { kind: 'category', label: 'الرئيسية على التصنيف المختار' },
]

/** Ready-made wording to start from; everything stays editable. */
const TEMPLATES: { label: string; title: string; body: string; audience: AudienceKind; link: LinkKind }[] = [
  { label: 'عروض اليوم', title: 'شو في عروض اليوم؟', body: 'شوف عروض المتاجر القريبة منك اليوم على ألف سوق.', audience: 'all', link: 'offers' },
  { label: 'متجر جديد', title: 'متجر جديد قريب منك', body: 'صار عنا متجر جديد على ألف سوق، شوف منتجاته وأسعاره.', audience: 'store', link: 'store' },
  { label: 'عرض متجر', title: 'عرض جديد قريب منك', body: 'في عرض جديد بمتجر قريب منك، شوفه قبل ما يخلص.', audience: 'store', link: 'store' },
  { label: 'تصنيف', title: 'جوعان؟', body: 'شوف المطاعم القريبة منك وشو عندها اليوم.', audience: 'category', link: 'category' },
]

/** Sends a notification to the people who asked for them: everyone, or only those near a store, a kind of store or a category. */
export default function AdminPushTab({ restaurants, businessTypes, categories }: { restaurants: any[]; businessTypes: any[]; categories: any[] }) {
  const [counts, setCounts] = useState<{ all: number; located: number } | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<AudienceKind>('all')
  const [link, setLink] = useState<LinkKind>('offers')
  const [storeId, setStoreId] = useState('')
  const [radiusKm, setRadiusKm] = useState('')
  const [type, setType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [reach, setReach] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const loadCounts = async () => {
    const supabase = createClient()
    const [all, located] = await Promise.all([
      supabase.from('push_subscriptions').select('endpoint', { count: 'exact', head: true }),
      supabase.from('push_subscriptions').select('endpoint', { count: 'exact', head: true }).not('lat', 'is', null),
    ])
    setCounts({ all: all.count ?? 0, located: located.count ?? 0 })
  }

  useEffect(() => { loadCounts() }, [])

  const store = restaurants.find(candidate => candidate.id === storeId)
  const needs = (kind: 'store' | 'type' | 'category') => audience === kind || link === kind

  const audiencePayload = () => {
    if (audience === 'store') return { kind: 'store', restaurantId: storeId, radiusKm: radiusKm || null }
    if (audience === 'type') return { kind: 'type', type }
    if (audience === 'category') return { kind: 'category', categoryId }
    return { kind: 'all' }
  }

  const picked = (audience !== 'store' || storeId) && (audience !== 'type' || type) && (audience !== 'category' || categoryId)

  // How many people this would reach, worked out on the server as the choices change
  useEffect(() => {
    setReach(null)
    if (!picked) return
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dryRun: true, audience: audiencePayload() }),
        })
        const result = await response.json()
        if (response.ok) setReach(result.targets)
      } catch {}
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, storeId, radiusKm, type, categoryId])

  const url = () => {
    if (link === 'offers') return '/offers'
    if (link === 'store') return store ? `/m/${store.slug}` : null
    if (link === 'type') return type ? `/?type=${encodeURIComponent(type)}` : null
    if (link === 'category') return categoryId ? `/?category=${categoryId}` : null
    return '/'
  }

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    setTitle(template.title)
    setBody(template.body)
    setAudience(template.audience)
    setLink(template.link)
  }

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    const target = url()
    if (!target || !picked) return notifyError('اختر المتجر أو النوع أو التصنيف أولاً.')
    if (!confirm(`سيصل الإشعار إلى ${reach === null ? 'المشتركين المختارين' : `${formatNumber(reach)} شخص`}. هل تريد الإرسال؟`)) return
    setSending(true)
    try {
      const response = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, url: target, audience: audiencePayload() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'تعذر الإرسال.')
      notifySuccess(`وصل إلى ${result.sent} من ${result.targets}${result.removed ? `، وحُذف ${result.removed} لم يعودوا مشتركين` : ''}.`)
      setTitle('')
      setBody('')
      loadCounts()
    } catch (error) {
      notifyError((error as Error).message || 'تعذر الإرسال.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-4 border border-line space-y-1">
        <h2 className="section-title">الإشعارات</h2>
        <p className="font-bold">
          المشتركون: {counts ? formatNumber(counts.all) : '...'}
          {counts && <span className="text-muted"> ، منهم {formatNumber(counts.located)} حددوا موقعهم</span>}
        </p>
        <p className="text-muted font-medium">يصل الإشعار فقط لمن ضغط «نعم، أعلمني» في الموقع. لا ترسل أكثر من إشعار أو اثنين في الأسبوع حتى لا يوقفوها.</p>
      </section>

      <form onSubmit={send} className="bg-white rounded-2xl p-4 border border-line space-y-5">
        <div className="space-y-2">
          <span className="f-label">ابدأ من نموذج (اختياري)</span>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(template => (
              <button key={template.label} type="button" onClick={() => applyTemplate(template)} className="btn btn-secondary btn-sm">{template.label}</button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="push-title" className="f-label">العنوان</label>
          <input id="push-title" required maxLength={60} value={title} onChange={e => setTitle(e.target.value)} placeholder="شو في عروض اليوم؟" className="f-input" />
        </div>
        <div>
          <label htmlFor="push-body" className="f-label">النص</label>
          <textarea id="push-body" required maxLength={180} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="شوف عروض المتاجر القريبة منك اليوم على ألف سوق." className="f-input" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="push-audience" className="f-label">يصل إلى</label>
            <select id="push-audience" value={audience} onChange={e => setAudience(e.target.value as AudienceKind)} className="f-input">
              {AUDIENCES.map(option => <option key={option.kind} value={option.kind}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="push-link" className="f-label">عند الضغط يفتح</label>
            <select id="push-link" value={link} onChange={e => setLink(e.target.value as LinkKind)} className="f-input">
              {LINKS.map(option => <option key={option.kind} value={option.kind}>{option.label}</option>)}
            </select>
          </div>
        </div>

        {(needs('store') || needs('type') || needs('category')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {needs('store') && (
              <div>
                <label htmlFor="push-store" className="f-label">المتجر</label>
                <select id="push-store" required value={storeId} onChange={e => setStoreId(e.target.value)} className="f-input">
                  <option value="">اختر متجراً</option>
                  {restaurants.map(restaurant => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
                </select>
              </div>
            )}
            {audience === 'store' && (
              <div>
                <label htmlFor="push-radius" className="f-label">ضمن مسافة (كم)</label>
                <NumberInput id="push-radius" min="1" max="100" value={radiusKm} onChange={e => setRadiusKm(e.target.value)} placeholder={store?.delivery_radius_km ? `نطاق توصيله: ${store.delivery_radius_km}` : 'نطاق توصيله'} className="f-input" />
              </div>
            )}
            {needs('type') && (
              <div>
                <label htmlFor="push-type" className="f-label">نوع المتاجر</label>
                <select id="push-type" required value={type} onChange={e => setType(e.target.value)} className="f-input">
                  <option value="">اختر نوعاً</option>
                  {businessTypes.map(option => <option key={option.slug} value={option.slug}>{option.name}</option>)}
                </select>
              </div>
            )}
            {needs('category') && (
              <div>
                <label htmlFor="push-category" className="f-label">التصنيف</label>
                <select id="push-category" required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="f-input">
                  <option value="">اختر تصنيفاً</option>
                  {categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <p className="notice notice-info">
          {!picked ? 'اختر لمن يصل الإشعار لنحسب عدد من سيصلهم.' : reach === null ? 'جاري حساب عدد من سيصلهم...' : `سيصل إلى ${formatNumber(reach)} شخص.`}
          {audience !== 'all' && ' من لم يحدد موقعه لا يصله إلا ما يُرسل لكل المشتركين.'}
        </p>

        <button type="submit" disabled={sending || !picked} className="btn btn-primary">
          <Send size={16} className="shrink-0" />
          <span>{sending ? 'جاري الإرسال...' : 'إرسال الإشعار'}</span>
        </button>
      </form>
    </div>
  )
}
