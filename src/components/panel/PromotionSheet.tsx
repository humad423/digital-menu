'use client'

import { useMemo, useState } from 'react'
import { BadgePercent, Package, Tag } from 'lucide-react'
import NumberInput from '@/components/NumberInput'
import DateInput from '@/components/DateInput'
import TimeInput from '@/components/TimeInput'
import { CheckRow, FormSheet, type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { triggerRevalidate } from '@/utils/revalidate'
import { readSizePrices } from '@/utils/sizePrices'
import { ARABIC_DAYS } from '@/utils/schedule'
import { isPromotionOver, storeDateTime, storeMoment, type PromotionKind } from '@/utils/promotions'
import { CURRENCY_SYMBOL } from '@/config/site'

type When = 'always' | 'period' | 'weekly'

/** A discount is an amount off unless the store picks a percent */
type By = 'amount' | 'percent'

/** Quick discounts a store can tap instead of typing, by an amount or by a percent */
const QUICK = { amount: [5, 10, 20, 50], percent: [10, 15, 20, 25] }

/** A price after a discount; empty when the discount would make it free */
function off(price: number, by: By, value: number): string {
  const result = by === 'amount' ? price - value : Math.round(price * (1 - value / 100))
  return result > 0 && result < price ? String(Math.round(result * 100) / 100) : ''
}

/** Choosing between an amount off and a percent off, amount first */
function ByToggle({ by, onChange }: { by: By; onChange: (by: By) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" aria-pressed={by === 'amount'} onClick={() => onChange('amount')} className="chip">مبلغ ثابت ({CURRENCY_SYMBOL})</button>
      <button type="button" aria-pressed={by === 'percent'} onClick={() => onChange('percent')} className="chip">نسبة (%)</button>
    </div>
  )
}

/** How much off, by an amount or a percent, with quick choices to tap */
function DiscountField({ id, label, by, onBy, value, onValue }: { id: string; label: string; by: By; onBy: (by: By) => void; value: string; onValue: (value: string) => void }) {
  const unit = by === 'amount' ? CURRENCY_SYMBOL : '%'
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="field-label">{label}</label>
      <ByToggle by={by} onChange={onBy} />
      <div className="flex flex-wrap gap-2">
        {QUICK[by].map(quick => (
          <button key={quick} type="button" aria-pressed={value === String(quick)} onClick={() => onValue(String(quick))} className="chip">{quick} {unit}</button>
        ))}
      </div>
      <NumberInput id={id} inputMode="decimal" min="0" max={by === 'percent' ? '99' : undefined} placeholder={`مثلاً ${QUICK[by][1]} ${unit}`} value={value} onChange={event => onValue(event.target.value)} className="field" />
    </div>
  )
}

/** A product's prices: one, or one per size when its sizes have their own. */
function pricesOf(item: any): { size: string; price: number }[] {
  const sizes = readSizePrices(item?.sizes)
  return sizes.length ? sizes.map(size => ({ size: size.name, price: size.price })) : item ? [{ size: '', price: Number(item.price) }] : []
}

/**
 * Making or changing an offer on the store's own products, one plain step after another:
 * what kind, on what, and when. A bundle is made in its own form, which this hands over to.
 */
