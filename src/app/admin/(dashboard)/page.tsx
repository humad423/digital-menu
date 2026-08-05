'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import { Plus, Edit, Settings, Trash2, LayoutGrid, Image as ImageIcon, Store, ClipboardList, CheckCircle } from 'lucide-react'

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [platformCategories, setPlatformCategories] = useState<any[]>([])
  const [platformAds, setPlatformAds] = useState<any[]>([])
  const [restaurantCategoryMap, setRestaurantCategoryMap] = useState<Record<string, string[]>>({})
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'restaurants' | 'categories' | 'ads' | 'orders'>('restaurants')

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    const { data: resData } = await supabase.from('restaurants').select('*').order('created_at', { ascending: false })
    if (resData) setRestaurants(resData)

    const { data: catData } = await supabase.from('platform_categories').select('*').order('created_at', { ascending: true })
    if (catData) setPlatformCategories(catData)

    const { data: adsData } = await supabase.from('platform_ads').select('*').order('sort_order', { ascending: true })
    if (adsData) setPlatformAds(adsData)

    // Fetch restaurant-category relationships
    const { data: relData } = await supabase.from('restaurant_platform_categories').select('*')
    if (relData) {
      const map: Record<string, string[]> = {}
      relData.forEach(r => {
        if (!map[r.restaurant_id]) map[r.restaurant_id] = []
        map[r.restaurant_id].push(r.platform_category_id)
      })
      setRestaurantCategoryMap(map)
    }

    const { data: ordData } = await supabase.from('orders').select('*, restaurants(name)').order('created_at', { ascending: false })
    if (ordData) setOrders(ordData)

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Restaurants Logic ──────────────────────────────────────────
  const [showResForm, setShowResForm] = useState(false)
  const [editResId, setEditResId] = useState<string | null>(null)
  const [resForm, setResForm] = useState({
    name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '', logo_url: '', cover_url: '',
    latitude: '', longitude: '', delivery_radius_km: '5'
  })
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([])
  const [savingRes, setSavingRes] = useState(false)

  const toggleCat = (catId: string) => {
    setSelectedCatIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

  const handleResSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRes(true)

    const payload = {
      name: resForm.name,
      slug: resForm.slug,
      primary_color: resForm.primary_color,
      whatsapp_number: resForm.whatsapp_number,
      logo_url: resForm.logo_url || null,
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
      const { data, error } = await supabase.from('restaurants').insert([payload]).select().single()
      if (error || !data) { alert('حدث خطأ. تأكد أن الرابط (Slug) غير مكرر.'); setSavingRes(false); return }
      restaurantId = data.id
    }

    // Sync junction table
    if (restaurantId) {
      await supabase.from('restaurant_platform_categories').delete().eq('restaurant_id', restaurantId)
      if (selectedCatIds.length > 0) {
        await supabase.from('restaurant_platform_categories').insert(
          selectedCatIds.map(cid => ({ restaurant_id: restaurantId, platform_category_id: cid }))
        )
      }

      // Sync owner phone number to profiles table if provided
      if (resForm.owner_phone.trim()) {
        let rawPhone = resForm.owner_phone.trim().replace(/\s+/g, '')
        if (rawPhone.startsWith('0')) rawPhone = rawPhone.replace(/^0+/, '')
        const formattedPhone = rawPhone.startsWith('+') ? rawPhone : '+90' + rawPhone

        const { data: existingProf } = await supabase
          .from('profiles')
          .select('*')
          .eq('phone', formattedPhone)
          .limit(1)

        if (existingProf && existingProf.length > 0) {
          await supabase
            .from('profiles')
            .update({ role: 'restaurant_owner', restaurant_id: restaurantId })
            .eq('id', existingProf[0].id)
        } else {
          const fakeUid = 'owner-uid-' + formattedPhone.replace(/[^0-9]/g, '')
          await supabase
            .from('profiles')
            .insert([{
              id: fakeUid,
              phone: formattedPhone,
              full_name: 'صاحب مطعم ' + resForm.name,
              role: 'restaurant_owner',
              restaurant_id: restaurantId
            }])
        }
      }
    }

    setSavingRes(false)
    setShowResForm(false)
    setEditResId(null)
    setResForm({ name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '', logo_url: '', cover_url: '', latitude: '', longitude: '', delivery_radius_km: '5' })
    setSelectedCatIds([])
    fetchData()
  }

  const handleEditRes = (r: any) => {
    setEditResId(r.id)
    setResForm({
      name: r.name, slug: r.slug, primary_color: r.primary_color || '#ea580c',
      whatsapp_number: r.whatsapp_number, owner_phone: r.owner_phone || '', logo_url: r.logo_url || '', cover_url: r.cover_url || '',
      latitude: r.latitude?.toString() || '',
      longitude: r.longitude?.toString() || '',
      delivery_radius_km: r.delivery_radius_km?.toString() || '5'
    })
    setSelectedCatIds(restaurantCategoryMap[r.id] || [])
    setShowResForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRes = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${name}" بالكامل؟`)) {
      await supabase.from('restaurants').delete().eq('id', id)
      fetchData()
    }
  }

  // ── Platform Categories Logic ──────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', icon: '' })

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editCatId) {
      await supabase.from('platform_categories').update(catForm).eq('id', editCatId)
    } else {
      await supabase.from('platform_categories').insert([catForm])
    }
    setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '' }); fetchData()
  }

  const deleteCat = async (id: string) => {
    if (confirm('حذف التصنيف؟')) { await supabase.from('platform_categories').delete().eq('id', id); fetchData() }
  }

  // ── Platform Ads Logic ─────────────────────────────────────────
  const [showAdForm, setShowAdForm] = useState(false)
  const [adForm, setAdForm] = useState({ image_url: '', link_url: '', sort_order: 0 })

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adForm.image_url) return alert('الصورة مطلوبة')
    await supabase.from('platform_ads').insert([adForm])
    setShowAdForm(false); setAdForm({ image_url: '', link_url: '', sort_order: 0 }); fetchData()
  }

  const deleteAd = async (id: string) => {
    if (confirm('حذف هذا الإعلان؟')) { await supabase.from('platform_ads').delete().eq('id', id); fetchData() }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">لوحة الإدارة المركزية</h2>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-200 hide-scrollbar">
        {([['restaurants', 'المطاعم', Store], ['categories', 'تصنيفات المنصة', LayoutGrid], ['ads', 'إعلانات المنصة', ImageIcon], ['orders', 'الطلبات', ClipboardList]] as any[]).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`px-5 py-2.5 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-500">جاري التحميل...</div>}

      {/* RESTAURANTS TAB */}
      {!loading && activeTab === 'restaurants' && (
        <div>
          <div className="flex justify-end mb-6">
            <button onClick={() => { setShowResForm(!showResForm); setEditResId(null); setSelectedCatIds([]); setResForm({ name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '', logo_url: '', cover_url: '', latitude: '', longitude: '', delivery_radius_km: '5' }) }} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-blue-700 transition">
              <Plus size={20} /> إضافة مطعم
            </button>
          </div>

          {showResForm && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 border-t-4 border-t-blue-600">
              <h3 className="text-lg font-bold mb-4">{editResId ? 'تعديل المطعم' : 'مطعم جديد'}</h3>
              <form onSubmit={handleResSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم المطعم</label>
                    <input type="text" required value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (Slug - إنجليزي)</label>
                    <input type="text" required dir="ltr" value={resForm.slug} onChange={e => setResForm({ ...resForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الواتساب</label>
                    <input type="text" required dir="ltr" placeholder="96512345678" value={resForm.whatsapp_number} onChange={e => setResForm({ ...resForm, whatsapp_number: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-left" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اللون الأساسي</label>
                    <input type="color" value={resForm.primary_color} onChange={e => setResForm({ ...resForm, primary_color: e.target.value })} className="w-full h-10 border-0 p-0 rounded-xl cursor-pointer" />
                  </div>
                  <div className="md:col-span-2 bg-orange-50/70 p-3 rounded-xl border border-orange-100">
                    <label className="block text-xs font-bold text-orange-900 mb-1">📱 رقم هاتف صاحب المطعم (لتسجيل دخوله في /dashboard)</label>
                    <input type="text" dir="ltr" placeholder="5352574134 أو +905352574134" value={resForm.owner_phone} onChange={e => setResForm({ ...resForm, owner_phone: e.target.value })} className="w-full px-4 py-2 border border-orange-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none text-left bg-white" />
                  </div>
                </div>

                {/* Multi-select platform categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تصنيفات المنصة <span className="text-gray-400 font-normal">(يمكن اختيار أكثر من تصنيف)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {platformCategories.map(c => {
                      const isSelected = selectedCatIds.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleCat(c.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-all"
                          style={isSelected
                            ? { background: '#1A1A2E', color: '#fff', borderColor: '#1A1A2E' }
                            : { background: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }
                          }
                        >
                          <span>{c.icon}</span>
                          <span>{c.name}</span>
                          {isSelected && <span className="text-green-400 mr-1">✓</span>}
                        </button>
                      )
                    })}
                    {platformCategories.length === 0 && <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl">أضف تصنيفات من تبويب "تصنيفات المنصة" أولاً</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">لوجو المطعم</label>
                    <ImageUpload value={resForm.logo_url} onChange={(url) => setResForm({ ...resForm, logo_url: url })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">صورة الغلاف (Hero Banner)</label>
                    <ImageUpload value={resForm.cover_url} onChange={(url) => setResForm({ ...resForm, cover_url: url })} />
                  </div>
                </div>

                {/* Location Section */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">📍 موقع المطعم ونطاق التوصيل</h4>
                      <p className="text-xs text-gray-500 mt-0.5">مطلوب لعرض المطعم للمستخدمين القريبين</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) return alert('المتصفح لا يدعم تحديد الموقع')
                        navigator.geolocation.getCurrentPosition(
                          (pos) => setResForm({ ...resForm, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }),
                          () => alert('تعذر تحديد الموقع')
                        )
                      }}
                      className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shrink-0"
                    >
                      📍 استخدم موقعي الحالي
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">الإحداثيات (الصق من خرائط جوجل)</label>
                      <input 
                        type="text" 
                        dir="ltr" 
                        placeholder="41.0082, 28.9784" 
                        value={resForm.latitude && resForm.longitude ? `${resForm.latitude}, ${resForm.longitude}` : (resForm.latitude || '')}
                        onChange={e => {
                          const val = e.target.value;
                          const parts = val.split(',');
                          if (parts.length === 2) {
                            const lat = parts[0].trim();
                            const lng = parts[1].trim();
                            if (lat !== '' && lng !== '' && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                              setResForm({ ...resForm, latitude: lat, longitude: lng });
                              return;
                            }
                          }
                          setResForm({ ...resForm, latitude: val, longitude: '' });
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">نطاق التوصيل (كم)</label>
                      <input type="number" min="1" max="100" step="0.5" value={resForm.delivery_radius_km}
                        onChange={e => setResForm({ ...resForm, delivery_radius_km: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  {resForm.latitude && resForm.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${resForm.latitude},${resForm.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 font-bold underline"
                    >
                      🗺️ معاينة الموقع على Google Maps
                    </a>
                  )}
                  {(!resForm.latitude || !resForm.longitude) && (
                    <p className="text-xs text-amber-600">⚠️ لم يتم تحديد الموقع بعد — المطعم لن يظهر للمستخدمين</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end mt-4">
                  <button type="button" onClick={() => { setShowResForm(false); setEditResId(null); setSelectedCatIds([]) }} className="px-6 py-2 rounded-xl border border-gray-200 font-medium hover:bg-gray-50">إلغاء</button>
                  <button type="submit" disabled={savingRes} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50">{savingRes ? 'جاري الحفظ...' : 'حفظ المطعم'}</button>
                </div>
              </form>
            </div>
          )}

          {restaurants.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">لا توجد مطاعم حتى الآن</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map(r => {
                const cats = (restaurantCategoryMap[r.id] || [])
                  .map(cid => platformCategories.find(c => c.id === cid))
                  .filter(Boolean)
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
                    <div className="h-24 bg-gray-100 relative">
                      {r.cover_url ? <img src={r.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${r.primary_color}cc, ${r.primary_color}66)` }} />}
                      {r.logo_url && <img src={r.logo_url} alt="" className="w-12 h-12 rounded-full border-2 border-white absolute -bottom-4 right-4 object-contain bg-white" />}
                    </div>
                    <div className="p-5 pt-6 flex-1 flex flex-col">
                      <div className="mb-2">
                        <h3 className="font-bold text-lg text-gray-900">{r.name}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">/m/{r.slug}</p>
                      </div>
                      {/* Category tags */}
                      {cats.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {cats.map((c: any) => (
                            <span key={c.id} className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{c.icon} {c.name}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-col gap-2 mt-auto pt-3">
                        <div className="flex gap-2">
                          <button onClick={() => handleEditRes(r)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition flex items-center justify-center gap-1">
                            <Settings size={15} /> إعدادات
                          </button>
                          <Link href={`/admin/restaurant/${r.id}`} className="flex-[2] bg-blue-50 text-blue-700 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition flex items-center justify-center gap-1">
                            <Edit size={15} /> إدارة المنيو والعروض
                          </Link>
                          <button onClick={() => handleDeleteRes(r.id, r.name)} className="bg-red-50 text-red-600 px-3 rounded-xl hover:bg-red-100 transition flex items-center justify-center">
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <Link
                          href="/dashboard"
                          target="_blank"
                          className="w-full bg-orange-50 text-orange-700 border border-orange-200 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-100 transition flex items-center justify-center gap-1.5"
                        >
                          <span>🏪 رابط لوحة صاحب المطعم (/dashboard)</span>
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

      {/* CATEGORIES TAB */}
      {!loading && activeTab === 'categories' && (
        <div className="max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">تصنيفات المأكولات</h3>
            <button onClick={() => setShowCatForm(!showCatForm)} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-blue-700 transition">
              <Plus size={20} /> إضافة تصنيف
            </button>
          </div>

          {showCatForm && (
            <form onSubmit={handleCatSubmit} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التصنيف</label>
                <input type="text" required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="مثال: شاورما" className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">أيقونة</label>
                <input type="text" value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl text-center" placeholder="🍔" />
              </div>
              <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium h-[42px]">{editCatId ? 'حفظ' : 'إضافة'}</button>
            </form>
          )}

          <div className="space-y-3">
            {platformCategories.map(cat => (
              <div key={cat.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl bg-gray-50 w-10 h-10 flex items-center justify-center rounded-lg">{cat.icon}</span>
                  <div>
                    <span className="font-bold text-lg">{cat.name}</span>
                    <p className="text-xs text-gray-400">{Object.values(restaurantCategoryMap).filter(ids => ids.includes(cat.id)).length} مطعم</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditCatId(cat.id); setCatForm({ name: cat.name, icon: cat.icon || '' }); setShowCatForm(true) }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"><Edit size={18} /></button>
                  <button onClick={() => deleteCat(cat.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADS TAB */}
      {!loading && activeTab === 'ads' && (
        <div className="max-w-4xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">السلايدر الإعلاني الرئيسي</h3>
            <button onClick={() => setShowAdForm(!showAdForm)} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-blue-700 transition">
              <Plus size={20} /> إضافة إعلان
            </button>
          </div>

          {showAdForm && (
            <form onSubmit={handleAdSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">صورة الإعلان</label>
                <ImageUpload value={adForm.image_url} onChange={(url) => setAdForm({ ...adForm, image_url: url })} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">رابط التوجيه (اختياري)</label>
                  <input type="text" dir="ltr" value={adForm.link_url} onChange={e => setAdForm({ ...adForm, link_url: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" placeholder="https://..." />
                </div>
                <div className="w-28">
                  <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
                  <input type="number" value={adForm.sort_order} onChange={e => setAdForm({ ...adForm, sort_order: parseInt(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAdForm(false)} className="px-6 py-2 rounded-xl border border-gray-200">إلغاء</button>
                <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium">حفظ الإعلان</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platformAds.map(ad => (
              <div key={ad.id} className="relative group rounded-2xl overflow-hidden border border-gray-200 shadow-sm aspect-[21/9]">
                <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={() => deleteAd(ad.id)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ORDERS TAB */}
      {!loading && activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-10 text-gray-500">لا توجد طلبات حتى الآن</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-6 py-4 font-black">رقم الطلب</th>
                    <th className="px-6 py-4 font-black">المطعم</th>
                    <th className="px-6 py-4 font-black">التفاصيل</th>
                    <th className="px-6 py-4 font-black">الإجمالي</th>
                    <th className="px-6 py-4 font-black">الموقع</th>
                    <th className="px-6 py-4 font-black">الوقت</th>
                    <th className="px-6 py-4 font-black">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {order.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">
                        {order.restaurants?.name}
                      </td>
                      <td className="px-6 py-4">
                        <ul className="space-y-1 text-xs text-gray-600">
                          {order.items.map((item: any, i: number) => (
                            <li key={i}>{item.quantity}x {item.name}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 font-black text-orange-600">
                        {order.total_price.toFixed(2)} ₺
                      </td>
                      <td className="px-6 py-4">
                        <a href={order.location_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-1">
                          📍 الخريطة
                        </a>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString('ar-SA', { hour12: true })}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={async () => {
                            if (order.status === 'completed') return
                            if (confirm('تغيير حالة الطلب إلى مكتمل؟')) {
                              await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
                              fetchData()
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${
                            order.status === 'completed'
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          }`}
                        >
                          <CheckCircle size={14} />
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
      )}
    </div>
  )
}
