'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import ImageUpload from '@/components/ImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut, Store, Tag, Utensils, X, Eye, Bike, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function AdminRestaurantPanel({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { logout, profile } = useAuth()
  const resolvedParams = params && typeof (params as any).then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as unknown as { id: string })
  const id = resolvedParams?.id

  const [restaurant, setRestaurant]   = useState<any>(null)
  const [categories, setCategories]   = useState<any[]>([])
  const [menuItems, setMenuItems]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const supabase = createClient()

  // ── Sub-category State ─────────────────────────────────────────
  const [newCatName, setNewCatName]   = useState('')
  const [editCatId, setEditCatId]     = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatSort, setEditCatSort] = useState(0)

  // ── Item State ─────────────────────────────────────────────────
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItemId, setEditItemId]     = useState<string | null>(null)
  const [itemForm, setItemForm]         = useState({
    category_id: '', name: '', description: '', price: '', image_url: '', is_available: true,
    is_offer: false, original_price: '', offer_title: ''
  })
  const [savingItem, setSavingItem] = useState(false)

  // ── Offers State ────────────────────────────────────────────────
  const [offers, setOffers]           = useState<any[]>([])
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [editOfferId, setEditOfferId] = useState<string | null>(null)
  const [offerForm, setOfferForm]     = useState({
    primary_item_id: '',
    min_quantity: '1',
    bonus_item_id: '',
    bonus_quantity: '1',
    title: '',
    description: '',
    original_price: '',
    offer_price: '',
    image_url: '',
    is_active: true
  })
  const [savingOffer, setSavingOffer] = useState(false)

  // ── Delivery Tiers State ─────────────────────────────────────────
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [newTier, setNewTier]             = useState({ min_km: '', max_km: '', fee: '', is_active: true })
  const [savingTiers, setSavingTiers]     = useState(false)

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const { data: resData } = await supabase.from('restaurants').select('*').eq('id', id).maybeSingle()
      if (resData) {
        setRestaurant(resData)
        setDeliveryTiers(resData.delivery_tiers || [
          { min_km: 0, max_km: 10, fee: 25, is_active: true },
          { min_km: 10, max_km: 20, fee: 50, is_active: true },
          { min_km: 20, max_km: 30, fee: 85, is_active: true }
        ])
      }

      const { data: catData } = await supabase.from('categories').select('*').eq('restaurant_id', id).order('sort_order', { ascending: true })
      if (catData) setCategories(catData)

      const { data: itemData } = await supabase
        .from('menu_items').select('*')
        .in('category_id', catData?.map(c => c.id) || ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: true })
      if (itemData) setMenuItems(itemData)

      const { data: offerData } = await supabase.from('offers').select('*').eq('restaurant_id', id).order('created_at', { ascending: false })
      if (offerData) setOffers(offerData)
    } catch (err) {
      console.error('Error fetching admin restaurant data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) fetchData()
  }, [id])

  // ── Sub-categories CRUD ────────────────────────────────────────
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editCatId) {
      await supabase.from('categories').update({ name: editCatName, sort_order: editCatSort }).eq('id', editCatId)
      setEditCatId(null)
    } else {
      const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) + 1 : 1
      await supabase.from('categories').insert([{ restaurant_id: id, name: newCatName, sort_order: maxSort }])
      setNewCatName('')
    }
    fetchData()
  }

  const deleteCategory = async (catId: string, name: string) => {
    if (confirm(`حذف القسم "${name}" مع كافة منتجاته؟`)) {
      await supabase.from('categories').delete().eq('id', catId)
      fetchData()
    }
  }

  // ── Delivery Tiers Handlers ─────────────────────────────────────
  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTier.min_km || !newTier.max_km || !newTier.fee) return alert('يرجى ملء كافة حقول الشريحة')

    const updated = [
      ...deliveryTiers,
      {
        min_km: parseFloat(newTier.min_km),
        max_km: parseFloat(newTier.max_km),
        fee: parseFloat(newTier.fee),
        is_active: newTier.is_active
      }
    ].sort((a, b) => a.min_km - b.min_km)

    setDeliveryTiers(updated)
    await saveTiersToDb(updated)
    setNewTier({ min_km: '', max_km: '', fee: '', is_active: true })
  }

  const toggleTierActive = async (index: number) => {
    const updated = [...deliveryTiers]
    updated[index].is_active = !updated[index].is_active
    setDeliveryTiers(updated)
    await saveTiersToDb(updated)
  }

  const deleteTier = async (index: number) => {
    if (confirm('حذف شريحة التوصيل هذه؟')) {
      const updated = deliveryTiers.filter((_, i) => i !== index)
      setDeliveryTiers(updated)
      await saveTiersToDb(updated)
    }
  }

  const saveTiersToDb = async (tiers: any[]) => {
    setSavingTiers(true)
    await supabase.from('restaurants').update({ delivery_tiers: tiers }).eq('id', id)
    setSavingTiers(false)
  }

  // ── Items CRUD ──────────────────────────────────────────────────
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.category_id || !itemForm.name || !itemForm.price) return alert('يرجى ملء الحقول المطلوبة')
    setSavingItem(true)

    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      image_url: itemForm.image_url || null,
      is_available: itemForm.is_available,
      is_offer: itemForm.is_offer,
      original_price: itemForm.original_price ? parseFloat(itemForm.original_price) : null,
      offer_title: itemForm.offer_title || null
    }

    if (editItemId) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editItemId)
      if (error) {
        alert('خطأ في حفظ الوجبة: ' + error.message)
        setSavingItem(false)
        return
      }
    } else {
      const { error } = await supabase.from('menu_items').insert([payload])
      if (error) {
        alert('خطأ في إضافة الوجبة: ' + error.message)
        setSavingItem(false)
        return
      }
    }

    setSavingItem(false)
    setShowItemForm(false)
    setEditItemId(null)
    setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '' })
    fetchData()
  }

  const handleEditItem = (item: any) => {
    setEditItemId(item.id)
    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_offer: item.is_offer || false,
      original_price: item.original_price ? item.original_price.toString() : '',
      offer_title: item.offer_title || ''
    })
    setShowItemForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleItemAvailability = async (item: any) => {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    fetchData()
  }

  const deleteItem = async (itemId: string, name: string) => {
    if (confirm(`حذف الوجبة "${name}"؟`)) {
      await supabase.from('menu_items').delete().eq('id', itemId)
      fetchData()
    }
  }

  // ── Auto Offer Calculation ──────────────────────────────────────
  const handlePrimaryItemChange = (itemId: string) => {
    const primary = menuItems.find(i => i.id === itemId)
    const bonus = menuItems.find(i => i.id === offerForm.bonus_item_id)
    const minQty = parseInt(offerForm.min_quantity) || 1
    const bonusQty = parseInt(offerForm.bonus_quantity) || 1

    let origPrice = 0
    let autoTitle = ''

    if (primary) {
      origPrice += (primary.price || 0) * minQty
      autoTitle = `${minQty} ${primary.name}`
    }
    if (bonus) {
      origPrice += (bonus.price || 0) * bonusQty
      autoTitle += bonusQty > 1 ? ` + ${bonusQty} ${bonus.name}` : ` + ${bonus.name}`
    }

    setOfferForm(prev => ({
      ...prev,
      primary_item_id: itemId,
      original_price: origPrice > 0 ? origPrice.toString() : prev.original_price,
      title: autoTitle || prev.title
    }))
  }

  const handleBonusItemChange = (bonusId: string) => {
    const primary = menuItems.find(i => i.id === offerForm.primary_item_id)
    const bonus = menuItems.find(i => i.id === bonusId)
    const minQty = parseInt(offerForm.min_quantity) || 1
    const bonusQty = parseInt(offerForm.bonus_quantity) || 1

    let origPrice = 0
    let autoTitle = ''

    if (primary) {
      origPrice += (primary.price || 0) * minQty
      autoTitle = `${minQty} ${primary.name}`
    }
    if (bonus) {
      origPrice += (bonus.price || 0) * bonusQty
      autoTitle += bonusQty > 1 ? ` + ${bonusQty} ${bonus.name}` : ` + ${bonus.name}`
    }

    setOfferForm(prev => ({
      ...prev,
      bonus_item_id: bonusId,
      original_price: origPrice > 0 ? origPrice.toString() : prev.original_price,
      title: autoTitle || prev.title
    }))
  }

  // ── Offer CRUD ──────────────────────────────────────────────────
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerForm.primary_item_id || !offerForm.title || !offerForm.offer_price) return alert('يرجى ملء كافة الحقول الأساسية للعرض')
    setSavingOffer(true)

    const payload = {
      restaurant_id: id,
      primary_item_id: offerForm.primary_item_id,
      min_quantity: parseInt(offerForm.min_quantity) || 1,
      bonus_item_id: offerForm.bonus_item_id || null,
      bonus_quantity: parseInt(offerForm.bonus_quantity) || 1,
      title: offerForm.title,
      description: offerForm.description || null,
      original_price: offerForm.original_price ? parseFloat(offerForm.original_price) : null,
      offer_price: parseFloat(offerForm.offer_price),
      image_url: offerForm.image_url || null,
      is_active: offerForm.is_active
    }

    if (editOfferId) {
      const { error } = await supabase.from('offers').update(payload).eq('id', editOfferId)
      if (error) alert('خطأ في حفظ العرض: ' + error.message)
    } else {
      const { error } = await supabase.from('offers').insert([payload])
      if (error) alert('خطأ في إنشاء العرض: ' + error.message)
    }

    setSavingOffer(false)
    setShowOfferForm(false)
    setEditOfferId(null)
    setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true })
    fetchData()
  }

  const handleEditOffer = (offer: any) => {
    setEditOfferId(offer.id)
    setOfferForm({
      primary_item_id: offer.primary_item_id || '',
      min_quantity: (offer.min_quantity || 1).toString(),
      bonus_item_id: offer.bonus_item_id || '',
      bonus_quantity: (offer.bonus_quantity || 1).toString(),
      title: offer.title || '',
      description: offer.description || '',
      original_price: offer.original_price ? offer.original_price.toString() : '',
      offer_price: offer.offer_price ? offer.offer_price.toString() : '',
      image_url: offer.image_url || '',
      is_active: offer.is_active ?? true
    })
    setShowOfferForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteOffer = async (offerId: string, title: string) => {
    if (confirm(`حذف العرض "${title}"؟`)) {
      await supabase.from('offers').delete().eq('id', offerId)
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-black text-slate-300 text-sm">جاري تحميل بيانات إدارة المطعم والمنيو...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="text-5xl mb-4">🏪</div>
        <h1 className="text-xl font-black text-slate-200 mb-2">المطعم غير موجود</h1>
        <p className="text-slate-400 text-sm mb-6">لم نتمكن من العثور على المطعم المطلوب.</p>
        <Link href="/admin" className="c-btn c-btn-primary">
          العودة للوحة الإدارة الرئيسية
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32" dir="rtl">

      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Right: Back + Logo + Title */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition border border-slate-700"
              title="العودة للوحة الإدارة"
            >
              <ArrowRight size={18} />
            </Link>

            <div className="w-10 h-10 rounded-2xl bg-white p-1 border border-slate-700 shadow-sm shrink-0 overflow-hidden">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <div
                  className="w-full h-full rounded-xl flex items-center justify-center text-xs font-black text-white"
                  style={{ background: restaurant.primary_color || '#F97316' }}
                >
                  {restaurant.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-white">{restaurant.name}</h1>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-500/30">
                  إدارة المنيو (المدير)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">تحكم كامل بالأقسام والوجبات والعروض وشغف التوصيل</p>
            </div>
          </div>

          {/* Left: Preview + Logout */}
          <div className="flex items-center gap-2">
            <Link
              href={`/m/${restaurant.slug}`}
              target="_blank"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Eye size={14} className="text-orange-400" />
              <span>معاينة المنيو</span>
            </Link>

            <button
              onClick={() => logout()}
              className="px-3.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-black flex items-center gap-1.5 transition active:scale-95"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2 Cols): Item Form + Offers + Items ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. ADD / EDIT MENU ITEM FORM MODAL OR INLINE CARD */}
            {showItemForm && (
              <div className="bg-slate-800/90 border border-orange-500/40 rounded-3xl p-5 shadow-xl animate-fade-in relative">
                <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Utensils size={18} className="text-orange-400" />
                    <span>{editItemId ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}</span>
                  </h3>
                  <button
                    onClick={() => { setShowItemForm(false); setEditItemId(null); }}
                    className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-600 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveItem} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">القسم الفرعي *</label>
                      <select
                        value={itemForm.category_id}
                        onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                      >
                        <option value="">اختر القسم...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم الوجبة *</label>
                      <input
                        type="text"
                        placeholder="مثال: وجبة شاوما سوبر"
                        value={itemForm.name}
                        onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف الوجبة / المكونات</label>
                    <textarea
                      rows={2}
                      placeholder="مثال: تتضمن 2 سندويش شاورما كبير + بطاطا + صوص ثوم وقلم مخلل..."
                      value={itemForm.description}
                      onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">السعر (₺) *</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="150"
                        value={itemForm.price}
                        onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">صورة الوجبة</label>
                      <ImageUpload
                        value={itemForm.image_url}
                        onChange={url => setItemForm({ ...itemForm, image_url: url })}
                      />
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={itemForm.is_available}
                          onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })}
                          className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-200">الوجبة متوفرة للطلب الان</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => { setShowItemForm(false); setEditItemId(null); }}
                      className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={savingItem}
                      className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                    >
                      {savingItem ? 'جاري الحفظ...' : editItemId ? 'تحديث الوجبة' : 'حفظ وإضافة الوجبة'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. OFFERS & BUNDLES SECTION */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                    🔥
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">إدارة العروض والبكجات</h3>
                    <p className="text-[11px] text-slate-400 font-bold">أنشئ عروض تخفيض أو بكجات تجميعية تظهر للزبائن أعلى المنيو</p>
                  </div>
                </div>

                {!showOfferForm && (
                  <button
                    onClick={() => {
                      setEditOfferId(null)
                      setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true })
                      setShowOfferForm(true)
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Plus size={15} />
                    <span>إضافة عرض / بكج</span>
                  </button>
                )}
              </div>

              {/* Offer Builder Form */}
              {showOfferForm && (
                <div className="bg-slate-900/90 border border-orange-500/30 rounded-2xl p-4 mb-4 animate-fade-in space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-black text-xs text-orange-400">
                      {editOfferId ? 'تعديل العرض' : 'منشئ العروض والبكجات التلقائي'}
                    </h4>
                    <button onClick={() => { setShowOfferForm(false); setEditOfferId(null); }} className="text-slate-400 hover:text-white">
                      <X size={15} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveOffer} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">الوجبة الرئيسية *</label>
                        <select
                          value={offerForm.primary_item_id}
                          onChange={e => handlePrimaryItemChange(e.target.value)}
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        >
                          <option value="">اختر الوجبة الرئيسية...</option>
                          {menuItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">الكمية من الوجبة الرئيسية</label>
                        <input
                          type="number"
                          min="1"
                          value={offerForm.min_quantity}
                          onChange={e => setOfferForm({ ...offerForm, min_quantity: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">وجبة كهدية أو إضافية (اختياري)</label>
                        <select
                          value={offerForm.bonus_item_id}
                          onChange={e => handleBonusItemChange(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        >
                          <option value="">بدون هدية...</option>
                          {menuItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان العرض الترويجي *</label>
                        <input
                          type="text"
                          placeholder="مثال: عرض 2 مارغريتا + 1 كولا مجاناً"
                          value={offerForm.title}
                          onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">السعر الأصلي قبل الخصم (₺)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="180"
                          value={offerForm.original_price}
                          onChange={e => setOfferForm({ ...offerForm, original_price: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">سعر العرض الخاص (₺) *</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="135"
                          value={offerForm.offer_price}
                          onChange={e => setOfferForm({ ...offerForm, offer_price: e.target.value })}
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => { setShowOfferForm(false); setEditOfferId(null); }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={savingOffer}
                        className="px-4 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black transition disabled:opacity-50"
                      >
                        {savingOffer ? 'جاري الحفظ...' : editOfferId ? 'تعديل العرض' : 'حفظ ونشر العرض'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Offers List */}
              <div className="space-y-2.5">
                {offers.length === 0 ? (
                  <p className="text-xs text-slate-500 font-bold text-center py-4 border border-dashed border-slate-700 rounded-2xl">
                    لا توجد عروض مضاعفة أو بكجات حالياً لـ هذا المطعم.
                  </p>
                ) : (
                  offers.map(offer => (
                    <div key={offer.id} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-base shrink-0">
                          🔥
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-xs text-white truncate">{offer.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-bold">
                            <span className="text-orange-400 font-black">{offer.offer_price} ₺</span>
                            {offer.original_price && (
                              <span className="text-slate-500 line-through">{offer.original_price} ₺</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleEditOffer(offer)}
                          className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition"
                          title="تعديل العرض"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => deleteOffer(offer.id, offer.title)}
                          className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                          title="حذف العرض"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. MENU ITEMS LIST BY CATEGORY */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    🍱
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">المنتجات والوجبات</h3>
                    <p className="text-[11px] text-slate-400 font-bold">{menuItems.length} وجبة في {categories.length} قسم</p>
                  </div>
                </div>

                {!showItemForm && (
                  <button
                    onClick={() => {
                      setEditItemId(null)
                      setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '' })
                      setShowItemForm(true)
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Plus size={15} />
                    <span>وجبة جديدة</span>
                  </button>
                )}
              </div>

              {categories.map(cat => {
                const itemsInCat = menuItems.filter(i => i.category_id === cat.id)
                return (
                  <div key={cat.id} className="border-t border-slate-700/60 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-xs text-slate-200 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>{cat.name}</span>
                      </h4>
                      <span className="bg-slate-700/80 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {itemsInCat.length} وجبة
                      </span>
                    </div>

                    {itemsInCat.length === 0 ? (
                      <p className="text-[11px] text-slate-500 font-bold text-center py-3 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        لا توجد وجبات في هذا القسم بعد
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {itemsInCat.map(item => (
                          <div
                            key={item.id}
                            className={`bg-slate-900 border rounded-2xl p-3 flex items-center justify-between gap-3 transition ${
                              item.is_available ? 'border-slate-700/80' : 'border-red-900/40 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700">
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">🍲</div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <h5 className="font-black text-xs text-white truncate">{item.name}</h5>
                                <p className="text-xs font-black text-orange-400 mt-0.5">{item.price} ₺</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Availability Switch */}
                              <button
                                onClick={() => toggleItemAvailability(item)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                                  item.is_available
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                                title="تغيير التوفر"
                              >
                                {item.is_available ? 'متوفر' : 'غير متوفر'}
                              </button>

                              <button
                                onClick={() => handleEditItem(item)}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition"
                                title="تعديل الوجبة"
                              >
                                <Edit size={13} />
                              </button>

                              <button
                                onClick={() => deleteItem(item.id, item.name)}
                                className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                                title="حذف الوجبة"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

          </div>


          {/* ── RIGHT COLUMN (1 Col): Categories + Delivery Tiers ── */}
          <div className="space-y-6">

            {/* 1. SUB-CATEGORIES MANAGEMENT */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                    📂
                  </div>
                  <h3 className="font-black text-sm text-white">أقسام المنيو الفرعية</h3>
                </div>
                <span className="bg-slate-700 text-slate-300 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {categories.length}
                </span>
              </div>

              {/* Add New Category Form */}
              <form onSubmit={saveCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="اسم القسم الجديد..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                />
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </form>

              {/* Categories List */}
              <div className="space-y-2">
                {categories.map(cat => {
                  const count = menuItems.filter(i => i.category_id === cat.id).length
                  if (editCatId === cat.id) {
                    return (
                      <form key={cat.id} onSubmit={saveCategory} className="bg-slate-900 border border-orange-500/50 rounded-2xl p-2.5 space-y-2">
                        <input
                          type="text"
                          value={editCatName}
                          onChange={e => setEditCatName(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="number"
                            placeholder="الترتيب"
                            value={editCatSort}
                            onChange={e => setEditCatSort(parseInt(e.target.value) || 0)}
                            className="w-20 bg-slate-800 border border-slate-700 rounded-xl p-1.5 text-xs font-bold text-white"
                          />
                          <div className="flex gap-1">
                            <button type="button" onClick={() => setEditCatId(null)} className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300">إلغاء</button>
                            <button type="submit" className="px-3 py-1 rounded-lg bg-orange-500 text-xs font-black text-white">حفظ</button>
                          </div>
                        </div>
                      </form>
                    )
                  }

                  return (
                    <div key={cat.id} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical size={15} className="text-slate-500 shrink-0" />
                        <span className="font-black text-xs text-white truncate">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full shrink-0">
                          {count} وجبة
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatSort(cat.sort_order || 0); }}
                          className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition"
                          title="تعديل"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id, cat.name)}
                          className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                          title="حذف"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. DELIVERY TIERS MANAGER */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    🛵
                  </div>
                  <h3 className="font-black text-sm text-white">شرائح أجور التوصيل</h3>
                </div>
                {savingTiers && <span className="text-[10px] text-orange-400 font-bold animate-pulse">جاري الحفظ...</span>}
              </div>

              {/* Add Tier Form */}
              <form onSubmit={handleAddTier} className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">من (كم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={newTier.min_km}
                    onChange={e => setNewTier({ ...newTier, min_km: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">إلى (كم)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="10"
                    value={newTier.max_km}
                    onChange={e => setNewTier({ ...newTier, max_km: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">الأجرة TL</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="25"
                    value={newTier.fee}
                    onChange={e => setNewTier({ ...newTier, fee: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="col-span-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-sm"
                >
                  + إضافة شريحة توصيل
                </button>
              </form>

              {/* Tiers List */}
              <div className="space-y-2 pt-2">
                {deliveryTiers.map((tier, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Bike size={14} className="text-emerald-400 shrink-0" />
                      <span className="font-bold text-xs text-white">
                        {tier.min_km} - {tier.max_km} كم
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-emerald-400">{tier.fee} TL</span>
                      <button
                        onClick={() => toggleTierActive(idx)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tier.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {tier.is_active ? 'نشط' : 'معطل'}
                      </button>
                      <button onClick={() => deleteTier(idx)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  )
}
