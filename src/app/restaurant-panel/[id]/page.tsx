'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut, Store, Tag, Utensils, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getMainDomainMenuUrl } from '@/utils/url'


export default function RestaurantOwnerPanel({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = params && typeof (params as any).then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as unknown as { id: string })
  const id = resolvedParams?.id
  const router = useRouter()

  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [authenticatedOwner, setAuthenticatedOwner] = useState<any>(null)

  // ── Sub-category State ─────────────────────────────────────────
  const [newCatName, setNewCatName] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editCatSort, setEditCatSort] = useState(0)

  // ── Item State ─────────────────────────────────────────────────
  const [showItemForm, setShowItemForm] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState({
    category_id: '', name: '', description: '', price: '', image_url: '', is_available: true,
    is_offer: false, original_price: '', offer_title: ''
  })
  const [savingItem, setSavingItem] = useState(false)

  // ── Offers State ────────────────────────────────────────────────
  const [offers, setOffers] = useState<any[]>([])
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [editOfferId, setEditOfferId] = useState<string | null>(null)
  const [offerForm, setOfferForm] = useState({
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

  // Verify standalone restaurant owner session
  useEffect(() => {
    const savedOwnerSession = typeof window !== 'undefined' ? localStorage.getItem('restaurant_owner_session') : null
    if (!savedOwnerSession) {
      router.push('/dashboard')
      return
    }

    try {
      const parsed = JSON.parse(savedOwnerSession)
      if (parsed.restaurant_id !== id) {
        // Owner trying to access another restaurant id
        router.push(`/restaurant-panel/${parsed.restaurant_id}`)
        return
      }
      setAuthenticatedOwner(parsed)
    } catch (e) {
      router.push('/dashboard')
    }
  }, [id, router])

  // ── Delivery Tiers State ─────────────────────────────────────────
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [newTier, setNewTier] = useState({ min_km: '', max_km: '', fee: '', is_active: true })
  const [savingTiers, setSavingTiers] = useState(false)

  const fetchData = async () => {
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
      console.error('Error fetching restaurant data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticatedOwner) {
      fetchData()
    }
  }, [authenticatedOwner])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('restaurant_owner_session')
    }
    router.push('/dashboard')
  }

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
      autoTitle += bonusQty > 1 ? ` + ${bonusQty} ${bonus.name} مجاناً` : ` + ${bonus.name} مجاناً`
    }

    setOfferForm(prev => ({
      ...prev,
      bonus_item_id: bonusId,
      original_price: origPrice > 0 ? origPrice.toString() : prev.original_price,
      title: autoTitle || prev.title
    }))
  }

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerForm.primary_item_id || !offerForm.offer_price || !offerForm.title) {
      return alert('يرجى اختيار الوجبة الرئيسية وتحديد سعر العرض وعنوانه')
    }

    setSavingOffer(true)
    const primary = menuItems.find(i => i.id === offerForm.primary_item_id)
    const bonus = menuItems.find(i => i.id === offerForm.bonus_item_id)

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
      image_url: offerForm.image_url || primary?.image_url || null,
      is_active: offerForm.is_active
    }

    if (editOfferId) {
      await supabase.from('offers').update(payload).eq('id', editOfferId)
    } else {
      await supabase.from('offers').insert([payload])
    }

    setSavingOffer(false)
    setShowOfferForm(false)
    setEditOfferId(null)
    setOfferForm({
      primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1',
      title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true
    })
    fetchData()
  }

  const handleEditOffer = (offer: any) => {
    setEditOfferId(offer.id)
    setOfferForm({
      primary_item_id: offer.primary_item_id,
      min_quantity: offer.min_quantity ? offer.min_quantity.toString() : '1',
      bonus_item_id: offer.bonus_item_id || '',
      bonus_quantity: offer.bonus_quantity ? offer.bonus_quantity.toString() : '1',
      title: offer.title,
      description: offer.description || '',
      original_price: offer.original_price ? offer.original_price.toString() : '',
      offer_price: offer.offer_price.toString(),
      image_url: offer.image_url || '',
      is_active: offer.is_active
    })
    setShowOfferForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleOfferActive = async (offer: any) => {
    await supabase.from('offers').update({ is_active: !offer.is_active }).eq('id', offer.id)
    fetchData()
  }

  const deleteOffer = async (offerId: string) => {
    if (confirm('حذف هذا العرض؟')) {
      await supabase.from('offers').delete().eq('id', offerId)
      fetchData()
    }
  }

  const PANEL_TABS = [
    { key: 'menu', label: 'الوجبات', emoji: '🍱' },
    { key: 'offers', label: 'العروض', emoji: '🔥' },
    { key: 'delivery', label: 'التوصيل', emoji: '🛵' },
  ] as const
  type PanelTab = typeof PANEL_TABS[number]['key']
  // activeTab is already declared at top
  // we use a local panelTab state in JSX below via panelTab

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400">جاري تحميل لوحة المطعم...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500" dir="rtl">المطعم غير موجود</div>
  }

  return (
    <div className="min-h-screen flex flex-col" dir="rtl" style={{ background: 'var(--content-bg)' }}>
      {/* ── Unified Header ── */}
      <header className="dash-header">
        <div className="flex items-center gap-3">
          {restaurant.logo_url
            ? <img src={restaurant.logo_url} alt="" className="w-9 h-9 rounded-xl object-cover border border-white/10" />
            : <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-xl" style={{ background: restaurant.primary_color || '#F97316' }}>🏪</div>
          }
          <div>
            <h1 className="text-base font-black leading-tight text-white">{restaurant.name}</h1>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">لوحة التحكم</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getMainDomainMenuUrl(restaurant.slug)}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white btn-sm hidden sm:flex"
          >
            معاينة المنيو 👁️
          </a>

          <button onClick={handleLogout} className="btn btn-danger btn-sm border-red-900/50 bg-red-500/15 text-red-400 hover:bg-red-500/25">
            <LogOut size={14} />
            <span className="hidden sm:block">خروج</span>
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1">
        <div className="dash-content">
          {/* Panel Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up">
            {[
              { label: 'الأقسام', value: categories.length, color: '#3B82F6', emoji: '📁' },
              { label: 'الوجبات', value: menuItems.length, color: '#10B981', emoji: '🍱' },
              { label: 'العروض', value: offers.length, color: '#F97316', emoji: '🔥' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 hidden sm:flex" style={{ background: s.color + '18' }}>{s.emoji}</div>
                <div>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-bold text-slate-400">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ══════════ MAIN GRID ══════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">

            {/* ── LEFT SIDEBAR: Categories + Delivery ── */}
            <div className="space-y-5 lg:col-span-1">

              {/* Categories Card */}
              <div className="c-card">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span>📁</span> أقسام المنيو</h3>
                  <span className="badge badge-gray">{categories.length}</span>
                </div>
                <div className="c-card-body">
                  <form onSubmit={saveCategory} className="flex gap-2 mb-4">
                    <input
                      type="text" required
                      placeholder="قسم جديد..."
                      value={editCatId ? editCatName : newCatName}
                      onChange={e => editCatId ? setEditCatName(e.target.value) : setNewCatName(e.target.value)}
                      className="f-input flex-1"
                    />
                    <button type="submit" className="btn btn-dark btn-sm shrink-0">
                      {editCatId ? 'حفظ' : <Plus size={16} />}
                    </button>
                    {editCatId && (
                      <button type="button" onClick={() => setEditCatId(null)} className="btn btn-ghost btn-sm"><X size={14} /></button>
                    )}
                  </form>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                        <div>
                          <span className="font-bold text-sm text-slate-800">{cat.name}</span>
                          <span className="text-xs text-slate-400 mr-2">{menuItems.filter(m => m.category_id === cat.id).length} وجبة</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatSort(cat.sort_order || 0) }}
                            className="btn btn-ghost btn-sm text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100 p-1.5">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => deleteCategory(cat.id, cat.name)} className="btn btn-danger btn-sm p-1.5">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {categories.length === 0 && (
                      <p className="text-center text-slate-400 text-sm py-4">أضف أول قسم للمنيو</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery Tiers Card */}
              <div className="c-card">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span>🛵</span> شرائح التوصيل</h3>
                  {savingTiers && <span className="text-xs text-orange-500 font-bold animate-pulse">حفظ...</span>}
                </div>
                <div className="c-card-body">
                  <form onSubmit={handleAddTier} className="space-y-3 mb-4 bg-orange-50 p-3 rounded-2xl border border-orange-100">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'من (كم)', key: 'min_km', placeholder: '0' },
                        { label: 'إلى (كم)', key: 'max_km', placeholder: '10' },
                        { label: 'الأجرة TL', key: 'fee', placeholder: '25' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="f-label">{f.label}</label>
                          <input type="number" step="0.5" required placeholder={f.placeholder}
                            value={(newTier as any)[f.key]}
                            onChange={e => setNewTier({ ...newTier, [f.key]: e.target.value })}
                            className="f-input" />
                        </div>
                      ))}
                    </div>
                    <button type="submit" className="btn btn-primary w-full">
                      <Plus size={15} /> إضافة شريحة
                    </button>
                  </form>

                  <div className="space-y-2">
                    {deliveryTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-black text-xs text-slate-800">{tier.min_km} – {tier.max_km} كم</p>
                          <p className="text-xs text-orange-500 font-bold">{tier.fee} TL</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => toggleTierActive(idx)}
                            className={`badge cursor-pointer ${tier.is_active ? 'badge-green' : 'badge-red'}`}>
                            {tier.is_active ? 'مفعّل' : 'معطّل'}
                          </button>
                          <button onClick={() => deleteTier(idx)} className="btn btn-danger btn-sm p-1.5"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                    {deliveryTiers.length === 0 && (
                      <p className="text-center text-slate-400 text-xs py-3">لا توجد شرائح توصيل بعد</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT MAIN: Items + Offers ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* OFFERS SECTION */}
              <div className="c-card border-t-4 border-t-orange-400">
                <div className="c-card-header">
                  <div>
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><span>🔥</span> العروض والبكجات</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">عروض تظهر في أعلى المنيو للزبائن</p>
                  </div>
                  <button
                    onClick={() => { setEditOfferId(null); setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true }); setShowOfferForm(!showOfferForm) }}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={15} /> عرض جديد
                  </button>
                </div>

                {showOfferForm && (
                  <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-slide-down">
                    <h4 className="font-black text-slate-800 mb-3">{editOfferId ? 'تعديل العرض' : 'إنشاء عرض جديد'}</h4>
                    <form onSubmit={handleSaveOffer} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100">
                        <div className="md:col-span-2">
                          <label className="f-label">الوجبة الرئيسية *</label>
                          <select required value={offerForm.primary_item_id} onChange={e => handlePrimaryItemChange(e.target.value)} className="f-input">
                            <option value="">اختر وجبة...</option>
                            {menuItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.price} ₺)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">الكمية</label>
                          <input type="number" min="1" required value={offerForm.min_quantity}
                            onChange={e => setOfferForm({ ...offerForm, min_quantity: e.target.value })} className="f-input text-center" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100">
                        <div className="md:col-span-2">
                          <label className="f-label">وجبة هدية إضافية (اختياري)</label>
                          <select value={offerForm.bonus_item_id} onChange={e => handleBonusItemChange(e.target.value)} className="f-input">
                            <option value="">بدون وجبة إضافية</option>
                            {menuItems.map(item => <option key={item.id} value={item.id}>🎁 {item.name} ({item.price} ₺)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">كميتها</label>
                          <input type="number" min="1" value={offerForm.bonus_quantity} disabled={!offerForm.bonus_item_id}
                            onChange={e => setOfferForm({ ...offerForm, bonus_quantity: e.target.value })} className="f-input text-center" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">عنوان العرض *</label>
                          <input type="text" required value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} className="f-input" />
                        </div>
                        <div>
                          <label className="f-label">سعر العرض النهائي (₺) *</label>
                          <input type="number" step="0.5" required value={offerForm.offer_price}
                            onChange={e => setOfferForm({ ...offerForm, offer_price: e.target.value })}
                            className="f-input text-orange-600 font-black" dir="ltr" />
                        </div>
                        <div>
                          <label className="f-label">السعر الأصلي قبل الخصم (₺)</label>
                          <input type="number" step="0.5" value={offerForm.original_price}
                            onChange={e => setOfferForm({ ...offerForm, original_price: e.target.value })}
                            className="f-input" dir="ltr" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={offerForm.is_active} onChange={e => setOfferForm({ ...offerForm, is_active: e.target.checked })} className="w-4 h-4 accent-orange-500" />
                          تفعيل فوراً للزبائن
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowOfferForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
                          <button type="submit" disabled={savingOffer} className="btn btn-primary btn-sm">
                            {savingOffer ? 'حفظ...' : '💾 حفظ العرض'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                <div className="c-card-body pt-0">
                  {offers.length === 0 && !showOfferForm ? (
                    <div className="text-center py-8 border-2 border-dashed border-orange-200 rounded-2xl">
                      <p className="text-slate-400 text-sm font-medium">لا توجد عروض مضافة بعد</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {offers.map(offer => {
                        const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
                        const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)
                        return (
                          <div key={offer.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <SmartOfferImage primaryImage={primaryItem?.image_url} bonusImage={bonusItem?.image_url} minQuantity={offer.min_quantity} bonusQuantity={offer.bonus_quantity} className="w-16 h-16 rounded-xl shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-sm text-slate-900 truncate">{offer.title}</h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="font-black text-orange-500 text-sm">{offer.offer_price} ₺</span>
                                {offer.original_price && <span className="text-xs text-slate-400 line-through">{offer.original_price} ₺</span>}
                                <button onClick={() => toggleOfferActive(offer)}
                                  className={`badge cursor-pointer ${offer.is_active ? 'badge-green' : 'badge-gray'}`}>
                                  {offer.is_active ? 'نشط' : 'معطّل'}
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <button onClick={() => handleEditOffer(offer)} className="btn btn-ghost btn-sm text-blue-600 p-1.5"><Edit size={14} /></button>
                              <button onClick={() => deleteOffer(offer.id)} className="btn btn-danger btn-sm p-1.5"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* MENU ITEMS SECTION */}
              <div className="c-card">
                <div className="c-card-header">
                  <div>
                    <h3 className="font-black text-slate-800 flex items-center gap-2"><span>🍱</span> الوجبات والمنتجات</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{menuItems.length} وجبة في {categories.length} قسم</p>
                  </div>
                  <button
                    onClick={() => { setShowItemForm(!showItemForm); setEditItemId(null); setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '' }) }}
                    disabled={categories.length === 0}
                    className="btn btn-dark btn-sm disabled:opacity-40"
                  >
                    <Plus size={15} /> وجبة جديدة
                  </button>
                </div>

                {categories.length === 0 && (
                  <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold text-center">
                    ⚠️ أضف قسماً فرعياً من القائمة اليسرى أولاً
                  </div>
                )}

                {showItemForm && categories.length > 0 && (
                  <div className="mx-4 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-slide-down">
                    <h4 className="font-black text-slate-800 mb-3">{editItemId ? 'تعديل وجبة' : 'إضافة وجبة جديدة'}</h4>
                    <form onSubmit={handleSaveItem} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">القسم الفرعي *</label>
                          <select required value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })} className="f-input">
                            <option value="">اختر القسم...</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">اسم الوجبة *</label>
                          <input type="text" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="اسم الوجبة..." className="f-input" />
                        </div>
                        <div>
                          <label className="f-label">السعر (TL) *</label>
                          <input type="number" step="0.5" required value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} className="f-input text-orange-600 font-black" />
                        </div>
                        <div>
                          <label className="f-label">صورة الوجبة</label>
                          <ImageUpload value={itemForm.image_url} onChange={url => setItemForm({ ...itemForm, image_url: url })} />
                        </div>
                        <div className="md:col-span-2">
                          <label className="f-label">الوصف (اختياري)</label>
                          <textarea rows={2} value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="المكونات والتفاصيل..." className="f-input" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} className="w-4 h-4 accent-green-500" />
                          متوفرة للطلب؟
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowItemForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
                          <button type="submit" disabled={savingItem} className="btn btn-dark btn-sm">
                            {savingItem ? 'حفظ...' : '💾 حفظ الوجبة'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                <div className="c-card-body pt-0">
                  {categories.length > 0 && menuItems.length === 0 && !showItemForm ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-4xl mb-2">🍱</p>
                      <p className="text-slate-400 text-sm font-medium">لا توجد وجبات مضافة بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categories.map(cat => {
                        const items = menuItems.filter(i => i.category_id === cat.id)
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center gap-2 mb-2.5">
                              <h4 className="font-black text-sm text-slate-800">{cat.name}</h4>
                              <span className="badge badge-gray">{items.length} وجبة</span>
                            </div>
                            {items.length === 0 ? (
                              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                                لا توجد وجبات في هذا القسم بعد
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {items.map(item => (
                                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition">
                                    {item.image_url
                                      ? <img src={item.image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                                      : <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">لا صورة</div>
                                    }
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-black text-sm text-slate-900 truncate">{item.name}</h5>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="font-black text-orange-500 text-sm">{item.price} ₺</span>
                                        <button
                                          onClick={() => toggleItemAvailability(item)}
                                          className={`badge cursor-pointer transition ${item.is_available ? 'badge-green' : 'badge-red'}`}>
                                          {item.is_available ? 'متوفر' : 'نفد'}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button onClick={() => handleEditItem(item)} className="btn btn-ghost btn-sm text-blue-600 p-1.5"><Edit size={13} /></button>
                                      <button onClick={() => deleteItem(item.id, item.name)} className="btn btn-danger btn-sm p-1.5"><Trash2 size={13} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}