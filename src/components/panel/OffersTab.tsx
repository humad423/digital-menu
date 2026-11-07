'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'
import { CheckRow, FormSheet, parseList, type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { duplicateBundleMessage } from '@/utils/offerDuplicates'
import { isRealDiscount } from '@/utils/productOptions'
import { triggerRevalidate } from '@/utils/revalidate'
import { CURRENCY_SYMBOL } from '@/config/site'

// The four products a bundle can hold, in the columns that store them
const SLOTS = [
  { id: 'primary_item_id', quantity: 'min_quantity', label: 'المنتج الأول' },
  { id: 'bonus_item_id', quantity: 'bonus_quantity', label: 'المنتج الثاني (اختياري)' },
  { id: 'item3_id', quantity: 'item3_quantity', label: 'المنتج الثالث (اختياري)' },
  { id: 'item4_id', quantity: 'item4_quantity', label: 'المنتج الرابع (اختياري)' },
] as const

const EMPTY_FORM = {
  primary_item_id: '', min_quantity: '1',
  bonus_item_id: '', bonus_quantity: '1',
  item3_id: '', item3_quantity: '1',
  item4_id: '', item4_quantity: '1',
  title: '',
  description: '',
  offer_price: '',
  original_price: '',
  images: [] as string[],
  is_active: true,
}

export default function OffersTab({ store }: { store: PanelStore }) {
  const { restaurantId, restaurant, menuItems, offers, refresh, canEdit } = store
  const limit = restaurant?.max_offers_limit || 5

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingOffer, setEditingOffer] = useState<any | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const publish = () => {
    triggerRevalidate(restaurant?.slug, 'menu')
    triggerRevalidate(restaurant?.slug, 'offers')
    return refresh()
  }

  // Keeps the suggested title and "before" price in step with the chosen products
  const updateBundle = (changes: Partial<typeof EMPTY_FORM>) => {
    setForm(current => {
      const next = { ...current, ...changes }
      let total = 0
      const names: string[] = []
      for (const slot of SLOTS) {
        const item = menuItems.find(i => i.id === next[slot.id])
        if (!item) continue
        const quantity = parseInt(next[slot.quantity]) || 1
        total += (Number(item.price) || 0) * quantity
        names.push(`${quantity > 1 ? `${quantity} ` : ''}${item.name}`)
      }
      return {
        ...next,
        title: names.length > 0 ? names.join(' + ') : next.title,
        original_price: total > 0 ? String(total) : next.original_price,
      }
    })
  }

  const openNew = () => {
    if (!canEdit()) return
    if (offers.length >= limit) {
      notifyError(`وصلت إلى الحد المسموح (${limit}). تواصل مع الإدارة لزيادته.`)
      return
    }
    setEditingOffer(null)
    setForm(EMPTY_FORM)
    setIsFormOpen(true)
  }

  const openEdit = (offer: any) => {
    const images = parseList(offer.images)
    if (images.length === 0 && offer.image_url) images.push(offer.image_url)
    setEditingOffer(offer)
    setForm({
      primary_item_id: offer.primary_item_id || '',
      min_quantity: String(offer.min_quantity || 1),
      bonus_item_id: offer.bonus_item_id || '',
      bonus_quantity: String(offer.bonus_quantity || 1),
      item3_id: offer.item3_id || '',
      item3_quantity: String(offer.item3_quantity || 1),
      item4_id: offer.item4_id || '',
      item4_quantity: String(offer.item4_quantity || 1),
      title: offer.title || '',
      description: offer.description || '',
      offer_price: String(offer.offer_price ?? ''),
      original_price: offer.original_price ? String(offer.original_price) : '',
      images,
      is_active: offer.is_active !== false,
    })
    setIsFormOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit()) return

    const offerPrice = parseFloat(form.offer_price)
    const originalPrice = parseFloat(form.original_price)
    if (!form.primary_item_id || !form.title.trim() || !(offerPrice > 0)) {
      notifyError('اختر المنتج الأول واكتب سعر البكج.')
      return
    }
    if (!isRealDiscount(offerPrice, originalPrice)) {
      notifyError('سعر البكج لازم يكون أقل من السعر الأصلي.')
      return
    }

    const payload = {
      restaurant_id: restaurantId,
      primary_item_id: form.primary_item_id,
      min_quantity: parseInt(form.min_quantity) || 1,
      bonus_item_id: form.bonus_item_id || null,
      bonus_quantity: parseInt(form.bonus_quantity) || 1,
      item3_id: form.item3_id || null,
      item3_quantity: parseInt(form.item3_quantity) || 1,
      item4_id: form.item4_id || null,
      item4_quantity: parseInt(form.item4_quantity) || 1,
      title: form.title.trim(),
      description: form.description.trim() || null,
      original_price: originalPrice,
      offer_price: offerPrice,
      image_url: form.images[0] || null,
      images: form.images,
      is_active: form.is_active,
    }

    const duplicate = duplicateBundleMessage(payload, offers, editingOffer)
    if (duplicate) {
      notifyError(duplicate)
      return
    }

    setSaving(true)
    let result
    if (editingOffer) {
      result = await supabase.from('offers').update(payload).eq('id', editingOffer.id)
    } else {
      const { data: last } = await supabase.from('offers').select('sort_order').order('sort_order', { ascending: false }).limit(1)
      result = await supabase.from('offers').insert([{ ...payload, sort_order: (last?.[0]?.sort_order || 0) + 1 }])
    }
    setSaving(false)

    if (reportWriteResult(result, 'تعذر حفظ البكج. حاول مرة أخرى.')) {
      setIsFormOpen(false)
      await publish()
    }
  }

  const toggleActive = async (offer: any) => {
    if (!canEdit()) return
    if (reportWriteResult(await supabase.from('offers').update({ is_active: offer.is_active === false }).eq('id', offer.id))) {
      await publish()
    }
  }

  const remove = async () => {
    if (!editingOffer || !canEdit() || !confirm(`حذف «${editingOffer.title}»؟`)) return
    if (reportWriteResult(await supabase.from('offers').delete().eq('id', editingOffer.id))) {
      setIsFormOpen(false)
      await publish()
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={openNew} className="btn btn-primary btn-lg btn-block">
        <Plus size={22} />
        <span>إضافة بكج جديد</span>
      </button>

      <p className="text-muted font-medium">
        البكج عرض يجمع منتجاً أو أكثر بسعر واحد. لديك {offers.length} من {limit} مسموحة.
      </p>

      {offers.length === 0 && <p className="notice notice-info">لا توجد بكجات بعد.</p>}

      {offers.map(offer => (
        <article key={offer.id} className="card p-3 space-y-3">
          <div>
            <h3 className="font-black leading-snug">{offer.title}</h3>
            <p className="font-black text-brand">
              {offer.offer_price} {CURRENCY_SYMBOL}
              {offer.original_price > offer.offer_price && (
                <span className="text-muted font-medium line-through ms-2">{offer.original_price} {CURRENCY_SYMBOL}</span>
              )}
            </p>
            {offer.is_active === false && <span className="badge badge-gray mt-1">مخفي عن الزبائن</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => openEdit(offer)} className="btn btn-secondary btn-sm">تعديل</button>
            <button onClick={() => toggleActive(offer)} className="btn btn-secondary btn-sm">{offer.is_active === false ? 'إظهار' : 'إخفاء'}</button>
          </div>
        </article>
      ))}

      {isFormOpen && (
        <FormSheet
          title={editingOffer ? 'تعديل البكج' : 'بكج جديد'}
          onClose={() => setIsFormOpen(false)}
          footer={
            <>
              <button type="submit" form="offer-form" disabled={saving} className="btn btn-primary btn-lg btn-block">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              {editingOffer && <button type="button" onClick={remove} className="btn btn-danger btn-block">حذف البكج</button>}
            </>
          }
        >
          <form id="offer-form" onSubmit={save} className="space-y-4">
            {SLOTS.map(slot => (
              <div key={slot.id} className="grid grid-cols-[1fr_5rem] gap-2 items-end">
                <div className="min-w-0">
                  <label htmlFor={slot.id} className="field-label">{slot.label}</label>
                  <select id={slot.id} value={form[slot.id]} onChange={e => updateBundle({ [slot.id]: e.target.value })} className="field">
                    <option value="">اختر</option>
                    {menuItems.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={slot.quantity} className="field-label">العدد</label>
                  <input
                    id={slot.quantity}
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form[slot.quantity]}
                    onChange={e => updateBundle({ [slot.quantity]: e.target.value })}
                    className="field"
                  />
                </div>
              </div>
            ))}

            <div>
              <label htmlFor="offer-title" className="field-label">اسم البكج</label>
              <input id="offer-title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="field" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="offer-price" className="field-label">سعر البكج ({CURRENCY_SYMBOL})</label>
                <input id="offer-price" required type="number" inputMode="decimal" min="0" step="any" value={form.offer_price} onChange={e => setForm({ ...form, offer_price: e.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="offer-original" className="field-label">قبل الخصم</label>
                <input id="offer-original" type="number" inputMode="decimal" min="0" step="any" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} className="field" />
              </div>
            </div>

            <div>
              <span className="field-label">صورة (اختياري)</span>
              <MultiImageUpload images={form.images} onChange={images => setForm({ ...form, images })} />
            </div>

            <div>
              <label htmlFor="offer-description" className="field-label">وصف قصير (اختياري)</label>
              <textarea id="offer-description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="field" />
            </div>

            <CheckRow label="ظاهر للزبائن" checked={form.is_active} onChange={is_active => setForm({ ...form, is_active })} />
          </form>
        </FormSheet>
      )}
    </div>
  )
}
