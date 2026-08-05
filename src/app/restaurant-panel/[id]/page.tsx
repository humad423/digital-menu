'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut, Store, Tag, Utensils } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 dir-rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-gray-500">جاري تحميل بيانات لوحة المطعم...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return <div className="min-h-screen flex items-center justify-center p-4 dir-rtl font-bold">المطعم غير موجود</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 dir-rtl">
      {/* Top Standalone Header Bar */}
      <header className="bg-gray-900 text-white px-6 py-4 shadow-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-lg shadow-inner">
              🏪
            </div>
            <div>
              <h1 className="text-lg font-black leading-tight">{restaurant.name}</h1>
              <p className="text-[11px] text-gray-400 font-medium">لوحة تحكم صاحب المطعم المستقلة</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/m/${restaurant.slug}`}
              target="_blank"
              className="text-xs font-bold bg-gray-800 text-gray-200 hover:bg-gray-700 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <span>معاينة المنيو 👁️</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <LogOut size={16} />
              <span>تسجيل الخروج 🚪</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar: Categories */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                <span>📁</span>
                <span>أقسام المنيو الفرعية</span>
              </h3>

              {/* Add Category Form */}
              <form onSubmit={saveCategory} className="flex gap-2 mb-4">
                <input
                  type="text"
                  required
                  placeholder="قسم جديد (مثال: برغر)..."
                  value={editCatId ? editCatName : newCatName}
                  onChange={e => editCatId ? setEditCatName(e.target.value) : setNewCatName(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold bg-gray-50 focus:bg-white focus:border-orange-500 outline-none transition"
                />
                <button
                  type="submit"
                  className="bg-gray-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-black transition shrink-0"
                >
                  {editCatId ? 'حفظ' : 'إضافة'}
                </button>
              </form>

              {/* Category List */}
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition">
                    <span className="font-bold text-xs text-gray-800">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatSort(cat.sort_order || 0) }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-200/50"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id, cat.name)}
                        className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-200/50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Tiers Card */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-base font-black text-gray-900 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2">🛵 شرائح وأجور التوصيل</span>
                {savingTiers && <span className="text-[10px] text-orange-600 font-bold animate-pulse">جاري الحفظ...</span>}
              </h3>
              <p className="text-xs text-gray-400 font-bold mb-4">حدد السعر والمسافة وتفعيل/تعطيل كل شريحة</p>

              {/* Add New Tier Form */}
              <form onSubmit={handleAddTier} className="space-y-2 mb-4 bg-orange-50/50 p-3 rounded-2xl border border-orange-100">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">من (كم)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="0"
                      value={newTier.min_km}
                      onChange={e => setNewTier({ ...newTier, min_km: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-bold bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">إلى (كم)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      placeholder="10"
                      value={newTier.max_km}
                      onChange={e => setNewTier({ ...newTier, max_km: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-bold bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">الأجرة (TL)</label>
                    <input
                      type="number"
                      step="1"
                      required
                      placeholder="25"
                      value={newTier.fee}
                      onChange={e => setNewTier({ ...newTier, fee: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs font-bold bg-white text-orange-600 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-600 text-white font-bold py-2 rounded-xl text-xs hover:bg-orange-700 transition"
                >
                  + إضافة شريحة توصيل
                </button>
              </form>

              {/* Tiers List */}
              <div className="space-y-2">
                {deliveryTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                    <div>
                      <div className="font-black text-gray-900 flex items-center gap-1.5">
                        <span>مسافة ({tier.min_km} - {tier.max_km} كم)</span>
                      </div>
                      <div className="text-[11px] font-bold text-orange-600 mt-0.5">
                        الأجرة: {tier.fee} TL
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleTierActive(idx)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition ${
                          tier.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {tier.is_active ? 'مفعل ✓' : 'معطل ✕'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTier(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200/50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Area: Menu Items & Offers */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* OFFERS SECTION */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>🔥</span>
                    <span>العروض التلقائية والباكجات</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">دمج تلقائي للصور وحساب لنسب التوفير</p>
                </div>
                <button
                  onClick={() => { setShowOfferForm(!showOfferForm); setEditOfferId(null) }}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>عرض جديد</span>
                </button>
              </div>

              {/* Offer Form */}
              {showOfferForm && (
                <form onSubmit={handleSaveOffer} className="bg-orange-50/70 p-5 rounded-3xl border border-orange-100 space-y-4 mb-6 animate-fade-in">
                  <h4 className="font-black text-sm text-gray-800 mb-2">إعداد العرض الذكي</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">الوجبة الرئيسية بالعرض</label>
                      <select
                        required
                        value={offerForm.primary_item_id}
                        onChange={e => handlePrimaryItemChange(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      >
                        <option value="">اختر الوجبة الأساسية...</option>
                        {menuItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.price} TL)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">العدد المطلوب من الوجبة الرئيسية</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={offerForm.min_quantity}
                        onChange={e => setOfferForm({ ...offerForm, min_quantity: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">الوجبة الإضافية / المجانية (اختياري)</label>
                      <select
                        value={offerForm.bonus_item_id}
                        onChange={e => handleBonusItemChange(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      >
                        <option value="">بدون وجبة إضافية (عرض تخفيض فقط)...</option>
                        {menuItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.price} TL)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">عدد الوجبة الإضافية</label>
                      <input
                        type="number"
                        min="1"
                        value={offerForm.bonus_quantity}
                        onChange={e => setOfferForm({ ...offerForm, bonus_quantity: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">عنوان العرض التلقائي</label>
                      <input
                        type="text"
                        required
                        value={offerForm.title}
                        onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                        placeholder="مثال: 3 شاورما + 2 عيران مجاناً"
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">السعر النهائي للعرض (TL)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={offerForm.offer_price}
                        onChange={e => setOfferForm({ ...offerForm, offer_price: e.target.value })}
                        placeholder="السعر بعد التخفيض"
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none text-orange-600"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowOfferForm(false)}
                      className="px-5 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold hover:bg-gray-100 transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={savingOffer}
                      className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-md hover:shadow-lg transition"
                    >
                      {savingOffer ? 'جاري الحفظ...' : 'حفظ العرض ⭐'}
                    </button>
                  </div>
                </form>
              )}

              {/* Offers List */}
              <div className="space-y-3">
                {offers.map(offer => {
                  const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
                  const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)

                  return (
                    <div key={offer.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <SmartOfferImage
                          primaryImage={primaryItem?.image_url}
                          bonusImage={bonusItem?.image_url}
                          minQuantity={offer.min_quantity}
                          bonusQuantity={offer.bonus_quantity}
                          className="w-16 h-16 shrink-0"
                        />
                        <div>
                          <h4 className="font-black text-sm text-gray-900">{offer.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-black text-orange-600">{offer.offer_price} TL</span>
                            {offer.original_price && (
                              <span className="text-xs text-gray-400 line-through font-bold">{offer.original_price} TL</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleOfferActive(offer)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                            offer.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {offer.is_active ? 'مفعل ✓' : 'معطل'}
                        </button>

                        <button onClick={() => handleEditOffer(offer)} className="p-2 text-gray-500 hover:text-blue-600 rounded-xl hover:bg-gray-200/50">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteOffer(offer.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-xl hover:bg-gray-200/50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* MENU ITEMS SECTION */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <span>🍱</span>
                    <span>قائمة الوجبات والمنتجات</span>
                  </h3>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">إضافة وتعديل الوجبات والتحكم بـ (متوفر/غير متوفر)</p>
                </div>
                <button
                  onClick={() => { setShowItemForm(!showItemForm); setEditItemId(null) }}
                  className="px-4 py-2 bg-gray-900 text-white font-black text-xs rounded-2xl hover:bg-black transition flex items-center gap-1.5"
                >
                  <Plus size={16} />
                  <span>وجبة جديدة</span>
                </button>
              </div>

              {/* Item Form */}
              {showItemForm && (
                <form onSubmit={handleSaveItem} className="bg-gray-50 p-5 rounded-3xl border border-gray-200 space-y-4 mb-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">القسم الفراعي</label>
                      <select
                        required
                        value={itemForm.category_id}
                        onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      >
                        <option value="">اختر القسم...</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">اسم الوجبة</label>
                      <input
                        type="text"
                        required
                        value={itemForm.name}
                        onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                        placeholder="اسم الوجبة..."
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">السعر (TL)</label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={itemForm.price}
                        onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                        className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-bold bg-white focus:ring-2 focus:ring-orange-200 outline-none text-orange-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">صورة الوجبة</label>
                      <ImageUpload value={itemForm.image_url} onChange={url => setItemForm({ ...itemForm, image_url: url })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">الوصف (اختياري)</label>
                    <textarea
                      rows={2}
                      value={itemForm.description}
                      onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                      placeholder="المكونات والتفاصيل..."
                      className="w-full p-3 border border-gray-200 rounded-2xl text-xs font-medium bg-white focus:ring-2 focus:ring-orange-200 outline-none"
                    ></textarea>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowItemForm(false)}
                      className="px-5 py-2.5 border border-gray-200 rounded-2xl text-xs font-bold hover:bg-gray-200 transition"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={savingItem}
                      className="px-6 py-2.5 bg-gray-900 text-white font-black text-xs rounded-2xl hover:bg-black transition"
                    >
                      {savingItem ? 'جاري الحفظ...' : 'حفظ الوجبة'}
                    </button>
                  </div>
                </form>
              )}

              {/* Items List */}
              <div className="space-y-3">
                {menuItems.map(item => {
                  const cat = categories.find(c => c.id === item.category_id)

                  return (
                    <div key={item.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden shrink-0 border border-gray-200">
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">🍱</div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-black text-xs text-gray-900">{item.name}</h4>
                          <p className="text-[11px] text-gray-400 font-bold">{cat?.name || 'قسم غير محدد'}</p>
                          <span className="text-xs font-black text-orange-600">{item.price} TL</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleItemAvailability(item)}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                            item.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {item.is_available ? 'متوفر ✓' : 'غير متوفر ✕'}
                        </button>

                        <button onClick={() => handleEditItem(item)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-200/50">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => deleteItem(item.id, item.name)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-200/50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
