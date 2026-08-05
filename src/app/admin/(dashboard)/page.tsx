'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import { Plus, Edit, Settings, Trash2, LayoutGrid, Image as ImageIcon, Store, ClipboardList, CheckCircle, X, ExternalLink, MapPin, Phone } from 'lucide-react'

const TABS = [
  { key: 'restaurants', label: 'المطاعم', Icon: Store },
  { key: 'categories', label: 'التصنيفات', Icon: LayoutGrid },
  { key: 'ads', label: 'الإعلانات', Icon: ImageIcon },
  { key: 'orders', label: 'الطلبات', Icon: ClipboardList },
] as const

type TabKey = typeof TABS[number]['key']

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [platformCategories, setPlatformCategories] = useState<any[]>([])
  const [platformAds, setPlatformAds] = useState<any[]>([])
  const [restaurantCategoryMap, setRestaurantCategoryMap] = useState<Record<string, string[]>>({})
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('restaurants')

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const [resRes, catRes, adsRes, relRes, ordRes] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_categories').select('*').order('created_at', { ascending: true }),
      supabase.from('platform_ads').select('*').order('sort_order', { ascending: true }),
      supabase.from('restaurant_platform_categories').select('*'),
      supabase.from('orders').select('*, restaurants(name)').order('created_at', { ascending: false }),
    ])
    if (resRes.data) setRestaurants(resRes.data)
    if (catRes.data) setPlatformCategories(catRes.data)
    if (adsRes.data) setPlatformAds(adsRes.data)
    if (relRes.data) {
      const map: Record<string, string[]> = {}
      relRes.data.forEach(r => {
        if (!map[r.restaurant_id]) map[r.restaurant_id] = []
        map[r.restaurant_id].push(r.platform_category_id)
      })
      setRestaurantCategoryMap(map)
    }
    if (ordRes.data) setOrders(ordRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Restaurants ─────────────────────────────────────────────────
  const [showResForm, setShowResForm] = useState(false)
  const [editResId, setEditResId] = useState<string | null>(null)
  const emptyRes = { name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '', logo_url: '', cover_url: '', latitude: '', longitude: '', delivery_radius_km: '5' }
  const [resForm, setResForm] = useState(emptyRes)
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([])
  const [savingRes, setSavingRes] = useState(false)

  const toggleCat = (catId: string) =>
    setSelectedCatIds(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId])

  const handleResSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRes(true)
    const payload = {
      name: resForm.name, slug: resForm.slug, primary_color: resForm.primary_color,
      whatsapp_number: resForm.whatsapp_number, logo_url: resForm.logo_url || null,
      cover_url: resForm.cover_url || null,
      latitude: resForm.latitude ? parseFloat(resForm.latitude) : null,
      longitude: resForm.longitude ? parseFloat(resForm.longitude) : null,
      delivery_radius_km: resForm.delivery_radius_km ? parseFloat(resForm.delivery_radius_km) : 5,
    }
    let restaurantId = editResId
    if (editResId) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editResId)
      if (error) { alert('خطأ في التحديث'); setSavingRes(false); return }
    } else {
      const { data, error } = await supabase.from('restaurants').insert([payload]).select().maybeSingle()
      if (error || !data) { alert('حدث خطأ. تأكد أن الرابط (Slug) غير مكرر.'); setSavingRes(false); return }
      restaurantId = data.id
    }
    if (restaurantId) {
      await supabase.from('restaurant_platform_categories').delete().eq('restaurant_id', restaurantId)
      if (selectedCatIds.length > 0) {
        await supabase.from('restaurant_platform_categories').insert(
          selectedCatIds.map(cid => ({ restaurant_id: restaurantId, platform_category_id: cid }))
        )
      }
      if (resForm.owner_phone.trim()) {
        let rawPhone = resForm.owner_phone.trim().replace(/\s+/g, '')
        if (rawPhone.startsWith('0')) rawPhone = rawPhone.replace(/^0+/, '')
        const formattedPhone = rawPhone.startsWith('+') ? rawPhone : '+90' + rawPhone
        const { data: existingProf } = await supabase.from('profiles').select('*').eq('phone', formattedPhone).limit(1)
        if (existingProf && existingProf.length > 0) {
          await supabase.from('profiles').update({ role: 'restaurant_owner', restaurant_id: restaurantId }).eq('id', existingProf[0].id)
        } else {
          const fakeUid = 'owner-uid-' + formattedPhone.replace(/[^0-9]/g, '')
          await supabase.from('profiles').insert([{ id: fakeUid, phone: formattedPhone, full_name: 'صاحب مطعم ' + resForm.name, role: 'restaurant_owner', restaurant_id: restaurantId }])
        }
      }
    }
    setSavingRes(false); setShowResForm(false); setEditResId(null); setResForm(emptyRes); setSelectedCatIds([])
    fetchData()
  }

  const handleEditRes = (r: any) => {
    setEditResId(r.id)
    setResForm({ name: r.name, slug: r.slug, primary_color: r.primary_color || '#ea580c', whatsapp_number: r.whatsapp_number, owner_phone: r.owner_phone || '', logo_url: r.logo_url || '', cover_url: r.cover_url || '', latitude: r.latitude?.toString() || '', longitude: r.longitude?.toString() || '', delivery_radius_km: r.delivery_radius_km?.toString() || '5' })
    setSelectedCatIds(restaurantCategoryMap[r.id] || [])
    setShowResForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRes = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${name}"؟`)) {
      await supabase.from('restaurants').delete().eq('id', id)
      fetchData()
    }
  }

  // ── Platform Categories ─────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', icon: '' })

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editCatId) await supabase.from('platform_categories').update(catForm).eq('id', editCatId)
    else await supabase.from('platform_categories').insert([catForm])
    setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '' }); fetchData()
  }

  const deleteCat = async (id: string) => {
    if (confirm('حذف التصنيف؟')) { await supabase.from('platform_categories').delete().eq('id', id); fetchData() }
  }

  // ── Platform Ads ────────────────────────────────────────────────
  const [showAdForm, setShowAdForm] = useState(false)
  const [adForm, setAdForm] = useState({
    image_url: '',
    link_url: '',
    sort_order: 0,
    target_region: 'جميع المناطق',
    latitude: null as number | null,
    longitude: null as number | null,
    radius_km: null as number | null
  })

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adForm.image_url) return alert('الصورة مطلوبة')

    const { error } = await supabase.from('platform_ads').insert([adForm])
    if (error) {
      const { latitude, longitude, radius_km, ...fallbackForm } = adForm
      const { error: err2 } = await supabase.from('platform_ads').insert([fallbackForm])
      if (err2) {
        const { target_region, ...cleanForm } = fallbackForm
        await supabase.from('platform_ads').insert([cleanForm])
      }
    }
    setShowAdForm(false)
    setAdForm({ image_url: '', link_url: '', sort_order: 0, target_region: 'جميع المناطق', latitude: null, longitude: null, radius_km: null })
    fetchData()
  }

  const deleteAd = async (id: string) => {
    if (confirm('حذف هذا الإعلان؟')) { await supabase.from('platform_ads').delete().eq('id', id); fetchData() }
  }



  // ── Stats ───────────────────────────────────────────────────────
  const pendingOrders = orders.filter(o => o.status !== 'completed').length

  return (
    <div dir="rtl">
      {/* ── Tab Bar ── */}
      <div className="dash-tab-bar">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`dash-tab ${activeTab === key ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {key === 'orders' && pendingOrders > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {pendingOrders}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="dash-content">

        {/* ── Stats Row ── */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
            {[
              { label: 'المطاعم', value: restaurants.length, color: '#3B82F6', emoji: '🏪' },
              { label: 'التصنيفات', value: platformCategories.length, color: '#10B981', emoji: '🗂️' },
              { label: 'الإعلانات', value: platformAds.length, color: '#F59E0B', emoji: '📣' },
              { label: 'الطلبات', value: orders.length, color: '#F97316', emoji: '📦' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ background: s.color + '18' }}>
                  {s.emoji}
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-bold text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-slate-400">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            RESTAURANTS TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'restaurants' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">المطاعم المسجلة</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{restaurants.length} مطعم مسجل في المنصة</p>
              </div>
              <button
                onClick={() => { setShowResForm(!showResForm); setEditResId(null); setSelectedCatIds([]); setResForm(emptyRes) }}
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>مطعم جديد</span>
              </button>
            </div>

            {/* Restaurant Form */}
            {showResForm && (
              <div className="c-card mb-6 animate-slide-down border-t-4 border-t-orange-500">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800">{editResId ? '✏️ تعديل بيانات المطعم' : '🏪 إضافة مطعم جديد'}</h3>
                  <button onClick={() => { setShowResForm(false); setEditResId(null) }} className="btn btn-ghost btn-sm">
                    <X size={16} />
                  </button>
                </div>
                <div className="c-card-body">
                  <form onSubmit={handleResSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="f-label">اسم المطعم *</label>
                        <input type="text" required value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="f-input" placeholder="مثال: مطعم الأصيل" />
                      </div>
                      <div>
                        <label className="f-label">الرابط (Slug) *</label>
                        <input type="text" required dir="ltr" value={resForm.slug} onChange={e => setResForm({ ...resForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="f-input text-left" placeholder="alasil" />
                      </div>
                      <div>
                        <label className="f-label">رقم الواتساب *</label>
                        <input type="text" required dir="ltr" placeholder="+96512345678" value={resForm.whatsapp_number} onChange={e => setResForm({ ...resForm, whatsapp_number: e.target.value })} className="f-input text-left" />
                      </div>
                      <div>
                        <label className="f-label">اللون الأساسي</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={resForm.primary_color} onChange={e => setResForm({ ...resForm, primary_color: e.target.value })} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white" />
                          <span className="text-xs font-mono text-slate-500 uppercase">{resForm.primary_color}</span>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="f-label">📱 رقم هاتف صاحب المطعم (لتسجيل الدخول)</label>
                        <input type="text" dir="ltr" placeholder="5352574134 أو +905352574134" value={resForm.owner_phone} onChange={e => setResForm({ ...resForm, owner_phone: e.target.value })} className="f-input text-left" />
                      </div>
                    </div>

                    {/* Platform categories */}
                    {platformCategories.length > 0 && (
                      <div>
                        <label className="f-label mb-2">تصنيفات المنصة (اختر ما ينطبق)</label>
                        <div className="flex flex-wrap gap-2">
                          {platformCategories.map(c => {
                            const isSelected = selectedCatIds.includes(c.id)
                            return (
                              <button key={c.id} type="button" onClick={() => toggleCat(c.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isSelected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                              >
                                <span>{c.icon}</span>
                                <span>{c.name}</span>
                                {isSelected && <CheckCircle size={12} className="text-green-400" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="f-label mb-2">لوجو المطعم</label>
                        <ImageUpload value={resForm.logo_url} onChange={(url) => setResForm({ ...resForm, logo_url: url })} />
                      </div>
                      <div>
                        <label className="f-label mb-2">صورة الغلاف</label>
                        <ImageUpload value={resForm.cover_url} onChange={(url) => setResForm({ ...resForm, cover_url: url })} />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5"><MapPin size={15} className="text-blue-500" />موقع المطعم</h4>
                          <p className="text-xs text-slate-400 mt-0.5">مطلوب لإظهار المطعم للمستخدمين القريبين</p>
                        </div>
                        <button type="button" onClick={() => {
                          if (!navigator.geolocation) return alert('المتصفح لا يدعم تحديد الموقع')
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setResForm({ ...resForm, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }),
                            () => alert('تعذر تحديد الموقع')
                          )
                        }} className="btn btn-primary btn-sm shrink-0">
                          <MapPin size={14} /> موقعي الحالي
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">الإحداثيات (lat, lng)</label>
                          <input type="text" dir="ltr" placeholder="41.0082, 28.9784"
                            value={resForm.latitude && resForm.longitude ? `${resForm.latitude}, ${resForm.longitude}` : (resForm.latitude || '')}
                            onChange={e => {
                              const val = e.target.value
                              const parts = val.split(',')
                              if (parts.length === 2) {
                                const lat = parts[0].trim(), lng = parts[1].trim()
                                if (!isNaN(Number(lat)) && !isNaN(Number(lng))) {
                                  setResForm({ ...resForm, latitude: lat, longitude: lng }); return
                                }
                              }
                              setResForm({ ...resForm, latitude: val, longitude: '' })
                            }}
                            className="f-input text-left bg-white" />
                        </div>
                        <div>
                          <label className="f-label">نطاق التوصيل (كم)</label>
                          <input type="number" min="1" max="100" step="0.5" value={resForm.delivery_radius_km}
                            onChange={e => setResForm({ ...resForm, delivery_radius_km: e.target.value })}
                            className="f-input bg-white" />
                        </div>
                      </div>
                      {resForm.latitude && resForm.longitude ? (
                        <a href={`https://www.google.com/maps?q=${resForm.latitude},${resForm.longitude}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                          <ExternalLink size={12} /> معاينة على Google Maps
                        </a>
                      ) : (
                        <p className="text-xs text-amber-600 font-bold">⚠️ لم يتم تحديد الموقع — المطعم لن يظهر للمستخدمين</p>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button type="button" onClick={() => { setShowResForm(false); setEditResId(null) }} className="btn btn-ghost">إلغاء</button>
                      <button type="submit" disabled={savingRes} className="btn btn-dark">
                        {savingRes ? 'جاري الحفظ...' : '💾 حفظ المطعم'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Restaurants Grid */}
            {restaurants.length === 0 ? (
              <div className="c-card text-center py-16">
                <p className="text-5xl mb-3">🏪</p>
                <p className="font-bold text-slate-400">لا توجد مطاعم مسجلة حتى الآن</p>
                <p className="text-xs text-slate-400 mt-1">اضغط "مطعم جديد" لإضافة أول مطعم</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {restaurants.map(r => {
                  const cats = (restaurantCategoryMap[r.id] || [])
                    .map(cid => platformCategories.find(c => c.id === cid))
                    .filter(Boolean)
                  return (
                    <div key={r.id} className="c-card flex flex-col hover:shadow-md transition-shadow duration-200">
                      {/* Cover */}
                      <div className="h-28 relative overflow-hidden">
                        {r.cover_url
                          ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${r.primary_color}cc 0%, ${r.primary_color}55 100%)` }} />
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                        {r.logo_url && (
                          <img src={r.logo_url} alt="" className="absolute bottom-3 right-4 w-12 h-12 rounded-full border-2 border-white object-contain bg-white shadow-md" />
                        )}
                      </div>
                      {/* Body */}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="mb-3">
                          <h3 className="font-black text-base text-slate-900">{r.name}</h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">/m/{r.slug}</p>
                        </div>
                        {cats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {cats.map((c: any) => (
                              <span key={c.id} className="badge badge-gray">{c.icon} {c.name}</span>
                            ))}
                          </div>
                        )}
                        {r.whatsapp_number && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mb-3">
                            <Phone size={11} /> {r.whatsapp_number}
                          </p>
                        )}
                        <div className="mt-auto flex flex-col gap-2">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditRes(r)} className="btn btn-ghost btn-sm flex-1">
                              <Settings size={14} /> إعدادات
                            </button>
                            <Link href={`/admin/restaurant/${r.id}`} className="btn btn-sm flex-[2] bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100">
                              <Edit size={14} /> إدارة المنيو
                            </Link>
                            <button onClick={() => handleDeleteRes(r.id, r.name)} className="btn btn-danger btn-sm">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <Link href="/dashboard" target="_blank" className="btn btn-sm bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 w-full">
                            🏪 لوحة صاحب المطعم
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            CATEGORIES TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'categories' && (
          <div className="animate-fade-in-up max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">تصنيفات المنصة</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{platformCategories.length} تصنيف مضاف</p>
              </div>
              <button onClick={() => setShowCatForm(!showCatForm)} className="btn btn-primary">
                <Plus size={16} /> تصنيف جديد
              </button>
            </div>

            {showCatForm && (
              <div className="c-card mb-5 animate-slide-down">
                <div className="c-card-body">
                  <form onSubmit={handleCatSubmit} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="f-label">اسم التصنيف</label>
                      <input type="text" required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} className="f-input" placeholder="مثال: شاورما" />
                    </div>
                    <div className="w-20">
                      <label className="f-label">أيقونة</label>
                      <input type="text" value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} className="f-input text-center text-lg" placeholder="🍔" />
                    </div>
                    <button type="submit" className="btn btn-dark">{editCatId ? 'حفظ' : 'إضافة'}</button>
                    <button type="button" onClick={() => { setShowCatForm(false); setEditCatId(null) }} className="btn btn-ghost"><X size={16} /></button>
                  </form>
                </div>
              </div>
            )}

            <div className="c-card overflow-hidden">
              {platformCategories.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-4xl mb-2">🗂️</p>
                  <p className="font-bold">لا توجد تصنيفات بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {platformCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">{cat.icon}</div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-400">{Object.values(restaurantCategoryMap).filter(ids => ids.includes(cat.id)).length} مطعم</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon || '' }); setShowCatForm(true) }} className="btn btn-ghost btn-sm text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => deleteCat(cat.id)} className="btn btn-danger btn-sm">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            ADS TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'ads' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">الإعلانات والسلايدر</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{platformAds.length} إعلان نشط</p>
              </div>
              <button onClick={() => setShowAdForm(!showAdForm)} className="btn btn-primary">
                <Plus size={16} /> إعلان جديد
              </button>
            </div>

            {showAdForm && (
              <div className="c-card mb-6 animate-slide-down">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800">إضافة إعلان جديد</h3>
                  <button onClick={() => setShowAdForm(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
                </div>
                <div className="c-card-body">
                  <form onSubmit={handleAdSubmit} className="space-y-4">
                    <div>
                      <label className="f-label mb-2">صورة الإعلان</label>
                      <ImageUpload value={adForm.image_url} onChange={(url) => setAdForm({ ...adForm, image_url: url })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex-1">
                        <label className="f-label">رابط التوجيه (اختياري)</label>
                        <input type="text" dir="ltr" value={adForm.link_url} onChange={e => setAdForm({ ...adForm, link_url: e.target.value })} className="f-input text-left" placeholder="https://..." />
                      </div>
                      <div className="flex-1">
                        <label className="f-label">المنطقة المستهدفة للإعلان</label>
                        <select
                          value={['جميع المناطق', 'شايروفا / كيبزة', 'إسطنبول', 'كوجالي'].includes(adForm.target_region) ? adForm.target_region : 'custom'}
                          onChange={e => {
                            const val = e.target.value
                            if (val === 'جميع المناطق') {
                              setAdForm({ ...adForm, target_region: 'جميع المناطق', latitude: null, longitude: null, radius_km: null })
                            } else if (val === 'شايروفا / كيبزة') {
                              setAdForm({ ...adForm, target_region: 'شايروفا / كيبزة', latitude: 40.8167, longitude: 29.3750, radius_km: 15 })
                            } else if (val === 'إسطنبول') {
                              setAdForm({ ...adForm, target_region: 'إسطنبول', latitude: 41.0082, longitude: 28.9784, radius_km: 30 })
                            } else if (val === 'كوجالي') {
                              setAdForm({ ...adForm, target_region: 'كوجالي', latitude: 40.7654, longitude: 29.9408, radius_km: 25 })
                            } else {
                              setAdForm({ ...adForm, target_region: '', latitude: null, longitude: null, radius_km: null })
                            }
                          }}
                          className="f-input mb-2"
                        >
                          <option value="جميع المناطق">جميع المناطق (عام للجميع)</option>
                          <option value="شايروفا / كيبزة">📍 شايروفا / كيبزة (دائرة 15 كم بـ GPS)</option>
                          <option value="إسطنبول">📍 إسطنبول (دائرة 30 كم بـ GPS)</option>
                          <option value="كوجالي">📍 كوجالي (دائرة 25 كم بـ GPS)</option>
                          <option value="custom">✍️ إدخال منطقة مخصصة بالاسم...</option>
                        </select>


                        {!['جميع المناطق', 'شايروفا / كيبزة', 'إسطنبول', 'كوجالي'].includes(adForm.target_region) && (
                          <input
                            type="text"
                            value={adForm.target_region}
                            onChange={e => setAdForm({ ...adForm, target_region: e.target.value })}
                            className="f-input"
                            placeholder="اكتب اسم المنطقة المخصصة هنا..."
                          />
                        )}
                      </div>

                    </div>
                    <div className="w-28">
                      <label className="f-label">الترتيب</label>
                      <input type="number" value={adForm.sort_order} onChange={e => setAdForm({ ...adForm, sort_order: parseInt(e.target.value) || 0 })} className="f-input" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAdForm(false)} className="btn btn-ghost">إلغاء</button>
                      <button type="submit" className="btn btn-dark">💾 حفظ الإعلان</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {platformAds.length === 0 ? (
              <div className="c-card text-center py-16">
                <p className="text-5xl mb-3">📣</p>
                <p className="font-bold text-slate-400">لا توجد إعلانات حتى الآن</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platformAds.map(ad => (
                  <div key={ad.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-[21/9]">
                    <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/20 z-10">
                      📍 {ad.target_region || 'جميع المناطق'}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                      <button onClick={() => deleteAd(ad.id)} className="btn btn-danger">
                        <Trash2 size={16} /> حذف
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            ORDERS TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'orders' && (
          <div className="animate-fade-in-up">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-800">الطلبات الواردة</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{orders.length} طلب — {pendingOrders} بانتظار التأكيد</p>
            </div>
            <div className="c-card overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">📦</p>
                  <p className="font-bold text-slate-400">لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>المطعم</th>
                        <th>الوجبات</th>
                        <th>الإجمالي</th>
                        <th>الموقع</th>
                        <th>الوقت</th>
                        <th>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td>
                            <span className="font-mono text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                              {order.id.split('-')[0].toUpperCase()}
                            </span>
                          </td>
                          <td className="font-black text-slate-900">{order.restaurants?.name}</td>
                          <td>
                            <ul className="space-y-0.5 text-xs text-slate-600">
                              {order.items.map((item: any, i: number) => (
                                <li key={i}>
                                  <span className="badge badge-gray">{item.quantity}x</span> {item.name}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            <span className="font-black text-orange-600">{order.total_price?.toFixed(2)} ₺</span>
                          </td>
                          <td>
                            {order.location_url && (
                              <a href={order.location_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm text-blue-600 border-blue-100 bg-blue-50">
                                <MapPin size={12} /> خريطة
                              </a>
                            )}
                          </td>
                          <td className="text-xs text-slate-400 font-medium">
                            {new Date(order.created_at).toLocaleString('ar-SA', { hour12: true })}
                          </td>
                          <td>
                            <button
                              onClick={async () => {
                                if (order.status === 'completed') return
                                if (confirm('تغيير الطلب إلى مكتمل؟')) {
                                  await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
                                  fetchData()
                                }
                              }}
                              className={`badge cursor-pointer transition ${order.status === 'completed' ? 'badge-green' : 'badge-amber hover:bg-amber-100'}`}
                            >
                              <CheckCircle size={12} />
                              {order.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