export default function PromotionSheet({
  store,
  promotion,
  itemId,
  onClose,
  onBundle,
}: {
  store: PanelStore
  /** The offer being changed, if any */
  promotion?: any
  /** Starts a new price cut on this product */
  itemId?: string
  onClose: () => void
  /** Opens the bundle form instead; left out where bundles aren't offered */
  onBundle?: () => void
}) {
  const { restaurantId, restaurant, categories, menuItems, offers, promotions, refresh, canEdit } = store
  const zone = restaurant?.timezone
  const start = storeDateTime(promotion?.starts_at, zone)
  const end = storeDateTime(promotion?.ends_at, zone)

  const [kind, setKind] = useState<PromotionKind | null>(promotion?.kind ?? (itemId ? 'price_cut' : null))
  const [chosenItem, setChosenItem] = useState<string>(promotion?.prices?.[0]?.item_id ?? itemId ?? '')
  const [newPrices, setNewPrices] = useState<Record<string, string>>(() =>
    Object.fromEntries((promotion?.prices ?? []).map((entry: any) => [entry.size || '', String(entry.price)])))
  const [categoryIds, setCategoryIds] = useState<string[]>(promotion?.category_ids ?? [])
  // How much off: an amount, or a percent when the store picks one; for a category offer it's what's saved
  const [by, setBy] = useState<By>(promotion?.kind === 'category_percent' ? 'percent' : 'amount')
  const [discount, setDiscount] = useState(String(promotion?.kind === 'category_percent' ? promotion.percent ?? '' : promotion?.amount ?? ''))
  const [excluded, setExcluded] = useState<string[]>(promotion?.excluded_item_ids ?? [])
  const [when, setWhen] = useState<When>(
    promotion?.days?.length || promotion?.from_time ? 'weekly' : promotion?.ends_at || promotion?.starts_at ? 'period' : 'always')
  const [startDate, setStartDate] = useState(start.date)
  const [startTime, setStartTime] = useState(start.time || '00:00')
  const [endDate, setEndDate] = useState(end.date)
  const [endTime, setEndTime] = useState(end.time || '23:55')
  const [days, setDays] = useState<number[]>(promotion?.days ?? [])
  const [fromTime, setFromTime] = useState(promotion?.from_time ?? '')
  const [untilTime, setUntilTime] = useState(promotion?.until_time ?? '')
  const [title, setTitle] = useState(promotion?.title ?? '')
  const [saving, setSaving] = useState(false)

  const item = menuItems.find(candidate => candidate.id === chosenItem)
  const itemPrices = pricesOf(item)
  const inCategories = useMemo(() => menuItems.filter(candidate => categoryIds.includes(candidate.category_id)), [menuItems, categoryIds])

  const pickItem = (id: string) => {
    setChosenItem(id)
    setNewPrices({})
  }
  // A discount typed once fills in the new price of every size, which can still be changed one by one
  const applyDiscount = (value: string, discountBy: By = by) => {
    setDiscount(value)
    const amount = parseFloat(value)
    if (kind === 'price_cut' && amount > 0) setNewPrices(Object.fromEntries(itemPrices.map(entry => [entry.size, off(entry.price, discountBy, amount)])))
  }
  const changeBy = (next: By) => {
    setBy(next)
    setDiscount('')
  }
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter(other => other !== id) : [...list, id])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit() || !kind) return

    // Offers and bundles share the store's limit, which only the Alfsouq team raises
    const limit = restaurant?.max_offers_limit || 5
    const running = promotions.filter(other => other.id !== promotion?.id && !isPromotionOver(other, new Date())).length + offers.length
    if (!promotion && running >= limit) {
      notifyError(`وصلت إلى الحد المسموح من العروض (${limit}). أوقف عرضاً قديماً أو تواصل مع الإدارة لزيادته.`)
      return
    }

    const fields: Record<string, unknown> = { kind }
    if (kind === 'price_cut') {
      if (!item) return notifyError('اختر المنتج.')
      const prices = itemPrices
        .map(entry => ({ item_id: item.id, size: entry.size || null, price: parseFloat(newPrices[entry.size] ?? ''), was: entry.price }))
        .filter(entry => entry.price > 0)
      if (!prices.length) return notifyError('اكتب سعر العرض.')
      // A real discount only: customers would otherwise see a saving that isn't there
      const tooHigh = prices.find(entry => entry.price >= entry.was)
      if (tooHigh) return notifyError(`سعر العرض${tooHigh.size ? ` لمقاس ${tooHigh.size}` : ''} لازم يكون أقل من ${tooHigh.was} ${CURRENCY_SYMBOL}.`)
      fields.prices = prices.map(({ was: _was, ...entry }) => entry)
      fields.title = title.trim() || item.name
    } else {
      const value = parseFloat(discount)
      if (!categoryIds.length) return notifyError('اختر قسماً واحداً على الأقل.')
      if (by === 'amount' && !(value > 0)) return notifyError('اكتب مبلغ الخصم.')
      if (by === 'percent' && !(value > 0 && value < 100)) return notifyError('اكتب نسبة الخصم بين 1 و 99.')
      fields.kind = by === 'amount' ? 'category_amount' : 'category_percent'
      fields.amount = by === 'amount' ? value : null
      fields.percent = by === 'percent' ? value : null
      fields.category_ids = categoryIds
      // Only products still in the chosen categories stay left out
      fields.excluded_item_ids = excluded.filter(id => inCategories.some(candidate => candidate.id === id))
      fields.title = title.trim() || `خصم ${value}${by === 'amount' ? ` ${CURRENCY_SYMBOL}` : '%'} على ${categories.filter(c => categoryIds.includes(c.id)).map(c => c.name).join(' و')}`
    }

    fields.starts_at = null
    fields.ends_at = null
    fields.days = []
    fields.from_time = null
    fields.until_time = null
    if (when === 'period') {
      const ends = storeMoment(endDate, endTime, zone)
      if (!ends) return notifyError('اختر متى ينتهي العرض.')
      const starts = startDate ? storeMoment(startDate, startTime, zone) : null
      if (Date.parse(ends) <= Date.now()) return notifyError('وقت النهاية مرّ. اختر وقتاً قادماً.')
      if (starts && Date.parse(starts) >= Date.parse(ends)) return notifyError('البداية لازم تكون قبل النهاية.')
      fields.starts_at = starts
      fields.ends_at = ends
    }
    if (when === 'weekly') {
      if (!days.length) return notifyError('اختر يوماً واحداً على الأقل.')
      if (Boolean(fromTime) !== Boolean(untilTime)) return notifyError('اختر ساعة البداية والنهاية معاً، أو اتركهما فارغتين ليكون العرض طوال اليوم.')
      if (fromTime && fromTime === untilTime) return notifyError('ساعة البداية والنهاية متشابهتين.')
      fields.days = days
      fields.from_time = fromTime || null
      fields.until_time = untilTime || null
    }

    setSaving(true)
    const result = promotion
      ? await supabase.from('promotions').update(fields).eq('id', promotion.id)
      : await supabase.from('promotions').insert([{ ...fields, restaurant_id: restaurantId }])
    setSaving(false)
    if (reportWriteResult(result, 'تعذر حفظ العرض. حاول مرة أخرى.')) {
      triggerRevalidate(restaurant?.slug, 'offers', restaurantId)
      await refresh()
      onClose()
    }
  }

  const remove = async () => {
    if (!promotion || !canEdit() || !confirm(`حذف «${promotion.title}»؟`)) return
    if (reportWriteResult(await supabase.from('promotions').delete().eq('id', promotion.id))) {
      triggerRevalidate(restaurant?.slug, 'offers', restaurantId)
      await refresh()
      onClose()
    }
  }

  // Step one: what kind of offer
  if (!kind) {
    const choice = (icon: React.ReactNode, label: string, example: string, onClick: () => void) => (
      <button type="button" onClick={onClick} className="card p-4 w-full text-start flex items-center gap-3 hover:border-brand">
        <span className="text-brand shrink-0">{icon}</span>
        <span>
          <span className="block font-black text-lg">{label}</span>
          <span className="block text-muted font-medium">{example}</span>
        </span>
      </button>
    )
    return (
      <FormSheet title="اعمل عرض" onClose={onClose}>
        <p className="font-bold">شو نوع العرض؟</p>
        {choice(<Tag size={28} />, 'تخفيض سعر منتج', 'مثلاً الكيكة صارت بـ 450 بدل 550', () => setKind('price_cut'))}
        {choice(<BadgePercent size={28} />, 'خصم على قسم كامل', 'مثلاً كل الحلويات أرخص بـ 20 ' + CURRENCY_SYMBOL, () => setKind('category_amount'))}
        {onBundle && choice(<Package size={28} />, 'بكج أو وجبة', 'مثلاً 2 شاورما + بطاطا بـ 300', onBundle)}
      </FormSheet>
    )
  }

  return (
    <FormSheet
      title={promotion ? 'تعديل العرض' : kind === 'price_cut' ? 'تخفيض سعر' : 'خصم على قسم'}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="promotion-form" disabled={saving} className="btn btn-primary btn-lg btn-block">
            {saving ? 'جاري الحفظ...' : 'حفظ العرض'}
          </button>
          {promotion && <button type="button" onClick={remove} className="btn btn-danger btn-block">حذف العرض</button>}
        </>
      }
    >
      <form id="promotion-form" onSubmit={save} className="space-y-5">
        {kind === 'price_cut' ? (
          <fieldset className="space-y-3">
            <legend className="field-label">على أي منتج؟</legend>
            <select aria-label="المنتج" value={chosenItem} onChange={event => pickItem(event.target.value)} className="field">
              <option value="">اختر المنتج</option>
              {categories.map(category => (
                <optgroup key={category.id} label={category.name}>
                  {menuItems.filter(candidate => candidate.category_id === category.id).map(candidate => (
                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {item && (
              <>
                <DiscountField
                  id="promotion-discount"
                  label={itemPrices.length > 1 ? 'قديش الخصم؟ (بيعبّي سعر كل المقاسات)' : 'قديش الخصم؟'}
                  by={by}
                  onBy={changeBy}
                  value={discount}
                  onValue={value => applyDiscount(value)}
                />
                {itemPrices.map(entry => (
                  <div key={entry.size} className="grid grid-cols-[1fr_7rem] gap-2 items-center">
                    <span className="font-bold min-w-0">
                      {entry.size || 'السعر الجديد'}
                      <span className="block text-sm text-muted font-medium">الآن {entry.price} {CURRENCY_SYMBOL}</span>
                    </span>
                    <NumberInput
                      aria-label={`سعر العرض ${entry.size}`}
                      inputMode="decimal"
                      min="0"
                      placeholder={entry.size ? 'بدون عرض' : ''}
                      value={newPrices[entry.size] ?? ''}
                      onChange={event => setNewPrices({ ...newPrices, [entry.size]: event.target.value })}
                      className="field"
                    />
                  </div>
                ))}
                {itemPrices.length > 1 && <p className="text-sm text-muted font-medium">المقاس اللي بتتركه فاضي بيضل بسعره.</p>}
              </>
            )}
          </fieldset>
        ) : (
          <fieldset className="space-y-3">
            <legend className="field-label">على أي قسم؟</legend>
            {categories.map(category => (
              <CheckRow key={category.id} label={category.name} checked={categoryIds.includes(category.id)} onChange={() => setCategoryIds(toggle(categoryIds, category.id))} />
            ))}
            <DiscountField id="promotion-discount" label="قديش الخصم على كل منتج؟" by={by} onBy={changeBy} value={discount} onValue={setDiscount} />
            {inCategories.length > 0 && (
              <details className="card p-3" open={excluded.length > 0}>
                <summary className="font-bold cursor-pointer min-h-11 flex items-center">استثني منتجات من الخصم (اختياري)</summary>
                {inCategories.map(candidate => (
                  <CheckRow key={candidate.id} label={candidate.name} checked={excluded.includes(candidate.id)} onChange={() => setExcluded(toggle(excluded, candidate.id))} />
                ))}
              </details>
            )}
          </fieldset>
        )}

        <fieldset className="space-y-3">
          <legend className="field-label">إيمتى؟</legend>
          <div className="grid grid-cols-3 gap-2">
            {([['always', 'دايماً'], ['period', 'لفترة محددة'], ['weekly', 'أيام وساعات']] as const).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={when === value} onClick={() => setWhen(value)} className="chip">{label}</button>
            ))}
          </div>

          {when === 'always' && <p className="text-muted font-medium">العرض شغّال لحتى توقفه انت.</p>}

          {when === 'period' && (
            <div className="space-y-3">
              <div>
                <span className="field-label">يبدأ (اتركه فاضي ليبدأ هلق)</span>
                <div className="flex flex-wrap gap-2">
                  <DateInput upcoming value={startDate} onChange={setStartDate} className="field !w-auto" />
                  <div className="flex-1 min-w-[10rem]"><TimeInput value={startTime} onChange={setStartTime} /></div>
                </div>
              </div>
              <div>
                <span className="field-label">ينتهي</span>
                <div className="flex flex-wrap gap-2">
                  <DateInput upcoming value={endDate} onChange={setEndDate} className="field !w-auto" />
                  <div className="flex-1 min-w-[10rem]"><TimeInput value={endTime} onChange={setEndTime} /></div>
                </div>
              </div>
              <p className="text-sm text-muted font-medium">لما يخلص الوقت، العرض بيوقف لحاله.</p>
            </div>
          )}

          {when === 'weekly' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ARABIC_DAYS.map((name, index) => (
                  <button key={name} type="button" aria-pressed={days.includes(index)} onClick={() => setDays(days.includes(index) ? days.filter(day => day !== index) : [...days, index])} className="chip">{name}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="field-label">من الساعة</span>
                  <TimeInput value={fromTime} onChange={setFromTime} allowEmpty />
                </div>
                <div>
                  <span className="field-label">لـ الساعة</span>
                  <TimeInput value={untilTime} onChange={setUntilTime} allowEmpty />
                </div>
              </div>
              <p className="text-sm text-muted font-medium">اترك الساعات فاضية ليكون العرض طوال اليوم.</p>
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="promotion-title" className="field-label">اسم العرض (اختياري)</label>
          <input id="promotion-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="مثلاً: عرض الجمعة" className="field" />
        </div>
      </form>
    </FormSheet>
  )
}
