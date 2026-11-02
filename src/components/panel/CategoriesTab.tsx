'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FormSheet, type PanelStore } from '@/components/panel/shared'
import { supabase } from '@/lib/supabase'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { triggerRevalidate } from '@/utils/revalidate'

export default function CategoriesTab({ store }: { store: PanelStore }) {
  const { restaurantId, restaurant, categories, menuItems, offers, refresh, canEdit } = store
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [editName, setEditName] = useState('')

  const publish = () => {
    triggerRevalidate(restaurant?.slug, 'menu')
    return refresh()
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit() || !newName.trim()) return
    const nextOrder = Math.max(0, ...categories.map(c => c.sort_order || 0)) + 1
    const result = await supabase.from('categories').insert([{ restaurant_id: restaurantId, name: newName.trim(), sort_order: nextOrder }])
    if (reportWriteResult(result)) {
      setNewName('')
      await publish()
    }
  }

  const rename = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canEdit() || !editName.trim()) return
    if (reportWriteResult(await supabase.from('categories').update({ name: editName.trim() }).eq('id', editing.id))) {
      setEditing(null)
      await publish()
    }
  }

  const remove = async () => {
    if (!canEdit()) return
    const itemIds = menuItems.filter(i => i.category_id === editing.id).map(i => i.id)
    const usedIn = offers.find(o =>
      [o.primary_item_id, o.bonus_item_id, o.item3_id, o.item4_id].some(id => id && itemIds.includes(id))
    )
    if (usedIn) {
      notifyError(`منتجات هذا القسم داخل البكج «${usedIn.title}». احذف البكج أو عدّله أولاً.`)
      return
    }
    if (!confirm(`حذف قسم «${editing.name}» وكل ما فيه (${itemIds.length})؟`)) return
    if (reportWriteResult(await supabase.from('categories').delete().eq('id', editing.id))) {
      setEditing(null)
      await publish()
    }
  }

  const move = async (index: number, direction: -1 | 1) => {
    if (!canEdit()) return
    const reordered = [...categories]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(index + direction, 0, moved)
    const results = await Promise.all(
      reordered.map((category, position) =>
        supabase.from('categories').update({ sort_order: position + 1 }).eq('id', category.id)
      )
    )
    if (results.every(result => reportWriteResult(result))) await publish()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="space-y-2">
        <label htmlFor="new-category" className="field-label">اسم القسم الجديد</label>
        <div className="flex gap-2">
          <input id="new-category" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: مشروبات" className="field min-w-0" />
          <button type="submit" className="btn btn-primary shrink-0">إضافة</button>
        </div>
      </form>

      {categories.length === 0 && <p className="notice notice-info">لا توجد أقسام بعد.</p>}

      {categories.map((category, index) => (
        <article key={category.id} className="card p-3 flex items-center gap-2 flex-wrap">
          <h3 className="font-black flex-1 min-w-[8rem]">{category.name}</h3>
          <button
            onClick={() => move(index, -1)}
            disabled={index === 0}
            aria-label={`تحريك ${category.name} للأعلى`}
            className="btn btn-secondary btn-sm"
          >
            <ChevronUp size={20} />
          </button>
          <button
            onClick={() => move(index, 1)}
            disabled={index === categories.length - 1}
            aria-label={`تحريك ${category.name} للأسفل`}
            className="btn btn-secondary btn-sm"
          >
            <ChevronDown size={20} />
          </button>
          <button onClick={() => { setEditing(category); setEditName(category.name) }} className="btn btn-secondary btn-sm">تعديل</button>
        </article>
      ))}

      {editing && (
        <FormSheet
          title="تعديل القسم"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="submit" form="category-form" className="btn btn-primary btn-lg btn-block">حفظ</button>
              <button type="button" onClick={remove} className="btn btn-danger btn-block">حذف القسم</button>
            </>
          }
        >
          <form id="category-form" onSubmit={rename}>
            <label htmlFor="category-name" className="field-label">اسم القسم</label>
            <input id="category-name" required value={editName} onChange={e => setEditName(e.target.value)} className="field" />
          </form>
        </FormSheet>
      )}
    </div>
  )
}
