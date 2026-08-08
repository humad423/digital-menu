'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import ImageUpload from '@/components/ImageUpload'
import MultiImageUpload from '@/components/MultiImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import StoreSettingsModal from '@/components/StoreSettingsModal'
import { Plus, Trash2, ArrowRight, Edit, GripVertical, LogOut, Store, Tag, Utensils, X, Settings, Eye, Download, Share } from 'lucide-react'
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
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // ── Partner PWA App Install State ─────────────────────────────
  const [canInstallPwa, setCanInstallPwa] = useState(true)
  const [deferredPwaPrompt, setDeferredPwaPrompt] = useState<any>(null)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)

  useEffect(() => {
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )

    // Hide install button ONLY inside installed app
    if (isStandalone) {
      setCanInstallPwa(false)
      return
    }

    const ua = typeof window !== 'undefined' ? window.navigator.userAgent : ''
    const isIos = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    setIsIosDevice(isIos)

    // 1. Check if early captured beforeinstallprompt exists
    if (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) {
      setDeferredPwaPrompt((window as any).deferredPwaPrompt)
    }

    // 2. Listen for beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      ;(window as any).deferredPwaPrompt = e
      setDeferredPwaPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallPartnerPwa = async () => {
    if (isIosDevice) {
      setShowInstallModal(true)
      return
    }

    // Direct synchronous invocation inside user gesture
    const promptObj = (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null) || deferredPwaPrompt

    if (promptObj) {
      try {
        await promptObj.prompt()
        const { outcome } = await promptObj.userChoice
        if (outcome === 'accepted') {
          setCanInstallPwa(false)
        }
      } catch (e) {
        setShowInstallModal(true)
      }
    } else {
      setShowInstallModal(true)
    }
  }

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
    is_offer: false, original_price: '', offer_title: '', images: [] as string[], sizesText: '',
    unit: 'piece', allow_custom_amount: false
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
  const [showItem3Input, setShowItem3Input] = useState(false)
  const [showItem4Input, setShowItem4Input] = useState(false)
  const [savingOffer, setSavingOffer] = useState(false)

  // Verify restaurant owner session or Super Admin access
  useEffect(() => {
    async function checkOwnerAuth() {
      if (!id) return

      const savedOwnerSession = typeof window !== 'undefined' ? localStorage.getItem('restaurant_owner_session') : null
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const isParamAdmin = searchParams?.get('auth') === 'admin' || searchParams?.get('impersonate') === 'true'

      let parsedSession: any = null
      if (savedOwnerSession) {
        try { parsedSession = JSON.parse(savedOwnerSession) } catch (e) {}
      }

      // Check if logged into Supabase as Super Admin
      const { data: { user } } = await supabase.auth.getUser()
      let isAdminUser = false
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (profile?.role === 'admin') isAdminUser = true
      }

      // If opening from admin dashboard (?auth=admin) OR logged in as admin OR session has admin role:
      if (isParamAdmin || isAdminUser || parsedSession?.role === 'admin') {
        const adminSession = {
          restaurant_id: id,
          restaurant_name: 'Super Admin',
          role: 'admin'
        }
        localStorage.setItem('restaurant_owner_session', JSON.stringify(adminSession))
        setAuthenticatedOwner(adminSession)
        return
      }

      // Regular Store Owner check
      if (parsedSession) {
        if (parsedSession.restaurant_id === id) {
          setAuthenticatedOwner(parsedSession)
          return
        }
        // Clear session if owner attempts to view a store that isn't theirs
        localStorage.removeItem('restaurant_owner_session')
      }

      const partnerDashboardUrl = typeof window !== 'undefined' && window.location.hostname.includes('alfsouq.com')
        ? 'https://partner.alfsouq.com/dashboard'
        : '/dashboard'
      window.location.href = partnerDashboardUrl
    }

    checkOwnerAuth()
  }, [id])

  // ── Delivery Tiers State ─────────────────────────────────────────
  const [deliveryTiers, setDeliveryTiers] = useState<any[]>([])
  const [newTier, setNewTier] = useState({ min_km: '', max_km: '', fee: '', is_active: true })
  const [savingTiers, setSavingTiers] = useState(false)

  const fetchData = async (showFullSpinner = false) => {
    try {
      if (showFullSpinner) setLoading(true)
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
      if (showFullSpinner) setLoading(false)
    }
  }

  useEffect(() => {
    if (authenticatedOwner) {
      fetchData(true)
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
      setCategories(prev => prev.map(c => c.id === editCatId ? { ...c, name: editCatName, sort_order: editCatSort } : c))
      const targetEditId = editCatId
      const targetName = editCatName
      const targetSort = editCatSort
      setEditCatId(null)
      await supabase.from('categories').update({ name: targetName, sort_order: targetSort }).eq('id', targetEditId)
    } else {
      if (!newCatName.trim()) return
      const maxSort = categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) + 1 : 1
      const catToInsert = { restaurant_id: id, name: newCatName.trim(), sort_order: maxSort }
      setNewCatName('')
      const { data } = await supabase.from('categories').insert([catToInsert]).select()
      if (data && data[0]) {
        setCategories(prev => [...prev, data[0]])
      }
    }
    fetchData(false)
  }

  const deleteCategory = async (catId: string, name: string) => {
    if (confirm(`حذف القسم "${name}" مع كافة منتجاته؟`)) {
      setCategories(prev => prev.filter(c => c.id !== catId))
      await supabase.from('categories').delete().eq('id', catId)
      fetchData(false)
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
      unit: itemForm.unit || (itemForm.allow_custom_amount ? 'kg' : 'piece'),
      allow_custom_amount: !!itemForm.allow_custom_amount,
      is_available: itemForm.is_available,
      is_offer: itemForm.is_offer,
      original_price: itemForm.original_price ? parseFloat(itemForm.original_price) : null,
      offer_title: itemForm.offer_title || null
    }

    if (editItemId) {
      setMenuItems(prev => prev.map(i => i.id === editItemId ? { ...i, ...payload } : i))
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
    setItemForm({ category_id: '', name: '', description: '', price: '', image_url: '', images: [], sizesText: '', is_available: true, is_offer: false, original_price: '', offer_title: '', unit: 'piece', allow_custom_amount: false })
    fetchData(false)
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
      unit: item.unit || (item.allow_custom_amount ? 'kg' : 'piece'),
      allow_custom_amount: item.allow_custom_amount ?? item.unit === 'kg',
      is_available: item.is_available,
      is_offer: item.is_offer || false,
      original_price: item.original_price ? item.original_price.toString() : '',
      offer_title: item.offer_title || ''
    })
    setShowItemForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleItemAvailability = async (item: any) => {
    const newStatus = !item.is_available
    setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newStatus } : i))
    await supabase.from('menu_items').update({ is_available: newStatus }).eq('id', item.id)
    fetchData(false)
  }

  const deleteItem = async (id: string, name: string) => {
    if (confirm(`حذف المنتج "${name}"؟`)) {
      setMenuItems(prev => prev.filter(i => i.id !== id))
      await supabase.from('menu_items').delete().eq('id', id)
      fetchData(false)
    }
  }

  // ── Auto Offer Calculation ──────────────────────────────────────
  const recalculateOfferTotals = (form: typeof offerForm) => {
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

  const updateOfferField = (field: string, value: any) => {
    setOfferForm(prev => {
      const updated = { ...prev, [field]: value }
      const totals = recalculateOfferTotals(updated)
      return {
        ...updated,
        original_price: totals.original_price,
        title: totals.title || updated.title
      }
    })
  }

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerForm.primary_item_id || !offerForm.offer_price || !offerForm.title) {
      return alert('يرجى اختيار المنتج الأساسي وتحديد سعر العرض وعنوانه')
    }

    setSavingOffer(true)
    const primaryImg = (offerForm.images && offerForm.images.length > 0) ? offerForm.images[0] : (offerForm.image_url || null)

    const payload = {
      restaurant_id: id,
      type: 'bundle',
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
      setOffers(prev => prev.map(o => o.id === editOfferId ? { ...o, ...payload } : o))
      const { error } = await supabase.from('offers').update(payload).eq('id', editOfferId)
      if (error) {
        alert('خطأ في تعديل العرض: ' + error.message)
        setSavingOffer(false)
        return
      }
    } else {
      const { data: maxOffer } = await supabase.from('offers').select('sort_order').order('sort_order', { ascending: false }).limit(1)
      const nextRank = (maxOffer && maxOffer[0]?.sort_order && maxOffer[0].sort_order > 0) ? (maxOffer[0].sort_order + 1) : 1
      const { data: insertedData, error } = await supabase.from('offers').insert([{ ...payload, sort_order: nextRank }]).select()
      if (error) {
        alert('خطأ في إضافة العرض: ' + error.message)
        setSavingOffer(false)
        return
      }
      if (insertedData && insertedData[0]) {
        setOffers(prev => [insertedData[0], ...prev])
      }
    }

    setSavingOffer(false)
    setShowOfferForm(false)
    setEditOfferId(null)
    setOfferForm({
      primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1',
      item3_id: '', item3_quantity: '1', item4_id: '', item4_quantity: '1',
      title: '', description: '', original_price: '', offer_price: '', image_url: '', images: [], is_active: true
    })
    fetchData(false)
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
      min_quantity: offer.min_quantity ? offer.min_quantity.toString() : '1',
      bonus_item_id: offer.bonus_item_id || '',
      bonus_quantity: offer.bonus_quantity ? offer.bonus_quantity.toString() : '1',
      item3_id: offer.item3_id || '',
      item3_quantity: offer.item3_quantity ? offer.item3_quantity.toString() : '1',
      item4_id: offer.item4_id || '',
      item4_quantity: offer.item4_quantity ? offer.item4_quantity.toString() : '1',
      title: offer.title || '',
      description: offer.description || '',
      original_price: offer.original_price ? offer.original_price.toString() : '',
      offer_price: offer.offer_price ? offer.offer_price.toString() : '',
      image_url: offer.image_url || '',
      images: parsedImages,
      is_active: offer.is_active
    })
    setShowOfferForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleOfferActive = async (offer: any) => {
    const newStatus = !offer.is_active
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: newStatus } : o))
    await supabase.from('offers').update({ is_active: newStatus }).eq('id', offer.id)
    fetchData(false)
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

  const terms = (() => {
    const st = restaurant?.store_type
    if (st === 'supermarket') {
      return {
        previewBtn: 'معاينة الماركت 👁️',
        itemLabel: 'المنتجات والعروض',
        subCatsHeader: 'أقسام الماركت الفرعية',
        countUnit: 'منتَج',
        offersHeader: 'إدارة العروض والتخفيضات 🏷️',
        offersDesc: 'عروض وتخفيضات تظهر في أعلى الماركت للزبائن',
        newOfferBtn: 'عرض تخفيض جديد',
        noOffersText: 'لا توجد عروض تخفيض حالياً لهذا الماركت',
        primaryItemLabel: 'المنتَج الأساسي *',
        bonusItemLabel: 'منتَج مجاني إضافي (اختياري)',
        itemsHeader: 'عروض المنتجات والمواد الغذائية',
        newItemBtn: 'منتَج / عرض جديد',
        editItemTitle: 'تعديل المنتَج / العرض',
        newItemTitle: 'إضافة منتَج أو عرض للماركت',
        itemNameLabel: 'اسم المنتج / العرض *',
        itemNamePlaceholder: 'مثال: زيت زيتون 1 لتر',
        itemPriceLabel: 'سعر العرض (TL) *',
      }
    }
    if (st === 'clothing') {
      return {
        previewBtn: 'معاينة المعرض 👁️',
        itemLabel: 'تشكيلة الموديلات',
        subCatsHeader: 'أقسام التشكيلة الفرعية',
        countUnit: 'موديل',
        offersHeader: 'إدارة عروض الأزياء والتخفيضات 👗',
        offersDesc: 'عروض وموديلات مميزة تظهر أعلى قسم الألبسة',
        newOfferBtn: 'عرض جديد',
        noOffersText: 'لا توجد عروض تخفيض حالياً لهذا المتجر',
        primaryItemLabel: 'الموديل الأساسي *',
        bonusItemLabel: 'قطعة إضافية مع العرض (اختياري)',
        itemsHeader: 'تشكيلة الأزياء والموديلات',
        newItemBtn: 'موديل جديد',
        editItemTitle: 'تعديل بيانات الموديل',
        newItemTitle: 'إضافة موديل ألبسة جديد',
        itemNameLabel: 'اسم القطعة / الموديل *',
        itemNamePlaceholder: 'مثال: فستان سهرة مخمل',
        itemPriceLabel: 'السعر (TL) *',
      }
    }
    if (st === 'other') {
      return {
        previewBtn: 'معاينة المتجر 👁️',
        itemLabel: 'المنتجات والخدمات',
        subCatsHeader: 'أقسام المتجر الفرعية',
        countUnit: 'عنصر',
        offersHeader: 'إدارة العروض والتخفيضات 🎁',
        offersDesc: 'عروض تظهر في أعلى المتجر للزبائن',
        newOfferBtn: 'عرض جديد',
        noOffersText: 'لا توجد عروض حالياً لهذا المتجر',
        primaryItemLabel: 'العنصر الأساسي *',
        bonusItemLabel: 'عنصر إضافي مع العرض (اختياري)',
        itemsHeader: 'المنتجات والخدمات',
        newItemBtn: 'عنصر جديد',
        editItemTitle: 'تعديل البيانات',
        newItemTitle: 'إضافة منتَج أو خدمة جديدة',
        itemNameLabel: 'اسم المنتج / الخدمة *',
        itemNamePlaceholder: 'مثال: ساعة ذكية Smart Watch',
        itemPriceLabel: 'السعر (TL) *',
      }
    }
    return {
      previewBtn: 'معاينة المتجر 👁️',
      itemLabel: 'المنتجات',
      subCatsHeader: 'أقسام المتجر الفرعية',
      countUnit: 'منتَج',
      offersHeader: 'إدارة العروض والتخفيضات 🏷️',
      offersDesc: 'عروض وتخفيضات تظهر في أعلى المتجر للزبائن',
      newOfferBtn: 'عرض جديد',
      noOffersText: 'لا توجد عروض ترويجية حالياً لهذا المتجر',
      primaryItemLabel: 'المنتَج الأساسي *',
      bonusItemLabel: 'منتَج مجاني إضافي (اختياري)',
      itemsHeader: 'المنتجات',
      newItemBtn: 'منتَج جديد',
      editItemTitle: 'تعديل المنتَج',
      newItemTitle: 'إضافة منتَج جديد',
      itemNameLabel: 'اسم المنتج *',
      itemNamePlaceholder: 'مثال: اسم المنتج هنا...',
      itemPriceLabel: 'السعر (TL) *',
    }
  })()

  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden" dir="rtl" style={{ background: 'var(--content-bg)' }}>
      
      {/* ── Responsive Partner Header ── */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg border-b border-slate-800/80 px-3 py-2.5 w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto space-y-2">
          
          {/* Top Row: Store Info & Exit Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="" className="w-8 h-8 rounded-xl object-cover border border-white/10 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0" style={{ background: restaurant.primary_color || '#F97316' }}>
                  🏪
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-black leading-snug text-white truncate max-w-[170px] sm:max-w-xs">{restaurant.name}</h1>
                <p className="text-[10px] text-slate-400 font-bold leading-tight">لوحة تحكم الشريك</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>

          {/* Action Pills Row (Scrollable on Mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pt-0.5 pb-0.5 -mx-1 px-1">
            {canInstallPwa && (
              <button
                onClick={handleInstallPartnerPwa}
                className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                title="تثبيت لوحة التحكم كتطبيق على هاتفك"
              >
                <Download size={13} />
                <span>تثبيت التطبيق 📲</span>
              </button>
            )}

            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
            >
              <Settings size={13} />
              <span>الإعدادات ⚙️</span>
            </button>

            <a
              href={getMainDomainMenuUrl(restaurant.slug)}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Eye size={13} className="text-slate-400" />
              <span>{terms.previewBtn}</span>
            </a>
          </div>

        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-full">
        <div className="dash-content">
          
          {/* Panel Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-5 animate-fade-in-up">
            {[
              { label: 'الأقسام', value: categories.length, color: '#3B82F6', emoji: '📁' },
              { label: terms.itemLabel, value: menuItems.length, color: '#10B981', emoji: '🍱' },
              { label: 'العروض', value: offers.length, color: '#F97316', emoji: '🔥' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-2.5 sm:p-4 border border-slate-200/80 shadow-xs flex items-center justify-center sm:justify-start gap-2 sm:gap-3 text-center sm:text-right">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 hidden sm:flex" style={{ background: s.color + '18' }}>{s.emoji}</div>
                <div>
                  <p className="text-base sm:text-xl font-black leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 leading-tight">{s.label}</p>
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
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><span>📁</span> {terms.subCatsHeader}</h3>
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
                          <span className="text-xs text-slate-400 mr-2">{menuItems.filter(m => m.category_id === cat.id).length} {terms.countUnit}</span>
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

              {/* Delivery Tiers Card (Available for all store types with delivery) */}
              {restaurant?.has_delivery !== false && (
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
              )}
            </div>

            {/* ── RIGHT MAIN: Items + Offers ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* OFFERS SECTION */}
              <div className="c-card border-t-4 border-t-orange-400">
                <div className="c-card-header">
                  <div>
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span>🔥</span> {terms.offersHeader}
                      <span className="text-xs text-orange-600 font-bold bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                        {offers.length} / {restaurant?.max_offers_limit || 5} متاح
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{terms.offersDesc}</p>
                  </div>
                  <button
                    onClick={() => { setEditOfferId(null); setOfferForm({ primary_item_id: '', min_quantity: '1', bonus_item_id: '', bonus_quantity: '1', item3_id: '', item3_quantity: '1', item4_id: '', item4_quantity: '1', title: '', description: '', original_price: '', offer_price: '', image_url: '', images: [], is_active: true }); setShowOfferForm(!showOfferForm) }}
                    disabled={offers.length >= (restaurant?.max_offers_limit || 5) && !editOfferId}
                    className="btn btn-primary btn-sm disabled:opacity-40"
                  >
                    <Plus size={15} /> {terms.newOfferBtn}
                  </button>
                </div>

                {offers.length >= (restaurant?.max_offers_limit || 5) && !showOfferForm && (
                  <div className="mx-4 mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <span>⚠️</span>
                    <span>لقد بلغت الحد الأقصى للعروض المتاحة لمتجرك ({restaurant?.max_offers_limit || 5} عروض). تواصل مع إدارة المنصة لزيادة الحد.</span>
                  </div>
                )}

                {showOfferForm && (
                  <div className="mx-4 mb-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 animate-slide-down">
                    <h4 className="font-black text-slate-800 mb-3">{editOfferId ? 'تعديل العرض' : 'إنشاء عرض جديد'}</h4>
                    <form onSubmit={handleSaveOffer} className="space-y-3">
                      {/* Product 1 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100">
                        <div className="md:col-span-2">
                          <label className="f-label">المنتج الأول (الأساسي) *</label>
                          <select required value={offerForm.primary_item_id} onChange={e => updateOfferField('primary_item_id', e.target.value)} className="f-input">
                            <option value="">اختر المنتج الأول...</option>
                            {menuItems.map(item => <option key={item.id} value={item.id}>{item.name} ({item.price} ₺)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">الكمية</label>
                          <input type="number" min="1" required value={offerForm.min_quantity}
                            onChange={e => updateOfferField('min_quantity', e.target.value)} className="f-input text-center" />
                        </div>
                      </div>

                      {/* Product 2 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100">
                        <div className="md:col-span-2">
                          <label className="f-label">المنتج الثاني (اختياري)</label>
                          <select value={offerForm.bonus_item_id} onChange={e => updateOfferField('bonus_item_id', e.target.value)} className="f-input">
                            <option value="">بدون منتج ثاني</option>
                            {menuItems.map(item => <option key={item.id} value={item.id}>🎁 {item.name} ({item.price} ₺)</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">كميتها</label>
                          <input type="number" min="1" value={offerForm.bonus_quantity} disabled={!offerForm.bonus_item_id}
                            onChange={e => updateOfferField('bonus_quantity', e.target.value)} className="f-input text-center" />
                        </div>
                      </div>

                      {/* Product 3 (Hidden by default until needed) */}
                      {(offerForm.item3_id || showItem3Input) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100 animate-slide-down">
                          <div className="md:col-span-2">
                            <label className="f-label flex items-center justify-between">
                              <span>المنتج الثالث (اختياري)</span>
                              <button type="button" onClick={() => { updateOfferField('item3_id', ''); setShowItem3Input(false); }} className="text-red-500 text-[10px]">إلغاء ✕</button>
                            </label>
                            <select value={offerForm.item3_id} onChange={e => updateOfferField('item3_id', e.target.value)} className="f-input">
                              <option value="">اختر المنتج الثالث...</option>
                              {menuItems.map(item => <option key={item.id} value={item.id}>🎁 {item.name} ({item.price} ₺)</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="f-label">كميتها</label>
                            <input type="number" min="1" value={offerForm.item3_quantity} disabled={!offerForm.item3_id}
                              onChange={e => updateOfferField('item3_quantity', e.target.value)} className="f-input text-center" />
                          </div>
                        </div>
                      )}

                      {!offerForm.item3_id && !showItem3Input && (
                        <button type="button" onClick={() => setShowItem3Input(true)} className="w-full py-2 border border-dashed border-orange-300 hover:border-orange-500 rounded-xl text-orange-600 font-bold text-xs flex items-center justify-center gap-1 transition bg-white/50 hover:bg-white">
                          + إضافة منتج ثالث للعرض
                        </button>
                      )}

                      {/* Product 4 (Hidden by default until Product 3 is active) */}
                      {(offerForm.item4_id || showItem4Input) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-orange-100 animate-slide-down">
                          <div className="md:col-span-2">
                            <label className="f-label flex items-center justify-between">
                              <span>المنتج الرابع (اختياري)</span>
                              <button type="button" onClick={() => { updateOfferField('item4_id', ''); setShowItem4Input(false); }} className="text-red-500 text-[10px]">إلغاء ✕</button>
                            </label>
                            <select value={offerForm.item4_id} onChange={e => updateOfferField('item4_id', e.target.value)} className="f-input">
                              <option value="">اختر المنتج الرابع...</option>
                              {menuItems.map(item => <option key={item.id} value={item.id}>🎁 {item.name} ({item.price} ₺)</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="f-label">كميتها</label>
                            <input type="number" min="1" value={offerForm.item4_quantity} disabled={!offerForm.item4_id}
                              onChange={e => updateOfferField('item4_quantity', e.target.value)} className="f-input text-center" />
                          </div>
                        </div>
                      )}

                      {(offerForm.item3_id || showItem3Input) && !offerForm.item4_id && !showItem4Input && (
                        <button type="button" onClick={() => setShowItem4Input(true)} className="w-full py-2 border border-dashed border-orange-300 hover:border-orange-500 rounded-xl text-orange-600 font-bold text-xs flex items-center justify-center gap-1 transition bg-white/50 hover:bg-white">
                          + إضافة منتج رابع للعرض
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">عنوان العرض الترويجي *</label>
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

                      <div>
                        <label className="f-label mb-1">
                          📸 صور العرض المخصصة (يمكنك رفع واحدة أو عدة صور للعرض - صور حصراً حد أقصى 5MB للواحدة)
                        </label>
                        <p className="text-[10px] text-slate-400 font-bold mb-2">
                          💡 في حال عدم رفع صورة مخصصة، سيقوم النظام تلقائياً بدمج وتنسيق صور المنتجات المختارة في العرض.
                        </p>
                        <MultiImageUpload
                          images={offerForm.images || (offerForm.image_url ? [offerForm.image_url] : [])}
                          onChange={urls => setOfferForm({ ...offerForm, images: urls, image_url: urls[0] || '' })}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
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
                      <p className="text-slate-400 text-sm font-medium">{terms.noOffersText}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {offers.map(offer => {
                        const primaryItem = menuItems.find(i => i.id === offer.primary_item_id)
                        const bonusItem = menuItems.find(i => i.id === offer.bonus_item_id)
                        const item3 = menuItems.find(i => i.id === offer.item3_id)
                        const item4 = menuItems.find(i => i.id === offer.item4_id)
                        return (
                          <div key={offer.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                            <SmartOfferImage
                              primaryImage={primaryItem?.image_url}
                              bonusImage={bonusItem?.image_url}
                              item3Image={item3?.image_url}
                              item4Image={item4?.image_url}
                              customImage={offer.image_url}
                              minQuantity={offer.min_quantity}
                              bonusQuantity={offer.bonus_quantity}
                              className="w-16 h-16 rounded-xl shrink-0"
                            />
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
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span>{restaurant?.store_type === 'clothing' ? '👗' : restaurant?.store_type === 'supermarket' ? '🛒' : '📦'}</span>
                      {restaurant?.store_type === 'clothing' ? 'تشكيلة الأزياء والموديلات' : restaurant?.store_type === 'supermarket' ? 'عروض المنتجات والمواد الغذائية' : 'المنتجات'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{menuItems.length} عنصر في {categories.length} قسم</p>
                  </div>
                  <button
                    onClick={() => { setShowItemForm(!showItemForm); setEditItemId(null); setItemForm({ category_id: '', name: '', description: '', price: '', image_url: '', images: [], sizesText: '', is_available: true, is_offer: false, original_price: '', offer_title: '', unit: 'piece', allow_custom_amount: false }) }}
                    disabled={categories.length === 0}
                    className="btn btn-dark btn-sm disabled:opacity-40"
                  >
                    <Plus size={15} /> {restaurant?.store_type === 'clothing' ? 'موديل جديد' : 'منتَج جديد'}
                  </button>
                </div>

                {categories.length === 0 && (
                  <div className="mx-4 mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-bold text-center">
                    ⚠️ أضف قسماً فرعياً من القائمة اليسرى أولاً
                  </div>
                )}

                {showItemForm && categories.length > 0 && (
                  <div className="mx-4 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 animate-slide-down">
                    <h4 className="font-black text-slate-800 mb-3">
                      {editItemId
                        ? (restaurant?.store_type === 'clothing' ? 'تعديل بيانات الموديل' : 'تعديل المنتَج')
                        : (restaurant?.store_type === 'clothing' ? 'إضافة موديل ألبسة جديد' : 'إضافة منتَج جديد')}
                    </h4>
                    <form onSubmit={handleSaveItem} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">القسم الفرعي *</label>
                          <select required value={itemForm.category_id} onChange={e => setItemForm({ ...itemForm, category_id: e.target.value })} className="f-input">
                            <option value="">-- غير محدد (اختر القسم الفرعي) --</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">
                            {restaurant?.store_type === 'clothing' ? 'اسم القطعة / الموديل *' : 'اسم المنتج *'}
                          </label>
                          <input
                            type="text"
                            required
                            value={itemForm.name}
                            onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                            placeholder={restaurant?.store_type === 'clothing' ? 'مثال: فستان سهرة مخمل' : 'اسم المنتج...'}
                            className="f-input"
                          />
                        </div>
                        <div>
                          <label className="f-label">
                            {(itemForm.unit === 'kg' || itemForm.allow_custom_amount)
                              ? 'سعر الكيلو (TL) *'
                              : (restaurant?.store_type === 'supermarket' ? 'سعر العرض (TL) *' : 'السعر (TL) *')
                            }
                          </label>
                          <input type="number" step="0.5" required value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} className="f-input text-orange-600 font-black" />
                        </div>
                        {restaurant?.store_type === 'clothing' && (
                          <div>
                            <label className="f-label">القياسات المتاحة (افصل بينها بفاصلة)</label>
                            <input
                              type="text"
                              placeholder="مثال: S, M, L, XL"
                              value={itemForm.sizesText || ''}
                              onChange={e => setItemForm({ ...itemForm, sizesText: e.target.value })}
                              className="f-input"
                            />
                          </div>
                        )}

                        {/* Kilo / Custom Weight Selling Option */}
                        <div className="md:col-span-2 bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">⚖️</span>
                            <div>
                              <h4 className="font-black text-xs text-amber-900">هذا المنتج يُباع بالكيلو / بالوزن</h4>
                              <p className="text-[10px] text-amber-700 font-medium">يتيح للزبون الطلب بمبلغ محدد (مثال: بـ 100 ليرة) أو بوزن معين (مثال: ربع كيلو / نصف كيلو)</p>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs font-bold text-xs text-amber-900 shrink-0">
                            <input
                              type="checkbox"
                              checked={itemForm.unit === 'kg' || itemForm.allow_custom_amount}
                              onChange={e => setItemForm({
                                ...itemForm,
                                unit: e.target.checked ? 'kg' : 'piece',
                                allow_custom_amount: e.target.checked
                              })}
                              className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                            />
                            <span>بيع بالكيلو (وزن)</span>
                          </label>
                        </div>
                        <div className="md:col-span-2">
                          <label className="f-label">الوصف والتفاصيل (اختياري)</label>
                          <textarea rows={2} value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="المكونات والمواصفات..." className="f-input" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="f-label mb-1.5 block">
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

                      <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                          <input type="checkbox" checked={itemForm.is_available} onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })} className="w-4 h-4 accent-green-500" />
                          متوفر للطلب؟
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowItemForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
                          <button type="submit" disabled={savingItem} className="btn btn-dark btn-sm">
                            {savingItem ? 'حفظ...' : '💾 حفظ المنتج'}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                <div className="c-card-body pt-0">
                  {categories.length > 0 && menuItems.length === 0 && !showItemForm ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-4xl mb-2">📦</p>
                      <p className="text-slate-400 text-sm font-medium">لا توجد منتجات مضافة بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {categories.map(cat => {
                        const items = menuItems.filter(i => i.category_id === cat.id)
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center gap-2 mb-2.5">
                              <h4 className="font-black text-sm text-slate-800">{cat.name}</h4>
                              <span className="badge badge-gray">{items.length} منتَج</span>
                            </div>
                            {items.length === 0 ? (
                              <div className="border border-dashed border-slate-200 rounded-xl p-4 text-center text-slate-400 text-xs">
                                لا توجد منتجات في هذا القسم بعد
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

      <StoreSettingsModal
        restaurant={restaurant}
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaveSuccess={fetchData}
      />

      {/* Device-Specific Install Guide Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-700 shadow-2xl max-w-sm w-full space-y-4 relative">
            <button
              onClick={() => setShowInstallModal(false)}
              className="absolute top-3 left-3 p-1 text-slate-400 hover:text-white rounded-full bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xl font-black shadow-md">
              📲
            </div>

            {isIosDevice ? (
              <>
                <h3 className="font-black text-base text-white">تثبيت لوحة التحكم على آيفون</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  لتثبيت لوحة تحكم المطعم كتطبيق على شاشة هاتفك الرئيسية:
                </p>
                <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 text-xs font-bold space-y-2 text-slate-200">
                  <p>1. اضغط على زر المشاركة <Share size={13} className="inline text-orange-400 mx-1" /> بالأسفل.</p>
                  <p>2. اختر <span className="text-white underline font-black">"إضافة إلى الشاشة الرئيسية ➕"</span>.</p>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-black text-base text-white">ثبّت لوحة التحكم كتطبيق 📲</h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  لتثبيت لوحة تحكم المطعم بنقرة واحدة على شاشة هاتفك:
                </p>
                <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 text-xs font-bold space-y-2 text-slate-200">
                  <p>1. اضغط على خيارات المتصفح <span className="text-orange-400 font-black">⋮</span> بأعلى شاشة Chrome.</p>
                  <p>2. اختر <span className="text-white underline font-black">"تثبيت التطبيق 📲"</span> أو <span className="text-white underline font-black">"إضافة إلى الشاشة الرئيسية ➕"</span>.</p>
                </div>
              </>
            )}

            <button
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl cursor-pointer transition active:scale-95"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </div>
  )
}