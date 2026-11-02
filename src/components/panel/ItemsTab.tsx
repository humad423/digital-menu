'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import MultiImageUpload from '@/components/MultiImageUpload'
import { CheckRow, FormSheet, parseList, splitByComma, type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { triggerRevalidate } from '@/utils/revalidate'
import { CURRENCY_SYMBOL } from '@/config/site'

const EMPTY_FORM = {
  category_id: '',
  name: '',
  description: '',
  price: '',
  original_price: '',
  images: [] as string[],
  sizesText: '',
  colorsText: '',
  soldByWeight: false,
  is_available: true,
  is_hidden: false,
}

function offersUsing(offers: any[], itemId: string) {
  return offers.filter(o => [o.primary_item_id, o.bonus_item_id, o.item3_id, o.item4_id].includes(itemId))
}

export default function ItemsTab({
  store,
  onGoToCategories,
}: {
  store: PanelStore
  onGoToCategories: () => void
}) {
  const { restaurant, categories, menuItems, offers, refresh, canEdit } = store
  const isSupermarket = restaurant?.store_type === 'supermarket'
  const isClothing = restaurant?.store_type === 'clothing'
  const noun = isSupermarket ? 'العرض' : 'المنتج'

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [outOfStockItem, setOutOfStockItem] = useState<any | null>(null)

  const publish = () => {
    triggerRevalidate(restaurant?.slug, 'menu')
    return refresh()
  }

  const openNew = () => {
    if (!canEdit()) return
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, category_id: categories[0]?.id || '' })
    setIsFormOpen(true)
  }

  const openEdit = (item: any) => {
    const images = parseList(item.images)
    if (images.length === 0 && item.image_url) images.push(item.image_url)
    setEditingItem(item)
    setForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      original_price: item.original_price ? String(item.original_price) : '',
      images,
      sizesText: parseList(item.sizes).join('، '),
      colorsText: parseList(item.colors).join('، '),
      soldByWeight: item.unit === 'kg' || item.allow_custom_amount === true,
      is_available: item.is_available !== false,
      is_hidden: item.is_hidden === true,
    })
    setIsFormOpen(true)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit()) return

    const price = parseFloat(form.price)
    const originalPrice = parseFloat(form.original_price)
    if (!form.category_id || !form.name.trim() || !(price >= 0)) {
      notifyError('اكتب الاسم والسعر واختر القسم.')
      return
    }
    if (isSupermarket && !(originalPrice > price)) {
      notifyError('السعر قبل الخصم يجب أن يكون أكبر من سعر العرض.')
      return
    }

    const payload = {
      category_id: form.category_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      original_price: originalPrice > 0 ? originalPrice : null,
      image_url: form.images[0] || null,
      images: form.images,
      sizes: splitByComma(form.sizesText),
      colors: splitByComma(form.colorsText),
      unit: form.soldByWeight ? 'kg' : 'piece',
      allow_custom_amount: form.soldByWeight,
      is_available: form.is_available,
      is_hidden: form.is_hidden,
      out_of_stock_until: form.is_available ? null : editingItem?.out_of_stock_until ?? null,
    }

    setSaving(true)
    const result = editingItem
      ? await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
      : await supabase.from('menu_items').insert([payload])
    setSaving(false)

    if (reportWriteResult(result, `تعذر حفظ ${noun}. حاول مرة أخرى.`)) {
      setIsFormOpen(false)
      await publish()
    }
  }

  const remove = async () => {
    if (!editingItem || !canEdit()) return
    // A deleted product would silently remove or break the bundles it belongs to
    const usedIn = offersUsing(offers, editingItem.id)
    if (usedIn.length > 0) {
      notifyError(`هذا المنتج داخل البكج «${usedIn[0].title}». احذف البكج أو عدّله أولاً.`)
      return
    }
    if (!confirm(`حذف «${editingItem.name}»؟`)) return
    if (reportWriteResult(await supabase.from('menu_items').delete().eq('id', editingItem.id))) {
      setIsFormOpen(false)
      await publish()
    }
  }

  const setAvailability = async (item: any, isAvailable: boolean, until: string | null) => {
    setOutOfStockItem(null)
    const result = await supabase
      .from('menu_items')
      .update({ is_available: isAvailable, out_of_stock_until: until })
      .eq('id', item.id)
    if (reportWriteResult(result)) await publish()
  }

  const tomorrowMorning = () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(9, 0, 0, 0)
    return date.toISOString()
  }
  const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

  if (categories.length === 0) {
    return (
      <div className="notice notice-info space-y-3">
        <p>ابدأ بإضافة قسم واحد على الأقل، مثل «وجبات» أو «مشروبات»، ثم أضف إليه {isSupermarket ? 'عروضك' : 'منتجاتك'}.</p>
        <button onClick={onGoToCategories} className="btn btn-primary btn-block">إضافة قسم</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={openNew} className="btn btn-primary btn-lg btn-block">
        <Plus size={22} />
        <span>{isSupermarket ? 'إضافة عرض جديد' : 'إضافة منتج جديد'}</span>
      </button>

      {isSupermarket && (
        <p className="notice notice-info">أضف العروض فقط، وليس كل منتجات المتجر. الزبون يرى السعر قبل الخصم وبعده.</p>
      )}

      {categories.map(category => {
        const items = menuItems.filter(item => item.category_id === category.id)
        return (
          <section key={category.id} className="space-y-2">
            <h3 className="section-title">{category.name} ({items.length})</h3>
            {items.length === 0 && <p className="text-muted font-medium">لا يوجد شيء في هذا القسم بعد.</p>}
            {items.map(item => (
              <article key={item.id} className="card p-3 space-y-3">
                <div className="flex gap-3">
                  {item.image_url && (
                    <img
                      src={getOptimizedImageUrl(item.image_url, 160)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 rounded-xl object-cover bg-slate-200 shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black leading-snug">{item.name}</h4>
                    <p className="font-black text-brand">
                      {item.price} {CURRENCY_SYMBOL}
                      {item.original_price > item.price && (
                        <span className="text-muted font-medium line-through ms-2">{item.original_price} {CURRENCY_SYMBOL}</span>
                      )}
                    </p>
                    <p className="flex flex-wrap gap-1 mt-1 empty:hidden">
                      {item.is_available === false && <span className="badge badge-red">غير متوفر</span>}
                      {item.is_hidden && <span className="badge badge-gray">مخفي عن الزبائن</span>}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => openEdit(item)} className="btn btn-secondary btn-sm">تعديل</button>
                  {item.is_available === false ? (
                    <button onClick={() => canEdit() && setAvailability(item, true, null)} className="btn btn-secondary btn-sm">صار متوفراً</button>
                  ) : (
                    <button onClick={() => canEdit() && setOutOfStockItem(item)} className="btn btn-secondary btn-sm">نفد</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )
      })}

      {isFormOpen && (
        <FormSheet
          title={editingItem ? `تعديل ${noun}` : isSupermarket ? 'عرض جديد' : 'منتج جديد'}
          onClose={() => setIsFormOpen(false)}
          footer={
            <>
              <button type="submit" form="item-form" disabled={saving} className="btn btn-primary btn-lg btn-block">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              {editingItem && <button type="button" onClick={remove} className="btn btn-danger btn-block">حذف {noun}</button>}
            </>
          }
        >
          <form id="item-form" onSubmit={save} className="space-y-4">
            <div>
              <label htmlFor="item-name" className="field-label">الاسم</label>
              <input id="item-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="field" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-price" className="field-label">{isSupermarket ? 'سعر العرض' : 'السعر'} ({CURRENCY_SYMBOL})</label>
                <input id="item-price" required type="number" inputMode="decimal" min="0" step="any" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="item-original" className="field-label">قبل الخصم{isSupermarket ? '' : ' (اختياري)'}</label>
                <input id="item-original" required={isSupermarket} type="number" inputMode="decimal" min="0" step="any" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} className="field" />
              </div>
            </div>

            <div>
              <label htmlFor="item-category" className="field-label">القسم</label>
              <select id="item-category" required value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="field">
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>

            <div>
              <span className="field-label">الصور</span>
              <MultiImageUpload images={form.images} onChange={images => setForm({ ...form, images })} />
            </div>

            <div>
              <label htmlFor="item-description" className="field-label">وصف قصير (اختياري)</label>
              <textarea id="item-description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="field" />
            </div>

            {isClothing && (
              <>
                <div>
                  <label htmlFor="item-sizes" className="field-label">المقاسات، وبينها فاصلة (اختياري)</label>
                  <input id="item-sizes" placeholder="S، M، L" value={form.sizesText} onChange={e => setForm({ ...form, sizesText: e.target.value })} className="field" />
                </div>
                <div>
                  <label htmlFor="item-colors" className="field-label">الألوان، وبينها فاصلة (اختياري)</label>
                  <input id="item-colors" placeholder="أسود، أبيض" value={form.colorsText} onChange={e => setForm({ ...form, colorsText: e.target.value })} className="field" />
                </div>
              </>
            )}

            <CheckRow label="يُباع بالكيلو، والسعر المكتوب للكيلو" checked={form.soldByWeight} onChange={soldByWeight => setForm({ ...form, soldByWeight })} />
            <CheckRow label="متوفر الآن" checked={form.is_available} onChange={is_available => setForm({ ...form, is_available })} />
            <CheckRow label="إخفاؤه عن الزبائن" checked={form.is_hidden} onChange={is_hidden => setForm({ ...form, is_hidden })} />
          </form>
        </FormSheet>
      )}

      {outOfStockItem && (
        <FormSheet title={`متى يعود «${outOfStockItem.name}»؟`} onClose={() => setOutOfStockItem(null)}>
          <div className="space-y-2">
            <button onClick={() => setAvailability(outOfStockItem, false, hoursFromNow(2))} className="btn btn-secondary btn-block">بعد ساعتين</button>
            <button onClick={() => setAvailability(outOfStockItem, false, hoursFromNow(4))} className="btn btn-secondary btn-block">بعد 4 ساعات</button>
            <button onClick={() => setAvailability(outOfStockItem, false, tomorrowMorning())} className="btn btn-secondary btn-block">صباح الغد</button>
            <button onClick={() => setAvailability(outOfStockItem, false, null)} className="btn btn-secondary btn-block">أعيده بنفسي عندما يتوفر</button>
          </div>
        </FormSheet>
      )}
    </div>
  )
}
