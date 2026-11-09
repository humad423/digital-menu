'use client'

import { useCallback, useEffect, useState } from 'react'
import MultiImageUpload from '@/components/MultiImageUpload'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { getOptimizedImageUrl } from '@/utils/imageOptimizer'
import { readKeywords, type StockPhoto } from '@/utils/stockPhotos'
import { createClient } from '@/utils/supabase/client'

/** The library of ready-made photos for products that look the same everywhere. */
export default function AdminStockPhotos() {
  const [supabase] = useState(() => createClient())
  const [photos, setPhotos] = useState<StockPhoto[]>([])
  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('stock_photos').select('id, name, keywords, image_url').order('name')
    if (error) {
      notifyError('تعذر تحميل الصور. حاول مرة أخرى.')
      return
    }
    setPhotos(data || [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !images[0]) {
      notifyError('اكتب اسم المنتج وارفع صورته.')
      return
    }
    setSaving(true)
    const result = await supabase.from('stock_photos').insert([{ name: name.trim(), keywords: readKeywords(keywords), image_url: images[0] }])
    setSaving(false)
    if (reportWriteResult(result, 'تعذر حفظ الصورة. حاول مرة أخرى.')) {
      setName('')
      setKeywords('')
      setImages([])
      await load()
    }
  }

  const remove = async (photo: StockPhoto) => {
    if (!confirm(`إزالة «${photo.name}» من الخزان؟ المنتجات التي تستخدمها تبقى كما هي.`)) return
    if (reportWriteResult(await supabase.from('stock_photos').delete().eq('id', photo.id))) await load()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="bg-white rounded-2xl p-4 border border-line space-y-4">
        <div>
          <h2 className="section-title">خزان الصور</h2>
          <p className="text-muted font-medium">صور بدون شعار لمنتجات شكلها واحد في كل مكان، مثل عبوة كولا أو ماء.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="stock-name" className="f-label">اسم المنتج</label>
            <input id="stock-name" value={name} onChange={e => setName(e.target.value)} placeholder="كولا لترين ونص" className="f-input" />
          </div>
          <div>
            <label htmlFor="stock-keywords" className="f-label">أسماء أخرى (افصل بينها بفاصلة)</label>
            <input id="stock-keywords" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="بيبسي، كوكا، كولا" className="f-input" />
          </div>
        </div>
        <div>
          <span className="f-label">الصورة</span>
          <MultiImageUpload images={images} onChange={urls => setImages(urls.slice(-1))} />
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'جاري الحفظ...' : 'إضافة إلى الخزان'}</button>
      </form>

      {photos.length === 0 && <p className="notice notice-info">لا توجد صور بعد.</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {photos.map(photo => (
          <article key={photo.id} className="bg-white rounded-2xl p-3 border border-line space-y-2">
            <img src={getOptimizedImageUrl(photo.image_url, 300)} alt="" loading="lazy" className="w-full aspect-square object-contain rounded-xl bg-slate-100" />
            <h3 className="font-black leading-snug">{photo.name}</h3>
            {photo.keywords.length > 0 && <p className="text-muted font-medium text-sm leading-snug">{photo.keywords.join('، ')}</p>}
            <button onClick={() => remove(photo)} className="btn btn-danger btn-sm btn-block">إزالة</button>
          </article>
        ))}
      </div>
    </div>
  )
}
