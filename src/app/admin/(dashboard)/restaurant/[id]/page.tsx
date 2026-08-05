'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import ImageUpload from '@/components/ImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function RestaurantAdmin({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { logout, profile } = useAuth()
  const resolvedParams = params && typeof (params as any).then === 'function' 
    ? use(params as Promise<{ id: string }>) 
    : (params as unknown as { id: string })
  const id = resolvedParams?.id
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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

  const fetchData = async () => {
    setLoading(true)
    const { data: resData } = await supabase.from('restaurants').select('*').eq('id', id).single()
    if (resData) setRestaurant(resData)

    const { data: catData } = await supabase.from('categories').select('*').eq('restaurant_id', id).order('sort_order', { ascending: true })
    if (catData) setCategories(catData)

    const { data: itemData } = await supabase
      .from('menu_items').select('*')
      .in('category_id', catData?.map(c => c.id) || ['00000000-0000-0000-0000-000000000000'])
      .order('created_at', { ascending: true })
    if (itemData) setMenuItems(itemData)

    const { data: offerData } = await supabase.from('offers').select('*').eq('restaurant_id', id).order('created_at', { ascending: false })
    if (offerData) setOffers(offerData)

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

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

  const deleteCategory = async (catId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القسم وجميع وجباته؟')) {
      await supabase.from('categories').delete().eq('id', catId)
      fetchData()
    }
  }

  // ── Items CRUD ─────────────────────────────────────────────────
  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingItem(true)
    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      image_url: itemForm.image_url || null,
      is_available: itemForm.is_available,
      is_offer: itemForm.is_offer,
      original_price: itemForm.is_offer && itemForm.original_price ? parseFloat(itemForm.original_price) : null,
      offer_title: itemForm.is_offer && itemForm.offer_title ? itemForm.offer_title : null
    }
    if (editItemId) {
      await supabase.from('menu_items').update(payload).eq('id', editItemId)
    } else {
      await supabase.from('menu_items').insert([payload])
    }
    setSavingItem(false)
    setShowItemForm(false)
    setEditItemId(null)
    setItemForm({ category_id: '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '' })
    fetchData()
  }

  const startEditItem = (item: any) => {
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

  const deleteItem = async (itemId: string) => {
    if (confirm('حذف هذه الوجبة؟')) {
      await supabase.from('menu_items').delete().eq('id', itemId)
      fetchData()
    }
  }

  // ── Offers CRUD ────────────────────────────────────────────────
  const saveOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingOffer(true)
    const payload = {
      restaurant_id: id,
      primary_item_id: offerForm.primary_item_id || null,
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
      await supabase.from('offers').update(payload).eq('id', editOfferId)
    } else {
      await supabase.from('offers').insert([payload])
    }

    setSavingOffer(false)
    setShowOfferForm(false)
    setEditOfferId(null)
    setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true })
    fetchData()
  }

  const startEditOffer = (offer: any) => {
    setEditOfferId(offer.id)
    setOfferForm({
      primary_item_id: offer.primary_item_id || '',
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

  if (loading) return <div className="text-center py-20 text-gray-500 font-medium">جاري التحميل...</div>
  if (!restaurant) return <div className="text-center py-20">المطعم غير موجود</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition">
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold">إدارة قائمة: {restaurant.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">الأقسام الفرعية خاصة بهذا المطعم</p>
          </div>
        </div>

        <button
          onClick={async () => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('restaurant_owner_session')
            }
            await logout()
            window.location.href = '/dashboard'
          }}
          className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs px-3.5 py-2 rounded-xl border border-red-100 transition flex items-center gap-1.5"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج 🚪</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Sidebar: Sub-categories */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-base font-bold mb-4">الأقسام الفرعية للمنيو</h3>
            <p className="text-xs text-gray-400 mb-4">مثال: صندويشات • مشروبات • إضافات</p>

            {/* Add/Edit category form */}
            <form onSubmit={saveCategory} className="flex gap-2 mb-5">
              {editCatId ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="number" value={editCatSort} onChange={e => setEditCatSort(parseInt(e.target.value))}
                    className="w-14 px-2 py-2 border border-gray-200 rounded-xl text-sm text-center"
                    placeholder="ترتيب"
                  />
                </div>
              ) : (
                <input
                  type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="اسم القسم الجديد..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              )}
              <button type="submit" className="bg-gray-900 text-white px-3 py-2 rounded-xl font-bold text-sm hover:bg-gray-800 transition">
                {editCatId ? 'حفظ' : <Plus size={16} />}
              </button>
              {editCatId && (
                <button type="button" onClick={() => setEditCatId(null)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-500">
                  إلغاء
                </button>
              )}
            </form>

            <div className="space-y-2">
              {categories.map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                  <GripVertical size={14} className="text-gray-300 shrink-0" />
                  <span className="text-xs text-gray-400 w-5 text-center font-bold shrink-0">{i + 1}</span>
                  <span className="flex-1 font-bold text-sm text-gray-800 truncate">{cat.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{menuItems.filter(m => m.category_id === cat.id).length}</span>
                  <button onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name); setEditCatSort(cat.sort_order || i + 1) }} className="text-blue-500 hover:bg-blue-50 p-1 rounded-lg transition">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">أضف قسماً لتبدأ</p>
              )}
            </div>
          </div>
        </div>

        {/* Main: Menu Items & Offers */}
        <div className="lg:col-span-2 space-y-8">

          {/* OFFERS & BUNDLES SECTION */}
          <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-orange-200 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  🔥 إدارة العروض والبكجات
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  أنشئ عروض تخفيض أو بكجات تجميعية تظهر للزبائن في أعلى المنيو والصفحة الرئيسية
                </p>
              </div>
              <button
                onClick={() => {
                  setEditOfferId(null)
                  setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', is_active: true })
                  setShowOfferForm(!showOfferForm)
                }}
                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm shadow-md hover:from-orange-700 hover:to-amber-700 transition"
              >
                <Plus size={18} /> إضافة عرض / بكج
              </button>
            </div>

            {/* Offer Form */}
            {showOfferForm && (
              <div className="bg-white p-6 rounded-2xl border border-orange-200 shadow-sm mb-6 space-y-4">
                <h4 className="font-bold text-gray-900 mb-3">{editOfferId ? 'تعديل العرض' : 'إنشاء عرض أو تجميعة جديدة'}</h4>

                <form onSubmit={saveOffer} className="space-y-4">
                  {/* Step 1: Select Primary Meal & Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50/60 rounded-2xl border border-orange-100">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">1. اختر الوجبة الرئيسية من المنيو *</label>
                      <select
                        required
                        value={offerForm.primary_item_id}
                        onChange={e => {
                          const pId = e.target.value
                          const pItem = menuItems.find(i => i.id === pId)
                          const bItem = menuItems.find(i => i.id === offerForm.bonus_item_id)
                          const pQty = parseInt(offerForm.min_quantity) || 1
                          const bQty = parseInt(offerForm.bonus_quantity) || 1
                          const origPrice = (pItem ? pItem.price * pQty : 0) + (bItem ? bItem.price * bQty : 0)

                          let autoTitle = ''
                          if (pItem) {
                            const pText = pQty > 1 ? `${pQty} ${pItem.name}` : pItem.name
                            if (bItem) {
                              const bText = bQty > 1 ? `${bQty} ${bItem.name}` : bItem.name
                              autoTitle = `عرض ${pText} + ${bText}`
                            } else if (pQty > 1) {
                              autoTitle = `عرض ${pText} بسعر خاص`
                            } else {
                              autoTitle = `تخفيض خاص على ${pItem.name}`
                            }
                          }

                          setOfferForm({
                            ...offerForm,
                            primary_item_id: pId,
                            original_price: origPrice > 0 ? origPrice.toString() : '',
                            title: autoTitle || offerForm.title,
                            description: pItem ? `عرض عند شراء ${pQty > 1 ? `${pQty} من` : ''} ${pItem.name}${bItem ? ` مع ${bQty > 1 ? `${bQty} من` : ''} ${bItem.name}` : ''}` : ''
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
                      >
                        <option value="">اختر وجبة من المنيو...</option>
                        {menuItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} ({item.price} ₺)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">العدد من الوجبة الرئيسية *</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        required
                        value={offerForm.min_quantity}
                        onChange={e => {
                          const qtyStr = e.target.value
                          const pQty = parseInt(qtyStr) || 1
                          const pItem = menuItems.find(i => i.id === offerForm.primary_item_id)
                          const bItem = menuItems.find(i => i.id === offerForm.bonus_item_id)
                          const bQty = parseInt(offerForm.bonus_quantity) || 1
                          const origPrice = (pItem ? pItem.price * pQty : 0) + (bItem ? bItem.price * bQty : 0)

                          let autoTitle = ''
                          if (pItem) {
                            const pText = pQty > 1 ? `${pQty} ${pItem.name}` : pItem.name
                            if (bItem) {
                              const bText = bQty > 1 ? `${bQty} ${bItem.name}` : bItem.name
                              autoTitle = `عرض ${pText} + ${bText}`
                            } else if (pQty > 1) {
                              autoTitle = `عرض ${pText} بسعر خاص`
                            } else {
                              autoTitle = `تخفيض خاص على ${pItem.name}`
                            }
                          }

                          setOfferForm({
                            ...offerForm,
                            min_quantity: qtyStr,
                            original_price: origPrice > 0 ? origPrice.toString() : '',
                            title: autoTitle || offerForm.title,
                            description: pItem ? `عرض عند شراء ${pQty > 1 ? `${pQty} من` : ''} ${pItem.name}${bItem ? ` مع ${bQty > 1 ? `${bQty} من` : ''} ${bItem.name}` : ''}` : ''
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-center bg-white"
                      />
                    </div>
                  </div>

                  {/* Step 2: Bonus / Additional Item & Quantity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-orange-50/60 rounded-2xl border border-orange-100">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 mb-1">2. أرفق وجبة إضافية / هدية (اختياري، مثل عيران/بيبسي)</label>
                      <select
                        value={offerForm.bonus_item_id}
                        onChange={e => {
                          const bId = e.target.value
                          const pItem = menuItems.find(i => i.id === offerForm.primary_item_id)
                          const bItem = menuItems.find(i => i.id === bId)
                          const pQty = parseInt(offerForm.min_quantity) || 1
                          const bQty = parseInt(offerForm.bonus_quantity) || 1
                          const origPrice = (pItem ? pItem.price * pQty : 0) + (bItem ? bItem.price * bQty : 0)

                          let autoTitle = ''
                          if (pItem) {
                            const pText = pQty > 1 ? `${pQty} ${pItem.name}` : pItem.name
                            if (bItem) {
                              const bText = bQty > 1 ? `${bQty} ${bItem.name}` : bItem.name
                              autoTitle = `عرض ${pText} + ${bText}`
                            } else if (pQty > 1) {
                              autoTitle = `عرض ${pText} بسعر خاص`
                            } else {
                              autoTitle = `تخفيض خاص على ${pItem.name}`
                            }
                          }

                          setOfferForm({
                            ...offerForm,
                            bonus_item_id: bId,
                            original_price: origPrice > 0 ? origPrice.toString() : '',
                            title: autoTitle || offerForm.title,
                            description: pItem ? `عرض عند شراء ${pQty > 1 ? `${pQty} من` : ''} ${pItem.name}${bItem ? ` مع ${bQty > 1 ? `${bQty} من` : ''} ${bItem.name}` : ''}` : ''
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white font-medium"
                      >
                        <option value="">بدون وجبة إضافية (عرض تخفيض فقط)</option>
                        {menuItems.map(item => (
                          <option key={item.id} value={item.id}>🎁 وجبة إضافية: {item.name} ({item.price} ₺)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">العدد من الوجبة الإضافية</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={offerForm.bonus_quantity}
                        disabled={!offerForm.bonus_item_id}
                        onChange={e => {
                          const bQtyStr = e.target.value
                          const bQty = parseInt(bQtyStr) || 1
                          const pItem = menuItems.find(i => i.id === offerForm.primary_item_id)
                          const bItem = menuItems.find(i => i.id === offerForm.bonus_item_id)
                          const pQty = parseInt(offerForm.min_quantity) || 1
                          const origPrice = (pItem ? pItem.price * pQty : 0) + (bItem ? bItem.price * bQty : 0)

                          let autoTitle = ''
                          if (pItem) {
                            const pText = pQty > 1 ? `${pQty} ${pItem.name}` : pItem.name
                            if (bItem) {
                              const bText = bQty > 1 ? `${bQty} ${bItem.name}` : bItem.name
                              autoTitle = `عرض ${pText} + ${bText}`
                            } else if (pQty > 1) {
                              autoTitle = `عرض ${pText} بسعر خاص`
                            } else {
                              autoTitle = `تخفيض خاص على ${pItem.name}`
                            }
                          }

                          setOfferForm({
                            ...offerForm,
                            bonus_quantity: bQtyStr,
                            original_price: origPrice > 0 ? origPrice.toString() : '',
                            title: autoTitle || offerForm.title,
                            description: pItem ? `عرض عند شراء ${pQty > 1 ? `${pQty} من` : ''} ${pItem.name}${bItem ? ` مع ${bQty > 1 ? `${bQty} من` : ''} ${bItem.name}` : ''}` : ''
                          })
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-center bg-white disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* Step 3: Prices & Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">عنوان العرض المولد (يمكنك تعديله)</label>
                      <input
                        type="text"
                        required
                        value={offerForm.title}
                        onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">السعر النهائي للعرض (₺) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={offerForm.offer_price}
                        onChange={e => setOfferForm({ ...offerForm, offer_price: e.target.value })}
                        placeholder="السعر الإجمالي بعد الخصم..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-left font-black text-orange-600"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">السعر الأصلي الإجمالي (₺) - للشطب</label>
                      <input
                        type="number"
                        step="0.001"
                        value={offerForm.original_price}
                        onChange={e => setOfferForm({ ...offerForm, original_price: e.target.value })}
                        placeholder="المجموع قبل الخصم..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-left bg-gray-50"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">وصف العرض</label>
                      <input
                        type="text"
                        value={offerForm.description}
                        onChange={e => setOfferForm({ ...offerForm, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="offer_active"
                        checked={offerForm.is_active}
                        onChange={e => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                        className="w-4 h-4 rounded accent-orange-600"
                      />
                      <label htmlFor="offer_active" className="text-xs font-bold text-gray-700 cursor-pointer">
                        تفعيل العرض للزبائن فوراً؟
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowOfferForm(false)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={savingOffer}
                        className="bg-orange-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 disabled:opacity-50"
                      >
                        {savingOffer ? 'جاري الحفظ...' : 'حفظ العرض'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Offers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {offers.map(offer => {
                const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
                const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)
                return (
                  <div key={offer.id} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm flex gap-3 relative">
                    <SmartOfferImage
                      primaryImage={primaryItem?.image_url}
                      bonusImage={bonusItem?.image_url}
                      customImage={offer.image_url}
                      minQuantity={offer.min_quantity}
                      className="w-20 h-20 rounded-xl shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                            {offer.min_quantity > 1 ? `🔥 عرض ${offer.min_quantity}X` : bonusItem ? '🎁 مع هدية' : '🏷️ خصم'}
                          </span>
                          <div className="flex gap-1">
                            <button onClick={() => startEditOffer(offer)} className="text-blue-500 hover:bg-blue-50 p-1 rounded-lg"><Edit size={14} /></button>
                            <button onClick={() => deleteOffer(offer.id)} className="text-red-500 hover:bg-red-50 p-1 rounded-lg"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        <h4 className="font-bold text-sm text-gray-900 mt-1 truncate">{offer.title}</h4>
                        {offer.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 font-medium">{offer.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-orange-600">{offer.offer_price} ₺</span>
                          {offer.original_price && (
                            <span className="text-xs text-gray-400 line-through font-bold">{offer.original_price} ₺</span>
                          )}
                        </div>

                        <button
                          onClick={() => toggleOfferActive(offer)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition ${
                            offer.is_active
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}
                        >
                          {offer.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {offers.length === 0 && !showOfferForm && (
                <div className="col-span-full py-8 text-center bg-white/50 rounded-2xl border border-dashed border-orange-200 text-gray-400 text-xs">
                  لا توجد عروض مضافة بعد. اختر وجبة وحدد العدد أو أرفق هدية لتوليد عرضك الأول! 🔥
                </div>
              )}
            </div>
          </div>

          {/* MEAL ITEMS SECTION */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold">الوجبات</h3>
            <button
              onClick={() => {
                setEditItemId(null)
                setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '' })
                setShowItemForm(!showItemForm)
              }}
              disabled={categories.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-blue-700 disabled:opacity-40 transition"
            >
              <Plus size={18} /> إضافة وجبة
            </button>
          </div>

          {categories.length === 0 && (
            <div className="text-center py-10 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 font-medium text-sm">
              ⚠️ أضف قسماً فرعياً أولاً قبل إضافة الوجبات
            </div>
          )}

          {showItemForm && categories.length > 0 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 mb-6">
              <h4 className="font-bold mb-4">{editItemId ? 'تعديل وجبة' : 'إضافة وجبة جديدة'}</h4>
              <form onSubmit={saveItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم الفرعي</label>
                    <select required value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">اختر القسم...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اسم الوجبة</label>
                    <input type="text" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                    <textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السعر (₺)</label>
                    <input type="number" step="0.001" required value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-left" dir="ltr" />
                  </div>

                  {/* Offers section */}
                  <div className="md:col-span-2 p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="is_offer" checked={itemForm.is_offer} onChange={e => setItemForm({ ...itemForm, is_offer: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 accent-orange-600 cursor-pointer" />
                      <label htmlFor="is_offer" className="text-sm font-black text-orange-900 cursor-pointer flex items-center gap-1.5">
                        🔥 جعل هذه الوجبة عرضاً خاصاً / تخفيضاً
                      </label>
                    </div>

                    {itemForm.is_offer && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">السعر الاصلي قبل الخصم (₺) - للشطب</label>
                          <input type="number" step="0.001" value={itemForm.original_price} onChange={e => setItemForm({ ...itemForm, original_price: e.target.value })}
                            placeholder="مثال: 250" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-left bg-white" dir="ltr" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">عنوان العرض (اختياري)</label>
                          <input type="text" value={itemForm.offer_title} onChange={e => setItemForm({ ...itemForm, offer_title: e.target.value })}
                            placeholder="مثال: عرض شخصين / خصم 20%" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="is_avail" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 accent-blue-600" />
                    <label htmlFor="is_avail" className="text-sm font-medium text-gray-700 cursor-pointer">متوفرة للطلب؟</label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">صورة الوجبة</label>
                  <ImageUpload value={itemForm.image_url} onChange={(url) => setItemForm({ ...itemForm, image_url: url })} />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setShowItemForm(false)} className="px-6 py-2 rounded-xl border border-gray-200 font-medium hover:bg-gray-50">إلغاء</button>
                  <button type="submit" disabled={savingItem} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50">
                    {savingItem ? 'جاري الحفظ...' : 'حفظ الوجبة'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Items grouped by sub-category */}
          <div className="space-y-6">
            {categories.map(cat => {
              const items = menuItems.filter(i => i.category_id === cat.id)
              if (items.length === 0) return (
                <div key={cat.id} className="border border-dashed border-gray-200 rounded-2xl p-4 text-center text-gray-400 text-sm">
                  <p className="font-bold text-gray-600 mb-1">{cat.name}</p>
                  لا توجد وجبات في هذا القسم بعد
                </div>
              )
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-bold text-gray-800">{cat.name}</h4>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{items.length} وجبة</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(item => (
                      <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-3 shadow-sm">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400 shrink-0">لا صورة</div>
                        )}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h5>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => startEditItem(item)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg"><Edit size={14} /></button>
                              <button onClick={() => deleteItem(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-black text-orange-600">{item.price} ₺</span>
                            {!item.is_available && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">غير متوفر</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {menuItems.length === 0 && categories.length > 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-gray-400 font-medium">ابدأ بإضافة وجباتك الآن</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
