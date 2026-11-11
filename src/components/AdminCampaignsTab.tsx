'use client'

import { useEffect, useState } from 'react'
import { Copy, Link2, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { SITE_URL } from '@/config/site'
import { DATE_LOCALE, formatNumber } from '@/utils/numbers'
import { notifyError, notifySuccess } from '@/utils/notify'
import { campaignLink, isCampaignCode, newCampaignCode } from '@/utils/campaign'

type Campaign = { code: string; name: string; target_path: string; created_at: string }
type Stat = { campaign_code: string; kind: string; events: number; visitors: number }

/** What each link's visitors went on to do. "people" counts each phone once; the rest count every time. */
const COLUMNS = [
  { kind: 'visit', label: 'دخلوا من الرابط', people: true },
  { kind: 'store_view', label: 'فتحوا صفحة متجر', people: false },
  { kind: 'contact', label: 'ضغطوا مراسلة', people: false },
  { kind: 'order', label: 'أرسلوا طلباً', people: false },
  { kind: 'install', label: 'ثبّتوا التطبيق', people: true },
  { kind: 'push_on', label: 'فعّلوا الإشعارات', people: true },
] as const

/** Links for ads and posts, and how many people each one brought and what they did. */
export default function AdminCampaignsTab({ restaurants }: { restaurants: any[] }) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [stats, setStats] = useState<Stat[]>([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('/')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const supabase = createClient()
    const [links, totals] = await Promise.all([
      supabase.from('campaign_links').select('code, name, target_path, created_at').order('created_at', { ascending: false }),
      supabase.rpc('campaign_stats'),
    ])
    if (links.error) notifyError('تعذر تحميل الروابط.')
    setCampaigns((links.data as Campaign[]) ?? [])
    setStats((totals.data as Stat[]) ?? [])
  }

  useEffect(() => { load() }, [])

  const count = (campaignCode: string, kind: string, people: boolean) => {
    const row = stats.find(stat => stat.campaign_code === campaignCode && stat.kind === kind)
    return row ? Number(people ? row.visitors : row.events) : 0
  }

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const chosen = code.trim().toLowerCase() || newCampaignCode()
    if (!isCampaignCode(chosen)) return notifyError('رمز الرابط: أحرف إنجليزية صغيرة وأرقام وشرطة فقط، من 2 إلى 32.')
    setSaving(true)
    const { error } = await createClient().from('campaign_links').insert({ code: chosen, name: name.trim(), target_path: target })
    setSaving(false)
    if (error) return notifyError(error.code === '23505' ? 'هذا الرمز مستخدم لرابط آخر، اختر غيره.' : 'تعذر إنشاء الرابط.')
    setName('')
    setCode('')
    notifySuccess('تم إنشاء الرابط. انسخه وضعه في الإعلان.')
    load()
  }

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link)
      notifySuccess('تم نسخ الرابط.')
    } catch {
      notifyError('تعذر النسخ، انسخ الرابط يدوياً.')
    }
  }

  const remove = async (campaign: Campaign) => {
    if (!confirm(`حذف رابط «${campaign.name}»؟ ستُحذف أرقامه أيضاً، ولن يُحسب من يدخل منه بعد الآن.`)) return
    const { error } = await createClient().from('campaign_links').delete().eq('code', campaign.code)
    if (error) return notifyError('تعذر الحذف.')
    load()
  }

  const targetLabel = (path: string) => {
    if (path === '/') return 'الصفحة الرئيسية'
    if (path === '/offers') return 'صفحة العروض'
    const store = restaurants.find(r => `/m/${r.slug}` === path)
    return store ? store.name : path
  }

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-2xl p-4 border border-line space-y-1">
        <h2 className="section-title">روابط الحملات</h2>
        <p className="text-muted font-medium">
          اعمل رابطاً مختلفاً لكل إعلان أو منشور، وضعه فيه. كل من يدخل منه يُحسب له لمدة 30 يوماً: إن فتح متجراً أو راسل أو طلب أو ثبّت التطبيق بعد أيام، يُحسب لنفس الرابط.
        </p>
      </section>

      <form onSubmit={create} className="bg-white rounded-2xl p-4 border border-line space-y-4">
        <div>
          <label htmlFor="campaign-name" className="f-label">اسم الرابط (لك فقط)</label>
          <input id="campaign-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="مثال: إعلان فيسبوك، حلويات اريحا، تشرين" className="f-input" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="campaign-target" className="f-label">يفتح على</label>
            <select id="campaign-target" value={target} onChange={e => setTarget(e.target.value)} className="f-input">
              <option value="/">الصفحة الرئيسية</option>
              <option value="/offers">صفحة العروض</option>
              {restaurants.filter(r => r.slug).map(r => <option key={r.id} value={`/m/${r.slug}`}>متجر: {r.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="campaign-code" className="f-label">رمز الرابط (اختياري)</label>
            <input id="campaign-code" dir="ltr" maxLength={32} value={code} onChange={e => setCode(e.target.value)} placeholder="يُنشأ تلقائياً، مثل fb-nov" className="f-input text-left" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary">
          <Link2 size={18} className="shrink-0" />
          <span>{saving ? 'جاري الإنشاء...' : 'أنشئ الرابط'}</span>
        </button>
      </form>

      {campaigns === null ? (
        <p className="text-muted font-bold">جاري التحميل...</p>
      ) : campaigns.length === 0 ? (
        <p className="notice notice-info">لا توجد روابط بعد. أنشئ أول رابط لإعلانك من الأعلى.</p>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => {
            const link = campaignLink(SITE_URL, campaign.target_path, campaign.code)
            return (
              <article key={campaign.code} className="bg-white rounded-2xl p-4 border border-line space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-lg">{campaign.name}</h3>
                    <p className="text-sm text-muted font-bold">
                      {targetLabel(campaign.target_path)} · أُنشئ {new Date(campaign.created_at).toLocaleDateString(DATE_LOCALE)}
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(campaign)} className="btn btn-secondary btn-sm" aria-label={`حذف ${campaign.name}`}>
                    <Trash2 size={16} className="shrink-0" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code dir="ltr" className="flex-1 min-w-0 truncate rounded-xl bg-slate-50 border border-line px-3 py-2 text-sm">{link}</code>
                  <button type="button" onClick={() => copy(link)} className="btn btn-secondary btn-sm shrink-0">
                    <Copy size={16} className="shrink-0" />
                    <span>نسخ</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {COLUMNS.map(column => (
                    <div key={column.kind} className="rounded-xl border border-line p-3">
                      <p className="text-sm font-bold text-muted">{column.label}</p>
                      <p className="text-xl font-black text-slate-900">{formatNumber(count(campaign.code, column.kind, column.people))}</p>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
