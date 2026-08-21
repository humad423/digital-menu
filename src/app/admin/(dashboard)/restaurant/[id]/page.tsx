'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import ImageUpload from '@/components/ImageUpload'
import MultiImageUpload from '@/components/MultiImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import { useAuth } from '@/context/AuthContext'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut, Store, Tag, Utensils, X, Eye, Bike, Check, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { getMainDomainMenuUrl } from '@/utils/url'
import { triggerRevalidate } from '@/utils/revalidate'
import { parseRestaurantMultiplier, encodeRestaurantMultiplier, getEffectiveVisits, fetchTodayVisits, MULTIPLIER_PRESETS } from '@/utils/visitsHelper'


export default function AdminRestaurantPanel({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { logout, profile } = useAuth()
  const resolvedParams = params && typeof (params as any).then === 'function'
    ? use(params as Promise<{ id: string }>)
    : (params as unknown as { id: string })
  const id = resolvedParams?.id

  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [todayRealVisits, setTodayRealVisits] = useState<number>(0)
  const [multiplierVal, setMultiplierVal] = useState<number>(1)
  const [savingMultiplier, setSavingMultiplier] = useState(false)
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
    is_offer: false, original_price: '', offer_title: '', images: [] as string[], sizesText: ''
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
    item3_id: '',
    item3_quantity: '1',
    item4_id: '',
    item4_quantity: '1',
    title: '',
    description: '',
    original_price: '',
    offer_price: '',
    image_url: '',
    images: [] as string[],
    is_active: true
  })
  const [showAdminItem3Input, setShowAdminItem3Input] = useState(false)
  const [showAdminItem4Input, setShowAdminItem4Input] = useState(false)
  const [savingOffer, setSavingOffer] = useState(false)
  const [maxOffersLimitInput, setMaxOffersLimitInput] = useState<number>(5)
  const [savingMaxOffers, setSavingMaxOffers] = useState(false)

  // ── Delivery Tiers State ─────────────────────────────────────────
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [newTier, setNewTier] = useState({ min_km: '', max_km: '', fee: '', is_active: true })
  const [savingTiers, setSavingTiers] = useState(false)

  const fetchData = async () => {
    if (!id) return
    try {
      setLoading(true)
      const { data: resData } = await supabase
        .from('restaurants')
        .select(
          'id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, ' +
          'latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, ' +
          'enable_whatsapp_orders, is_on_holiday, opening_time, closing_time, days_off, ' +
          'store_type, max_offers_limit, menu_note, is_subscription_active, is_menu_active, subscription_notes'
        )
        .eq('id', id)
        .maybeSingle() as any
      if (resData) {
        setRestaurant(resData)
        setMaxOffersLimitInput(resData.max_offers_limit || 5)
        setDeliveryTiers(resData.delivery_tiers || [
          { min_km: 0, max_km: 10, fee: 25, is_active: true },
          { min_km: 10, max_km: 20, fee: 50, is_active: true },
          { min_km: 20, max_km: 30, fee: 85, is_active: true }
        ])
        const { multiplier } = parseRestaurantMultiplier(resData.subscription_notes)
        setMultiplierVal(multiplier)
        const realToday = await fetchTodayVisits(supabase, id)
        setTodayRealVisits(realToday)
      }

      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, sort_order, restaurant_id')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true })
      if (catData) setCategories(catData)

      const { data: itemData } = await supabase
        .from('menu_items')
        .select('id, name, description, price, original_price, image_url, images, is_available, is_hidden, out_of_stock_until, is_offer, offer_title, unit, sizes, colors, allow_custom_amount, category_id, created_at')
        .in('category_id', catData?.map(c => c.id) || ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: true })
      if (itemData) setMenuItems(itemData)

      const { data: offerData } = await supabase
        .from('offers')
        .select('id, title, description, original_price, offer_price, image_url, images, is_active, sort_order, created_at, restaurant_id, primary_item_id, bonus_item_id, item3_id, item4_id, min_quantity, bonus_quantity, item3_quantity, item4_quantity')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
      if (offerData) setOffers(offerData)
    } catch (err) {
      console.error('Error fetching admin restaurant data:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSubscription = async () => {
    if (!restaurant) return
    const newVal = restaurant.is_subscription_active === false ? true : false
    setRestaurant((prev: any) => ({ ...prev, is_subscription_active: newVal }))
    await supabase.from('restaurants').update({ is_subscription_active: newVal }).eq('id', id)
    triggerRevalidate(restaurant.slug, 'all')
  }

  const toggleMenu = async () => {
    if (!restaurant) return
    const newVal = restaurant.is_menu_active === false ? true : false
    setRestaurant((prev: any) => ({ ...prev, is_menu_active: newVal }))
    await supabase.from('restaurants').update({ is_menu_active: newVal }).eq('id', id)
    triggerRevalidate(restaurant.slug, 'all')
  }

  const updateMultiplier = async (newMultiplier: number) => {
    if (!restaurant) return
    try {
      setSavingMultiplier(true)
      const { note } = parseRestaurantMultiplier(restaurant.subscription_notes)
      const encoded = encodeRestaurantMultiplier(note, newMultiplier)
      setMultiplierVal(newMultiplier)
      setRestaurant((prev: any) => ({ ...prev, subscription_notes: encoded }))
      await supabase.from('restaurants').update({ subscription_notes: encoded }).eq('id', id)
    } catch (err: any) {
      alert('خطأ في تعديل المضاعف: ' + err?.message)
    } finally {
      setSavingMultiplier(false)
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
    triggerRevalidate(restaurant?.slug, 'menu')
    fetchData()
  }

  const deleteCategory = async (catId: string, name: string) => {
    if (confirm(`حذف القسم "${name}" مع كافة منتجاته؟`)) {
      await supabase.from('categories').delete().eq('id', catId)
      triggerRevalidate(restaurant?.slug, 'menu')
      fetchData()
    }
  }

  const moveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return

    const newCategories = [...categories]
    const [moved] = newCategories.splice(index, 1)
    newCategories.splice(targetIndex, 0, moved)

    const updatedWithSort = newCategories.map((cat, idx) => ({
      ...cat,
      sort_order: idx + 1,
    }))

    setCategories(updatedWithSort)

    try {
      const updatePromises = updatedWithSort.map(cat =>
        supabase.from('categories').update({ sort_order: cat.sort_order }).eq('id', cat.id)
      )
      await Promise.all(updatePromises)

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(`alfsouq_menu_cache_${id}`)
        } catch (e) {}
      }

      triggerRevalidate(restaurant?.slug, 'menu')
    } catch (err) {
      console.error('Error reordering categories:', err)
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
  const [outOfStockTargetItem, setOutOfStockTargetItem] = useState<any | null>(null)
  const [outOfStockOption, setOutOfStockOption] = useState<'manual' | '2h' | '4h' | 'tomorrow_morning' | 'custom'>('manual')
  const [customOutOfStockTime, setCustomOutOfStockTime] = useState<string>('')

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemForm.category_id || !itemForm.name || !itemForm.price) return alert('يرجى ملء الحقول المطلوبة')
    setSavingItem(true)

    const primaryImg = (itemForm.images && itemForm.images.length > 0) ? itemForm.images[0] : (itemForm.image_url || null)
    const sizesArray = itemForm.sizesText ? itemForm.sizesText.split(',').map(s => s.trim()).filter(Boolean) : []
    const payload = {
      category_id: itemForm.category_id,
      name: itemForm.name,
      description: itemForm.description || null,
      price: parseFloat(itemForm.price),
      image_url: primaryImg,
      images: itemForm.images || (primaryImg ? [primaryImg] : []),
      sizes: sizesArray,
      is_available: itemForm.is_available,
      is_hidden: !!(itemForm as any).is_hidden,
      is_offer: itemForm.is_offer,
      original_price: itemForm.original_price ? parseFloat(itemForm.original_price) : null,
      offer_title: itemForm.offer_title || null
    }

    if (editItemId) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editItemId)
      if (error) {
        alert('خطأ في حفظ المنتج: ' + error.message)
        setSavingItem(false)
        return
      }
    } else {
      const { error } = await supabase.from('menu_items').insert([payload])
      if (error) {
        alert('خطأ في إضافة المنتج: ' + error.message)
        setSavingItem(false)
        return
      }
    }

    setSavingItem(false)
    setShowItemForm(false)
    setEditItemId(null)
    setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '', images: [], sizesText: '', is_hidden: false } as any)
    fetchData()
    triggerRevalidate(restaurant?.slug, 'menu')
  }

  const handleEditItem = (item: any) => {
    setEditItemId(item.id)
    let parsedImages: string[] = []
    if (Array.isArray(item.images)) {
      parsedImages = item.images
    } else if (typeof item.images === 'string') {
      try { parsedImages = JSON.parse(item.images) } catch (e) {}
    }
    if (parsedImages.length === 0 && item.image_url) {
      parsedImages = [item.image_url]
    }

    let parsedSizes: string[] = []
    if (Array.isArray(item.sizes)) {
      parsedSizes = item.sizes
    } else if (typeof item.sizes === 'string') {
      try { parsedSizes = JSON.parse(item.sizes) } catch (e) {}
    }

    setItemForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || '',
      images: parsedImages,
      sizesText: parsedSizes.join(', '),
      is_available: item.is_available,
      is_hidden: !!item.is_hidden,
      is_offer: item.is_offer || false,
      original_price: item.original_price ? item.original_price.toString() : '',
      offer_title: item.offer_title || ''
    } as any)
    setShowItemForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemAvailabilityClick = (item: any) => {
    if (item.is_available === false) {
      setItemAvailability(item.id, true, null)
    } else {
      setOutOfStockTargetItem(item)
      setOutOfStockOption('manual')
      setCustomOutOfStockTime('')
    }
  }

  const confirmOutOfStock = async () => {
    if (!outOfStockTargetItem) return

    let targetDate: string | null = null
    const now = new Date()

    if (outOfStockOption === '2h') {
      targetDate = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
    } else if (outOfStockOption === '4h') {
      targetDate = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()
    } else if (outOfStockOption === 'tomorrow_morning') {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      targetDate = tomorrow.toISOString()
    } else if (outOfStockOption === 'custom') {
      if (!customOutOfStockTime) {
        alert('يرجى تحديد الوقت المخصص')
        return
      }
      targetDate = new Date(customOutOfStockTime).toISOString()
    }

    const itemId = outOfStockTargetItem.id
    setOutOfStockTargetItem(null)
    await setItemAvailability(itemId, false, targetDate)
  }

  const setItemAvailability = async (itemId: string, isAvailable: boolean, outOfStockUntil: string | null) => {
    setMenuItems(prev => prev.map(i => i.id === itemId ? { ...i, is_available: isAvailable, out_of_stock_until: outOfStockUntil } : i))
    await supabase.from('menu_items').update({
      is_available: isAvailable,
      out_of_stock_until: outOfStockUntil
    }).eq('id', itemId)
    fetchData()
    triggerRevalidate(restaurant?.slug, 'menu')
  }

  const toggleItemHidden = async (item: any) => {
    const newHidden = item.is_hidden !== true
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_hidden: newHidden } : i))
    await supabase.from('menu_items').update({ is_hidden: newHidden }).eq('id', item.id)
    fetchData()
    triggerRevalidate(restaurant?.slug, 'menu')
  }

  const deleteItem = async (itemId: string, name: string) => {
    if (confirm(`حذف المنتج "${name}"؟`)) {
      await supabase.from('menu_items').delete().eq('id', itemId)
      fetchData()
      triggerRevalidate(restaurant?.slug, 'menu')
    }
  }

  // ── Auto Offer Calculation ──────────────────────────────────────
  const recalculateAdminOfferTotals = (form: typeof offerForm) => {
    const p = menuItems.find(i => i.id === form.primary_item_id)
    const b1 = menuItems.find(i => i.id === form.bonus_item_id)
    const b2 = menuItems.find(i => i.id === form.item3_id)
    const b3 = menuItems.find(i => i.id === form.item4_id)

    const qp = parseInt(form.min_quantity) || 1
    const qb1 = parseInt(form.bonus_quantity) || 1
    const qb2 = parseInt(form.item3_quantity) || 1
    const qb3 = parseInt(form.item4_quantity) || 1

    let origPrice = 0
    const titles: string[] = []

    if (p) {
      origPrice += (p.price || 0) * qp
      titles.push(`${qp > 1 ? qp + ' ' : ''}${p.name}`)
    }
    if (b1) {
      origPrice += (b1.price || 0) * qb1
      titles.push(`${qb1 > 1 ? qb1 + ' ' : ''}${b1.name}`)
    }
    if (b2) {
      origPrice += (b2.price || 0) * qb2
      titles.push(`${qb2 > 1 ? qb2 + ' ' : ''}${b2.name}`)
    }
    if (b3) {
      origPrice += (b3.price || 0) * qb3
      titles.push(`${qb3 > 1 ? qb3 + ' ' : ''}${b3.name}`)
    }

    return {
      original_price: origPrice > 0 ? origPrice.toString() : form.original_price,
      title: titles.length > 0 ? titles.join(' + ') : form.title
    }
  }

  const updateAdminOfferField = (field: string, value: any) => {
    setOfferForm(prev => {
      const updated = { ...prev, [field]: value }
      const totals = recalculateAdminOfferTotals(updated)
      return {
        ...updated,
        original_price: totals.original_price,
        title: totals.title || updated.title
      }
    })
  }

  // ── Offer CRUD ──────────────────────────────────────────────────
  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerForm.primary_item_id || !offerForm.title || !offerForm.offer_price) return alert('يرجى ملء كافة الحقول الأساسية للعرض')
    setSavingOffer(true)

    const primaryImg = (offerForm.images && offerForm.images.length > 0) ? offerForm.images[0] : (offerForm.image_url || null)
    const payload = {
      restaurant_id: id,
      primary_item_id: offerForm.primary_item_id,
      min_quantity: parseInt(offerForm.min_quantity) || 1,
      bonus_item_id: offerForm.bonus_item_id || null,
      bonus_quantity: offerForm.bonus_item_id ? (parseInt(offerForm.bonus_quantity) || 1) : 1,
      item3_id: offerForm.item3_id || null,
      item3_quantity: offerForm.item3_id ? (parseInt(offerForm.item3_quantity) || 1) : 1,
      item4_id: offerForm.item4_id || null,
      item4_quantity: offerForm.item4_id ? (parseInt(offerForm.item4_quantity) || 1) : 1,
      title: offerForm.title,
      description: offerForm.description || null,
      original_price: offerForm.original_price ? parseFloat(offerForm.original_price) : null,
      offer_price: parseFloat(offerForm.offer_price),
      image_url: primaryImg,
      images: offerForm.images || (primaryImg ? [primaryImg] : []),
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
    setOfferForm({
      primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1',
      item3_id: '', item3_quantity: '1', item4_id: '', item4_quantity: '1',
      title: '', description: '', original_price: '', offer_price: '', image_url: '', images: [], is_active: true
    })
    fetchData()
  }

  const handleEditOffer = (offer: any) => {
    setEditOfferId(offer.id)
    let parsedImages: string[] = []
    if (Array.isArray(offer.images)) {
      parsedImages = offer.images
    } else if (typeof offer.images === 'string') {
      try { parsedImages = JSON.parse(offer.images) } catch (e) {}
    }
    if (parsedImages.length === 0 && offer.image_url) {
      parsedImages = [offer.image_url]
    }

    setOfferForm({
      primary_item_id: offer.primary_item_id || '',
      min_quantity: (offer.min_quantity || 1).toString(),
      bonus_item_id: offer.bonus_item_id || '',
      bonus_quantity: (offer.bonus_quantity || 1).toString(),
      item3_id: offer.item3_id || '',
      item3_quantity: (offer.item3_quantity || 1).toString(),
      item4_id: offer.item4_id || '',
      item4_quantity: (offer.item4_quantity || 1).toString(),
      title: offer.title || '',
      description: offer.description || '',
      original_price: offer.original_price ? offer.original_price.toString() : '',
      offer_price: offer.offer_price ? offer.offer_price.toString() : '',
      image_url: offer.image_url || '',
      images: parsedImages,
      is_active: offer.is_active ?? true
    })
    setShowOfferForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveMaxOffersLimit = async () => {
    setSavingMaxOffers(true)
    const { error } = await supabase.from('restaurants').update({ max_offers_limit: maxOffersLimitInput }).eq('id', id)
    if (error) alert('خطأ في حفظ الحد: ' + error.message)
    else {
      setRestaurant((prev: any) => ({ ...prev, max_offers_limit: maxOffersLimitInput }))
      alert(`تم تحديث الحد الأقصى للعروض لـ ${restaurant?.name || 'هذا المتجر'} إلى (${maxOffersLimitInput} عروض) بنجاح!`)
    }
    setSavingMaxOffers(false)
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
        <h1 className="text-xl font-black text-slate-200 mb-2">المتجر غير موجود</h1>
        <p className="text-slate-400 text-sm mb-6">لم نتمكن من العثور على المتجر المطلوب.</p>
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
                  {restaurant.store_type === 'supermarket' ? 'إدارة الماركت (الأدمن)' : restaurant.store_type === 'clothing' ? 'إدارة المعرض (الأدمن)' : restaurant.store_type === 'other' ? 'إدارة المتجر (الأدمن)' : 'إدارة المنيو (الأدمن)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">
                {restaurant.store_type === 'supermarket' ? 'تحكم كامل بالأقسام والمنتجات والعروض وأجور التوصيل' : restaurant.store_type === 'clothing' ? 'تحكم كامل بتشكيلة الأزياء والموديلات والقياسات' : 'تحكم كامل بالأقسام والوجبات والعروض وأجور التوصيل'}
              </p>
            </div>
          </div>

          {/* Left: Preview + Logout */}
          <div className="flex items-center gap-2">
            <a
              href={getMainDomainMenuUrl(restaurant.slug)}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-black flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <Eye size={14} className="text-orange-400" />
              <span>{restaurant.store_type === 'supermarket' ? 'معاينة الماركت' : restaurant.store_type === 'clothing' ? 'معاينة المعرض' : restaurant.store_type === 'other' ? 'معاينة المتجر' : 'معاينة المنيو'}</span>
            </a>


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
      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">

        {/* ── Subscription & Menu Status Admin Control Banner ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 text-orange-400 flex items-center justify-center text-xl shrink-0 border border-slate-700">
                🛡️
              </div>
              <div>
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <span>حالة الاشتراك ونشر المنيو للزبائن</span>
                  {(() => {
                    const { note } = parseRestaurantMultiplier(restaurant.subscription_notes)
                    return note ? (
                      <span className="text-[10px] text-slate-400 font-normal">({note})</span>
                    ) : null
                  })()}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  تحكم مباشر في إتاحة التعديل ونشر المنيو ومضاعفة الزيارات التسويقية.
                </p>
              </div>
            </div>

            {/* Quick Stats & Toggles */}
            <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
              {/* Today Visits Badge */}
              <div className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400 font-normal">زيارات اليوم:</span>
                <span className="text-emerald-400 font-black">{todayRealVisits} فعلي</span>
                <span className="text-slate-500">/</span>
                <span className="text-amber-400 font-black" title="الرقم المعروض لصاحب المتجر">
                  {getEffectiveVisits(todayRealVisits, multiplierVal)} للشريك 👁️
                </span>
              </div>

              {/* Subscription Toggle */}
              <button
                type="button"
                onClick={toggleSubscription}
                className={`px-3 py-2 rounded-2xl text-xs font-black border transition flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm ${
                  restaurant.is_subscription_active !== false
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                }`}
              >
                <span>اشتراك المتجر:</span>
                <span className="underline">{restaurant.is_subscription_active !== false ? 'نشط (تعديل متاح) ✅' : 'معلق (تعديل مقفل) ⛔'}</span>
              </button>

              {/* Menu Toggle */}
              <button
                type="button"
                onClick={toggleMenu}
                className={`px-3 py-2 rounded-2xl text-xs font-black border transition flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm ${
                  restaurant.is_menu_active !== false
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                }`}
              >
                <span>منيو الزبائن:</span>
                <span className="underline">{restaurant.is_menu_active !== false ? 'منشور متاح 🟢' : 'معلق مخفي 🔴'}</span>
              </button>
            </div>
          </div>

          {/* Quick Multiplier Bar */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-amber-400">🚀 مضاعف الزيارات للتسويق:</span>
              <span className="text-[11px] text-slate-400 font-medium">يتم ضرب عدد الزيارات الفعلية وتظهر لصاحب المتجر كـ ×{multiplierVal}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {MULTIPLIER_PRESETS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  disabled={savingMultiplier}
                  onClick={() => updateMultiplier(p.value)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 ${
                    multiplierVal === p.value
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT COLUMN (2 Cols): Item Form + Offers + Items ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* 1. ADD / EDIT MENU ITEM FORM MODAL OR INLINE CARD */}
            {showItemForm && (
              <div className="bg-slate-800/90 border border-orange-500/40 rounded-3xl p-5 shadow-xl animate-fade-in relative">
                <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
                  <h3 className="font-black text-base text-white flex items-center gap-2">
                    <Utensils size={18} className="text-orange-400" />
                    <span>{editItemId ? 'تعديل المنتج' : 'إضافة منتَج جديد'}</span>
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
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">اسم المنتج *</label>
                      <input
                        type="text"
                        placeholder="أدخل اسم المنتج..."
                        value={itemForm.name}
                        onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف المنتج والتفاصيل</label>
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

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          📸 صور المنتج (يمكنك رفع واحدة أو عدة صور - صور حصراً حد أقصى 5MB للواحدة)
                        </label>
                        <MultiImageUpload
                          images={itemForm.images || (itemForm.image_url ? [itemForm.image_url] : [])}
                          onChange={urls => {
                            setItemForm({
                              ...itemForm,
                              images: urls,
                              image_url: urls[0] || ''
                            })
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-700 p-2.5 rounded-xl select-none">
                        <input
                          type="checkbox"
                          checked={itemForm.is_available}
                          onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })}
                          className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-200">المنتج متوفر للطلب (إذا ألغي يظهر كـ نفد)</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-700 p-2.5 rounded-xl select-none">
                        <input
                          type="checkbox"
                          checked={!!(itemForm as any).is_hidden}
                          onChange={e => setItemForm({ ...itemForm, is_hidden: e.target.checked } as any)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-200">تعطيل وإخفاء من المنيو مؤقتاً 🙈</span>
                      </label>
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
                      {savingItem ? 'جاري الحفظ...' : editItemId ? 'تحديث المنتج' : 'حفظ وإضافة المنتج'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 2. OFFERS & BUNDLES SECTION */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-sm">
                    🔥
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2">
                      <span>إدارة العروض والبكجات</span>
                      <span className="text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                        {offers.length} / {restaurant?.max_offers_limit || 5} متاح
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">أنشئ عروض تخفيض أو بكجات تجميعية تظهر للزبائن أعلى المنيو</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Admin control for Max Offers Limit */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1">
                    <span className="text-[11px] font-bold text-slate-300">الحد المتاح:</span>
                    <input
                      type="number"
                      min="1"
                      value={maxOffersLimitInput}
                      onChange={e => setMaxOffersLimitInput(parseInt(e.target.value) || 1)}
                      className="w-12 bg-slate-800 text-orange-400 font-black text-center text-xs rounded-lg py-0.5 border border-slate-700 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveMaxOffersLimit}
                      disabled={savingMaxOffers}
                      className="px-2 py-0.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] transition disabled:opacity-50"
                    >
                      {savingMaxOffers ? '...' : 'تحديث'}
                    </button>
                  </div>

                  {!showOfferForm && (
                    <button
                      onClick={() => {
                        setEditOfferId(null)
                        setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', item3_id: '', item3_quantity: '1', item4_id: '', item4_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', images: [], is_active: true })
                        setShowOfferForm(true)
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                    >
                      <Plus size={15} />
                      <span>إضافة عرض</span>
                    </button>
                  )}
                </div>
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
                    {/* Product 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">المنتج الأول (الأساسي) *</label>
                        <select
                          value={offerForm.primary_item_id}
                          onChange={e => updateAdminOfferField('primary_item_id', e.target.value)}
                          required
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        >
                          <option value="">اختر المنتج الأول...</option>
                          {menuItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">الكمية من المنتج الأول</label>
                        <input
                          type="number"
                          min="1"
                          value={offerForm.min_quantity}
                          onChange={e => updateAdminOfferField('min_quantity', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Product 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">المنتج الثاني (اختياري)</label>
                        <select
                          value={offerForm.bonus_item_id}
                          onChange={e => updateAdminOfferField('bonus_item_id', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        >
                          <option value="">بدون منتج ثاني...</option>
                          {menuItems.map(i => (
                            <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">كمية المنتج الثاني</label>
                        <input
                          type="number"
                          min="1"
                          value={offerForm.bonus_quantity}
                          disabled={!offerForm.bonus_item_id}
                          onChange={e => updateAdminOfferField('bonus_quantity', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Product 3 (Hidden by default until needed) */}
                    {(offerForm.item3_id || showAdminItem3Input) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-300">المنتج الثالث (اختياري)</label>
                            <button type="button" onClick={() => { updateAdminOfferField('item3_id', ''); setShowAdminItem3Input(false); }} className="text-red-400 text-[10px]">إلغاء ✕</button>
                          </div>
                          <select
                            value={offerForm.item3_id}
                            onChange={e => updateAdminOfferField('item3_id', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                          >
                            <option value="">اختر المنتج الثالث...</option>
                            {menuItems.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">كمية المنتج الثالث</label>
                          <input
                            type="number"
                            min="1"
                            value={offerForm.item3_quantity}
                            disabled={!offerForm.item3_id}
                            onChange={e => updateAdminOfferField('item3_quantity', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    {!offerForm.item3_id && !showAdminItem3Input && (
                      <button type="button" onClick={() => setShowAdminItem3Input(true)} className="w-full py-2 border border-dashed border-orange-500/40 hover:border-orange-500 rounded-xl text-orange-400 font-bold text-xs flex items-center justify-center gap-1 transition bg-slate-800/30 hover:bg-slate-800/80">
                        + إضافة منتج ثالث للعرض
                      </button>
                    )}

                    {/* Product 4 (Hidden by default until Product 3 is active) */}
                    {(offerForm.item4_id || showAdminItem4Input) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-slide-down bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-300">المنتج الرابع (اختياري)</label>
                            <button type="button" onClick={() => { updateAdminOfferField('item4_id', ''); setShowAdminItem4Input(false); }} className="text-red-400 text-[10px]">إلغاء ✕</button>
                          </div>
                          <select
                            value={offerForm.item4_id}
                            onChange={e => updateAdminOfferField('item4_id', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                          >
                            <option value="">اختر المنتج الرابع...</option>
                            {menuItems.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.price} ₺)</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">كمية المنتج الرابع</label>
                          <input
                            type="number"
                            min="1"
                            value={offerForm.item4_quantity}
                            disabled={!offerForm.item4_id}
                            onChange={e => updateAdminOfferField('item4_quantity', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    )}

                    {(offerForm.item3_id || showAdminItem3Input) && !offerForm.item4_id && !showAdminItem4Input && (
                      <button type="button" onClick={() => setShowAdminItem4Input(true)} className="w-full py-2 border border-dashed border-orange-500/40 hover:border-orange-500 rounded-xl text-orange-400 font-bold text-xs flex items-center justify-center gap-1 transition bg-slate-800/30 hover:bg-slate-800/80">
                        + إضافة منتج رابع للعرض
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">عنوان العرض الترويجي *</label>
                        <input
                          type="text"
                          placeholder="مثال: عرض 2 عباية + فستان + حقيبة"
                          value={offerForm.title}
                          onChange={e => setOfferForm({ ...offerForm, title: e.target.value })}
                          required
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
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        📸 صور العرض المخصصة (يمكنك رفع واحدة أو عدة صور للعرض - صور حصراً حد أقصى 5MB للواحدة)
                      </label>
                      <p className="text-[10px] text-slate-400 font-bold mb-1.5">
                        💡 عند ترك هذا الخيار فارغاً، سيقوم النظام تلقائياً بدمج وتنسيق صور المنتجات المختارة في العرض.
                      </p>
                      <MultiImageUpload
                        images={offerForm.images || (offerForm.image_url ? [offerForm.image_url] : [])}
                        onChange={urls => setOfferForm({ ...offerForm, images: urls, image_url: urls[0] || '' })}
                      />
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
                    لا توجد عروض ترويجية مضافة حالياً لهذا المتجر.
                  </p>
                ) : (
                  offers.map(offer => {
                    const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
                    const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)
                    const item3 = menuItems.find(i => i.id === offer.item3_id)
                    const item4 = menuItems.find(i => i.id === offer.item4_id)
                    return (
                      <div key={offer.id} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <SmartOfferImage
                            primaryImage={primaryItem?.image_url}
                            bonusImage={bonusItem?.image_url}
                            item3Image={item3?.image_url}
                            item4Image={item4?.image_url}
                            customImage={offer.image_url}
                            minQuantity={offer.min_quantity}
                            bonusQuantity={offer.bonus_quantity}
                            className="w-12 h-12 rounded-xl shrink-0"
                          />
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

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Super Admin sort order controls */}
                          <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-xl border border-slate-700">
                            <span className="text-[10px] text-slate-400 font-bold">ترتيب:</span>
                            <input
                              type="number"
                              value={offer.sort_order || 0}
                              onChange={async e => {
                                const val = parseInt(e.target.value) || 0
                                await supabase.from('offers').update({ sort_order: val }).eq('id', offer.id)
                                fetchData()
                              }}
                              className="w-10 bg-slate-900 text-orange-400 font-black text-center text-xs rounded border border-slate-700 outline-none focus:border-orange-500"
                            />
                          </div>

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
                    )
                  })
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
                    <h3 className="font-black text-sm text-white">المنتجات</h3>
                    <p className="text-[11px] text-slate-400 font-bold">{menuItems.length} منتَج في {categories.length} قسم</p>
                  </div>
                </div>

                {!showItemForm && (
                  <button
                    onClick={() => {
                      setEditItemId(null)
                      setItemForm({ category_id: categories[0]?.id || '', name: '', description: '', price: '', image_url: '', is_available: true, is_offer: false, original_price: '', offer_title: '', images: [], sizesText: '' })
                      setShowItemForm(true)
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Plus size={15} />
                    <span>منتَج جديد</span>
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
                        {itemsInCat.length} منتَج
                      </span>
                    </div>

                    {itemsInCat.length === 0 ? (
                      <p className="text-[11px] text-slate-500 font-bold text-center py-3 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        لا توجد منتجات في هذا القسم بعد
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {itemsInCat.map(item => (
                          <div
                            key={item.id}
                            className={`bg-slate-900 border rounded-2xl p-3 flex items-center justify-between gap-3 transition ${item.is_available ? 'border-slate-700/80' : 'border-red-900/40 opacity-60'
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

                            {/* Actions & Toggles */}
                            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                              <button
                                onClick={() => handleItemAvailabilityClick(item)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                                  item.is_available !== false
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                                title="تغيير التوفر وتحديد المدة"
                              >
                                <span>{item.is_available !== false ? 'متوفر ✅' : 'نفد 🚫'}</span>
                                {item.is_available === false && item.out_of_stock_until && (
                                  <span className="text-[9px] opacity-75" dir="ltr">
                                    ({new Date(item.out_of_stock_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                  </span>
                                )}
                              </button>

                              <button
                                onClick={() => handleEditItem(item)}
                                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center justify-center transition"
                                title="تعديل المنتج"
                              >
                                <Edit size={13} />
                              </button>

                              <button
                                onClick={() => deleteItem(item.id, item.name)}
                                className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                                title="حذف المنتج"
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
                  <h3 className="font-black text-sm text-white">أقسام المتجر الفرعية</h3>
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
                {categories.map((cat, idx) => {
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
                    <div key={cat.id} className="bg-slate-900 border border-slate-700/80 rounded-2xl p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveCategory(idx, 'up')}
                            disabled={idx === 0}
                            title="رفع القسم للأعلى ⬆️"
                            className="w-5 h-4.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition active:scale-90"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCategory(idx, 'down')}
                            disabled={idx === categories.length - 1}
                            title="إنزال القسم للأسفل ⬇️"
                            className="w-5 h-4.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition active:scale-90"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>

                        <div className="min-w-0">
                          <span className="font-black text-xs text-white truncate block">{cat.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {count} منتَج
                          </span>
                        </div>
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
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${tier.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
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

      {/* ── Quick Out-of-Stock Duration Selector Modal (Admin) ── */}
      {outOfStockTargetItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl animate-fade-in">
          <div className="bg-slate-900 text-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-slate-700 animate-slide-up space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-base font-bold">
                  🚫
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">تحديد مدة نفاد الكمية</h4>
                  <p className="text-[11px] text-slate-400 font-bold truncate max-w-[200px]">
                    {outOfStockTargetItem.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOutOfStockTargetItem(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              اختر متى سيعود المنتج متوفراً تلقائياً للزبائن في المنيو:
            </p>

            <div className="space-y-2">
              {[
                { key: 'manual', label: '🛑 يدوياً (حتى يتم إعادة تفعيله)', desc: 'لن يتفعل تلقائياً، يتطلب تفعيله يدوياً' },
                { key: '2h', label: '⏱️ لمدة ساعتين (2 ساعة)', desc: 'سيتفعل تلقائياً بعد ساعتين' },
                { key: '4h', label: '⏱️ لمدة 4 ساعات', desc: 'سيتفعل تلقائياً بعد 4 ساعات' },
                { key: 'tomorrow_morning', label: '🌙 حتى صباح الغد (09:00 ص)', desc: 'سيتفعل مع بداية دوام الغد' },
                { key: 'custom', label: '📅 تحديد وقت وتاريخ مخصص', desc: 'حدد الوقت والتاريخ الذي تريده' },
              ].map(opt => (
                <label
                  key={opt.key}
                  className={`flex flex-col p-3 rounded-2xl border cursor-pointer transition ${
                    outOfStockOption === opt.key
                      ? 'bg-rose-950/40 border-rose-500/50 shadow-xs text-white'
                      : 'bg-slate-850 bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{opt.label}</span>
                    <input
                      type="radio"
                      name="adminOutOfStockOpt"
                      value={opt.key}
                      checked={outOfStockOption === opt.key}
                      onChange={() => setOutOfStockOption(opt.key as any)}
                      className="w-4 h-4 accent-rose-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">{opt.desc}</span>
                </label>
              ))}
            </div>

            {outOfStockOption === 'custom' && (
              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">حدد الوقت والتاريخ للعودة:</label>
                <input
                  type="datetime-local"
                  value={customOutOfStockTime}
                  onChange={e => setCustomOutOfStockTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-orange-500"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOutOfStockTargetItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex-1 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmOutOfStock}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex-1 shadow-md transition"
              >
                تأكيد النفاد 🚫
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
