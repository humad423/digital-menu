'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { triggerRevalidate } from '@/utils/revalidate'
import { Tag, Plus, Edit, Trash2, CheckCircle2, XCircle, Sparkles, Loader2 } from 'lucide-react'

export interface BusinessType {
  id: string
  slug: string
  name: string
  icon: string
  sort_order: number
  is_active: boolean
  created_at?: string
}

export default function AdminBusinessTypesTab({
  businessTypes = [],
  onRefresh
}: {
  businessTypes: BusinessType[]
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    icon: '🏪',
    sort_order: (businessTypes.length || 0) + 1,
    is_active: true
  })

  const supabase = createClient()

  const handleOpenNewForm = () => {
    setEditId(null)
    setForm({
      name: '',
      slug: '',
      icon: '🏪',
      sort_order: (businessTypes.length || 0) + 1,
      is_active: true
    })
    setShowForm(true)
  }

  const handleEdit = (bt: BusinessType) => {
    setEditId(bt.id)
    setForm({
      name: bt.name,
      slug: bt.slug,
      icon: bt.icon || '🏪',
      sort_order: bt.sort_order || 0,
      is_active: bt.is_active ?? true
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return alert('يرجى كتابة اسم الفئة/النشاط')

    setSaving(true)
    const slug = form.slug.trim()
      ? form.slug.trim().toLowerCase().replace(/\s+/g, '_')
      : form.name.trim().toLowerCase().replace(/\s+/g, '_')

    const payload = {
      name: form.name.trim(),
      slug,
      icon: form.icon.trim() || '🏪',
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active
    }

    if (editId) {
      const { error } = await supabase.from('business_types').update(payload).eq('id', editId)
      if (error) {
        alert('حدث خطأ أثناء حفظ التعديلات: ' + error.message)
      } else {
        setShowForm(false)
        onRefresh()
        triggerRevalidate(null, 'home')
      }
    } else {
      const { error } = await supabase.from('business_types').insert([payload])
      if (error) {
        alert('حدث خطأ أثناء إضافة نوع النشاط: ' + error.message)
      } else {
        setShowForm(false)
        onRefresh()
        triggerRevalidate(null, 'home')
      }
    }
    setSaving(false)
  }

  const toggleActive = async (bt: BusinessType) => {
    const { error } = await supabase.from('business_types').update({ is_active: !bt.is_active }).eq('id', bt.id)
    if (!error) {
      onRefresh()
      triggerRevalidate(null, 'home')
    }
  }

  const handleDelete = async (bt: BusinessType) => {
    if (confirm(`هل أنت متأكد من حذف نوع النشاط "${bt.icon} ${bt.name}"؟`)) {
      const { error } = await supabase.from('business_types').delete().eq('id', bt.id)
      if (!error) {
        onRefresh()
        triggerRevalidate(null, 'home')
      } else {
        alert('حدث خطأ أثناء الحذف: ' + error.message)
      }
    }
  }

  return (
    <div className="space-y-6 dir-rtl animate-fade-in">
      
      {/* ── Section Header ── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
            <Tag className="text-orange-500" size={20} />
            <span>إدارة أنواع الأنشطة التجارية (الفئات)</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            يمكنك هنا إضافة وتعديل الفئات والأنشطة التجارية التي تظهر للمستخدمين وعند إنشاء المتاجر.
          </p>
        </div>

        <button
          onClick={handleOpenNewForm}
          className="btn btn-primary text-xs font-black py-2.5 px-4 rounded-2xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus size={16} />
          <span>إضافة فئة نشاط جديدة</span>
        </button>
      </div>

      {/* ── Add / Edit Form Modal / Card ── */}
      {showForm && (
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl animate-slide-down">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h4 className="font-black text-sm text-amber-400 flex items-center gap-2">
              <Sparkles size={16} />
              <span>{editId ? 'تعديل فئة النشاط التجاري' : 'إضافة فئة نشاط تجاري جديدة'}</span>
            </h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-800 transition"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <label className="f-label text-slate-300 mb-1 block">اسم النشاط / الفئة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: صيدلية / مستلزمات طبية"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="f-label text-slate-300 mb-1 block">الأيقونة (إيموجي Emoji)</label>
                <input
                  type="text"
                  placeholder="مثال: 💊 أو ☕ أو 📱"
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center placeholder-slate-500 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="f-label text-slate-300 mb-1 block">المعرّف الإنجليزي (Slug)</label>
                <input
                  type="text"
                  placeholder="مثال: pharmacy (سيُولّد تلقائياً إن تركته فارغاً)"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-orange-500 dir-ltr text-right"
                />
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-200">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                />
                <span>تفعيل الظهور في القوائم والفلاتر</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>💾 حفظ الفئة</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Business Types List Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {businessTypes.map((bt) => (
          <div
            key={bt.id}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md transition flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-2xl shrink-0">
                {bt.icon}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-sm text-slate-900 truncate">{bt.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md dir-ltr">
                    {bt.slug}
                  </span>
                  <button
                    onClick={() => toggleActive(bt)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition ${
                      bt.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {bt.is_active ? 'مفعّل' : 'معطّل'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleEdit(bt)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                title="تعديل"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(bt)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition cursor-pointer"
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
