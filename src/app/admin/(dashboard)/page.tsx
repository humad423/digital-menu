'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { triggerRevalidate } from '@/utils/revalidate'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import { CheckRow, FormSheet } from '@/components/panel/shared'
import PhoneInput from '@/components/PhoneInput'
import { SITE_URL, STORE_TIMEZONE, STORE_TIMEZONES } from '@/config/site'
import SmartOfferImage from '@/components/SmartOfferImage'
import type { BusinessType } from '@/components/AdminBusinessTypesTab'
import TabErrorBoundary from '@/components/TabErrorBoundary'
import { getStoreStatus, zoneOffsetLabel } from '@/utils/storeStatus'
import dynamicImport from 'next/dynamic'

// Each tab's heavy code loads only when that tab is opened
const AdminBusinessTypesTab = dynamicImport(() => import('@/components/AdminBusinessTypesTab'))
const AdminLegalPagesTab = dynamicImport(() => import('@/components/AdminLegalPagesTab'))
const AdminQrAnalyticsTab = dynamicImport(() => import('@/components/AdminQrAnalyticsTab'))
import { Plus, Edit, Trash2, LayoutGrid, Image as ImageIcon, Store, ClipboardList, CheckCircle, X, ExternalLink, MapPin, Phone, Flame, Utensils, Map as MapIcon, Tag, ShieldCheck, QrCode, Search, List, Grid as GridIcon, MoreHorizontal } from 'lucide-react'
import { notifyError, reportWriteResult } from '@/utils/notify'
import { normalizePhoneNumber, formatPhoneDisplay } from '@/utils/phone'

const AdminInteractiveMap = dynamicImport(() => import('@/components/AdminInteractiveMap'), { ssr: false })

const TABS = [
  { key: 'restaurants', label: 'المتاجر', Icon: Store },
  { key: 'qr_analytics', label: 'إحصائيات الـ QR', Icon: QrCode },
  { key: 'offers', label: 'العروض والتخفيضات', Icon: Flame },
  { key: 'business_types', label: 'أنواع الأنشطة', Icon: Tag },
  { key: 'legal', label: 'الخصوصية والشروط', Icon: ShieldCheck },
  { key: 'map', label: 'الخريطة التفاعلية', Icon: MapIcon },
  { key: 'categories', label: 'التصنيفات الفرعية', Icon: LayoutGrid },
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
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [loading, setLoading] = useState(true)
  const [tabLoading, setTabLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('restaurants')
  const [loadedTabs, setLoadedTabs] = useState<Set<TabKey>>(new Set())

  const [resSearchQuery, setResSearchQuery] = useState('')
  const [resFilterStatus, setResFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [resFilterType, setResFilterType] = useState<string>('all')
  const [resViewMode, setResViewMode] = useState<'grid' | 'table'>('grid')

  const [allOffers, setAllOffers] = useState<any[]>([])
  const [offerSearchQuery, setOfferSearchQuery] = useState('')

  const supabase = createClient()

  const [ownerPhoneMap, setOwnerPhoneMap] = useState<Record<string, string>>({})

  // ── Per-tab fetchers (lazy loading) ────────────────────────────
  const fetchRestaurantsTab = async () => {
    setLoading(true)
    const [resRes, catRes, relRes, profRes, bTypesRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select(
          'id, name, slug, primary_color, whatsapp_number, phone, logo_url, cover_url, store_type, ' +
          'has_delivery, is_on_holiday, holiday_message, opening_time, closing_time, timezone, days_off, delivery_from, delivery_until, special_days, delivery_paused_until, closed_until, ' +
          'latitude, longitude, delivery_radius_km, delivery_tiers, max_offers_limit, ' +
          'enable_whatsapp_orders, menu_note, is_subscription_active, is_menu_active, show_on_home, show_stores_button, subscription_notes, created_at'
        )
        .order('created_at', { ascending: false }),
      supabase.from('platform_categories').select('id, name, icon, created_at').order('created_at', { ascending: true }),
      supabase.from('restaurant_platform_categories').select('restaurant_id, platform_category_id'),
      supabase.from('profiles').select('restaurant_id, phone').eq('role', 'restaurant_owner'),
      supabase.from('business_types').select('id, name, slug, icon, sort_order, is_active').order('sort_order', { ascending: true })
    ])
    if (resRes.data) setRestaurants(resRes.data)
    if (catRes.data) setPlatformCategories(catRes.data)
    if (bTypesRes.data && bTypesRes.data.length > 0) setBusinessTypes(bTypesRes.data)
    if (relRes.data) {
      const map: Record<string, string[]> = {}
      relRes.data.forEach(r => {
        if (!map[r.restaurant_id]) map[r.restaurant_id] = []
        map[r.restaurant_id].push(r.platform_category_id)
      })
      setRestaurantCategoryMap(map)
    }
    if (profRes.data) {
      const pMap: Record<string, string> = {}
      profRes.data.forEach(p => {
        if (p.restaurant_id && p.phone) pMap[p.restaurant_id] = p.phone
      })
      setOwnerPhoneMap(pMap)
    }
    setLoading(false)
  }

  const fetchOffersTab = async () => {
    setTabLoading(true)
    const offersRes = await supabase
      .from('offers')
      .select('id, title, is_active, sort_order, created_at, restaurant_id, primary_item_id, bonus_item_id, item3_id, item4_id, offer_price, original_price, min_quantity, bonus_quantity, image_url, restaurants(id, name, slug), primary_item:menu_items!primary_item_id(name, image_url), bonus_item:menu_items!bonus_item_id(name, image_url), item3:menu_items!item3_id(name, image_url), item4:menu_items!item4_id(name, image_url)')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (offersRes.data) {
      const sorted = [...offersRes.data].sort((a, b) => {
        const orderA = (a.sort_order && a.sort_order > 0) ? a.sort_order : 999999
        const orderB = (b.sort_order && b.sort_order > 0) ? b.sort_order : 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      })
      setAllOffers(sorted.map((off, idx) => ({ ...off, sort_order: idx + 1 })))
    }
    setTabLoading(false)
  }

  const fetchAdsTab = async () => {
    setTabLoading(true)
    const adsRes = await supabase
      .from('platform_ads')
      .select('id, image_url, link_url, sort_order, is_active, target_region, latitude, longitude, radius_km, created_at')
      .order('sort_order', { ascending: true })
    if (adsRes.data) setPlatformAds(adsRes.data)
    setTabLoading(false)
  }

  const fetchCategoriesTab = async () => {
    setTabLoading(true)
    const [catRes, relRes] = await Promise.all([
      supabase.from('platform_categories').select('id, name, icon, created_at').order('created_at', { ascending: true }),
      supabase.from('restaurant_platform_categories').select('restaurant_id, platform_category_id')
    ])
    if (catRes.data) setPlatformCategories(catRes.data)
    if (relRes.data) {
      const map: Record<string, string[]> = {}
      relRes.data.forEach(r => {
        if (!map[r.restaurant_id]) map[r.restaurant_id] = []
        map[r.restaurant_id].push(r.platform_category_id)
      })
      setRestaurantCategoryMap(map)
    }
    setTabLoading(false)
  }

  const fetchOrdersTab = async () => {
    setTabLoading(true)
    const ordRes = await supabase
      .from('orders')
      .select('id, restaurant_id, total_price, status, created_at, items, location_url, restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(500)
    if (ordRes.data) setOrders(ordRes.data)
    setTabLoading(false)
  }

  const fetchMapTab = async () => {
    setTabLoading(true)
    // also ensure ads loaded
    const adsRes = await supabase
      .from('platform_ads')
      .select('id, image_url, link_url, sort_order, is_active, target_region, latitude, longitude, radius_km, created_at')
      .order('sort_order', { ascending: true })
    if (adsRes.data) setPlatformAds(adsRes.data)
    setTabLoading(false)
  }

  // switchTab: changes tab and lazy-fetches data if not yet loaded
  const switchTab = (tab: TabKey) => {
    setActiveTab(tab)
    if (loadedTabs.has(tab)) return
    setLoadedTabs(prev => new Set(prev).add(tab))
    if (tab === 'offers') fetchOffersTab()
    else if (tab === 'ads') fetchAdsTab()
    else if (tab === 'categories') fetchCategoriesTab()
    else if (tab === 'orders') fetchOrdersTab()
    else if (tab === 'map') fetchMapTab()
    // restaurants, qr_analytics, business_types, legal: use data already loaded
  }

  // Legacy fetchData for CRUD refresh (restaurants tab only)
  const fetchData = async () => {
    await fetchRestaurantsTab()
  }


  const movePlatformOfferToRank = async (targetOfferId: string, targetRank: number) => {
    const list = [...allOffers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const currentIndex = list.findIndex(o => o.id === targetOfferId)
    if (currentIndex === -1) return

    const [movedOffer] = list.splice(currentIndex, 1)
    const clampedRank = Math.max(1, Math.min(targetRank, list.length + 1))
    list.splice(clampedRank - 1, 0, movedOffer)

    const updatedList = list.map((off, idx) => ({ ...off, sort_order: idx + 1 }))
    setAllOffers(updatedList)

    const results = await Promise.all(
      updatedList.map(off =>
        supabase.from('offers').update({ sort_order: off.sort_order }).eq('id', off.id)
      )
    )
    results.forEach(result => reportWriteResult(result))
    // Offers reordered: refresh offers page and home
    triggerRevalidate(null, 'offers')
  }

  const togglePlatformOfferActive = async (offer: any) => {
    const newStatus = !offer.is_active
    setAllOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: newStatus } : o))
    reportWriteResult(await supabase.from('offers').update({ is_active: newStatus }).eq('id', offer.id))
    triggerRevalidate(offer.restaurants?.slug, 'offers')
    triggerRevalidate(null, 'home')
  }

  const deletePlatformOffer = async (offerId: string, title: string) => {
    if (confirm(`هل أنت متأكد من حذف العرض "${title}" من المنصة بالكامل؟`)) {
      const target = allOffers.find(o => o.id === offerId)
      setAllOffers(prev => prev.filter(o => o.id !== offerId))
      reportWriteResult(await supabase.from('offers').delete().eq('id', offerId))
      triggerRevalidate(target?.restaurants?.slug, 'offers')
      triggerRevalidate(null, 'home')
    }
  }

  const toggleRestaurantSubscription = async (r: any) => {
    const newVal = r.is_subscription_active === false ? true : false
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, is_subscription_active: newVal } : item))
    reportWriteResult(await supabase.from('restaurants').update({ is_subscription_active: newVal }).eq('id', r.id))
    triggerRevalidate(r.slug, 'all')
  }

  const toggleRestaurantHome = async (r: any) => {
    const newVal = r.show_on_home === false
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, show_on_home: newVal } : item))
    reportWriteResult(await supabase.from('restaurants').update({ show_on_home: newVal }).eq('id', r.id))
    triggerRevalidate(r.slug, 'all')
  }

  const toggleRestaurantStoresButton = async (r: any) => {
    const newVal = r.show_stores_button !== true
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, show_stores_button: newVal } : item))
    reportWriteResult(await supabase.from('restaurants').update({ show_stores_button: newVal }).eq('id', r.id))
    triggerRevalidate(r.slug, 'all')
  }

  const toggleRestaurantMenu = async (r: any) => {
    const newVal = r.is_menu_active === false ? true : false
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, is_menu_active: newVal } : item))
    reportWriteResult(await supabase.from('restaurants').update({ is_menu_active: newVal }).eq('id', r.id))
    triggerRevalidate(r.slug, 'all')
  }

  useEffect(() => { fetchRestaurantsTab().then(() => setLoadedTabs(new Set(['restaurants' as TabKey]))) }, [])

  // ── Restaurants ─────────────────────────────────────────────────
  const [showResForm, setShowResForm] = useState(false)
  const [editResId, setEditResId] = useState<string | null>(null)
  const emptyRes = {
    name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '',
    logo_url: '', cover_url: '', latitude: '', longitude: '', delivery_radius_km: '5',
    max_offers_limit: '5', store_type: 'restaurant', has_delivery: true, menu_note: '',
    opening_time: '09:00', closing_time: '23:00', timezone: STORE_TIMEZONE, days_off: [] as string[], is_on_holiday: false, holiday_message: '', enable_whatsapp_orders: true,
    is_subscription_active: true, is_menu_active: true, show_on_home: true, show_stores_button: false, subscription_notes: ''
  }
  const [resForm, setResForm] = useState(emptyRes)
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([])
  const [savingRes, setSavingRes] = useState(false)

  const toggleCat = (catId: string) =>
    setSelectedCatIds(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId])

  const handleResSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRes(true)
    // A number manages one store, so saving it here would take it away from any other store
    const newOwnerPhone = normalizePhoneNumber(resForm.owner_phone)
    if (newOwnerPhone) {
      const { data: currentOwner, error: ownerError } = await supabase
        .from('profiles')
        .select('restaurant_id, restaurants(name)')
        .eq('phone', newOwnerPhone)
        .maybeSingle()
      if (ownerError) { notifyError('تعذر التحقق من رقم صاحب المتجر'); setSavingRes(false); return }

      if (currentOwner?.restaurant_id && currentOwner.restaurant_id !== editResId) {
        const otherStore = (currentOwner.restaurants as unknown as { name: string } | null)?.name || 'متجر آخر'
        const moveOwner = confirm(
          `هذا الرقم مربوط حالياً بـ "${otherStore}".\n\nإذا تابعت، سينتقل الرقم إلى هذا المتجر، ولن يستطيع صاحبه دخول لوحة "${otherStore}".\n\nهل تريد المتابعة؟`
        )
        if (!moveOwner) { setSavingRes(false); return }
      }
    }

    const cleanWhatsapp = normalizePhoneNumber(resForm.whatsapp_number)
    const payload = {
      name: resForm.name, slug: resForm.slug, primary_color: resForm.primary_color,
      whatsapp_number: cleanWhatsapp || resForm.whatsapp_number.trim() || null,
      logo_url: resForm.logo_url || null,
      cover_url: resForm.cover_url || null,
      latitude: resForm.latitude ? parseFloat(resForm.latitude) : null,
      longitude: resForm.longitude ? parseFloat(resForm.longitude) : null,
      delivery_radius_km: resForm.delivery_radius_km ? parseFloat(resForm.delivery_radius_km) : 5,
      max_offers_limit: resForm.max_offers_limit ? parseInt(resForm.max_offers_limit) : 5,
      store_type: resForm.store_type || 'restaurant',
      has_delivery: resForm.has_delivery,
      menu_note: resForm.menu_note ? resForm.menu_note.slice(0, 100).trim() : null,
      opening_time: resForm.opening_time || '09:00',
      closing_time: resForm.closing_time || '23:00',
      timezone: resForm.timezone || STORE_TIMEZONE,
      days_off: resForm.days_off || [],
      is_on_holiday: resForm.is_on_holiday || false,
      holiday_message: resForm.holiday_message.trim() || null,
      enable_whatsapp_orders: resForm.enable_whatsapp_orders !== false,
      is_subscription_active: resForm.is_subscription_active !== false,
      is_menu_active: resForm.is_menu_active !== false,
      show_on_home: resForm.show_on_home !== false,
      show_stores_button: resForm.show_stores_button === true,
      subscription_notes: resForm.subscription_notes?.trim() || null,
    }
    let restaurantId = editResId
    if (editResId) {
      const { error } = await supabase.from('restaurants').update(payload).eq('id', editResId)
      if (error) { notifyError('خطأ في التحديث'); setSavingRes(false); return }
    } else {
      const { data, error } = await supabase.from('restaurants').insert([payload]).select().maybeSingle()
      if (error || !data) { notifyError('حدث خطأ. تأكد أن الرابط (Slug) غير مكرر.'); setSavingRes(false); return }
      restaurantId = data.id
    }
    if (restaurantId) {
      reportWriteResult(await supabase.from('restaurant_platform_categories').delete().eq('restaurant_id', restaurantId))
      if (selectedCatIds.length > 0) {
        await supabase.from('restaurant_platform_categories').insert(
          selectedCatIds.map(cid => ({ restaurant_id: restaurantId, platform_category_id: cid }))
        )
      }
      if (resForm.owner_phone.trim()) {
        const formattedPhone = normalizePhoneNumber(resForm.owner_phone)
        if (formattedPhone) {
          // A store has one owner, so anyone else linked to it loses access
          reportWriteResult(await supabase
            .from('profiles')
            .delete()
            .eq('restaurant_id', restaurantId)
            .neq('phone', formattedPhone))

          const { data: existingProfile } = await supabase.from('profiles').select('id').eq('phone', formattedPhone).maybeSingle()
          if (existingProfile) {
            reportWriteResult(await supabase.from('profiles').update({ role: 'restaurant_owner', restaurant_id: restaurantId }).eq('id', existingProfile.id))
          } else {
            reportWriteResult(await supabase.from('profiles').insert([{ id: 'owner-uid-' + formattedPhone.replace(/[^0-9]/g, ''), phone: formattedPhone, full_name: 'صاحب متجر ' + resForm.name, role: 'restaurant_owner', restaurant_id: restaurantId }]))
          }
        }
      }
    }
    setSavingRes(false); setShowResForm(false); setEditResId(null); setResForm(emptyRes); setSelectedCatIds([])
    fetchData()
    // Invalidate public pages: restaurant edit affects menu + home listing
    triggerRevalidate(resForm.slug, 'menu')
    triggerRevalidate(null, 'home')
  }

  const handleEditRes = (r: any) => {
    setEditResId(r.id)
    const currentOwnerPhone = ownerPhoneMap[r.id] || r.owner_phone || ''
    setResForm({
      name: r.name, slug: r.slug, primary_color: r.primary_color || '#ea580c',
      whatsapp_number: formatPhoneDisplay(r.whatsapp_number) || '',
      owner_phone: formatPhoneDisplay(currentOwnerPhone) || '',
      logo_url: r.logo_url || '', cover_url: r.cover_url || '',
      latitude: r.latitude?.toString() || '', longitude: r.longitude?.toString() || '',
      delivery_radius_km: r.delivery_radius_km?.toString() || '5',
      max_offers_limit: r.max_offers_limit?.toString() || '5',
      store_type: r.store_type || 'restaurant',
      has_delivery: r.has_delivery !== false,
      menu_note: r.menu_note || '',
      opening_time: r.opening_time || '09:00',
      closing_time: r.closing_time || '23:00',
      timezone: r.timezone || STORE_TIMEZONE,
      days_off: Array.isArray(r.days_off) ? r.days_off : [],
      is_on_holiday: !!r.is_on_holiday,
      holiday_message: r.holiday_message || '',
      enable_whatsapp_orders: r.enable_whatsapp_orders !== false,
      is_subscription_active: r.is_subscription_active !== false,
      is_menu_active: r.is_menu_active !== false,
      show_on_home: r.show_on_home !== false,
      show_stores_button: r.show_stores_button === true,
      subscription_notes: r.subscription_notes || '',
    })
    setSelectedCatIds(restaurantCategoryMap[r.id] || [])
    setShowResForm(true)
  }

  const handleDeleteRes = async (id: string, name: string) => {
    // Deleting removes the store's menu, offers and order history for good
    if (window.prompt(`سيتم حذف "${name}" مع كل منتجاته وطلباته نهائياً. للتأكيد اكتب اسم المتجر:`)?.trim() === name.trim()) {
      reportWriteResult(await supabase.from('restaurants').delete().eq('id', id))
      fetchData()
      // Restaurant deleted: revalidate home page
      triggerRevalidate(null, 'home')
    }
  }

  // ── Platform Categories ─────────────────────────────────────────
  const [showCatForm, setShowCatForm] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', icon: '' })

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editCatId) reportWriteResult(await supabase.from('platform_categories').update(catForm).eq('id', editCatId))
    else reportWriteResult(await supabase.from('platform_categories').insert([catForm]))
    setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '' })
    fetchCategoriesTab()
    triggerRevalidate(null, 'home')
  }

  const deleteCat = async (id: string) => {
    if (confirm('حذف التصنيف؟')) {
      reportWriteResult(await supabase.from('platform_categories').delete().eq('id', id))
      fetchCategoriesTab()
      triggerRevalidate(null, 'home')
    }
  }

  // ── Platform Ads ────────────────────────────────────────────────
  const [showAdForm, setShowAdForm] = useState(false)
  const [editAdId, setEditAdId] = useState<string | null>(null)
  const emptyAdForm = {
    image_url: '',
    link_url: '',
    sort_order: 0,
    target_region: 'جميع المناطق',
    latitude: null as number | null,
    longitude: null as number | null,
    radius_km: null as number | null
  }
  const [adForm, setAdForm] = useState(emptyAdForm)

  const handleAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adForm.image_url) return notifyError('الصورة مطلوبة')

    const payload = {
      image_url: adForm.image_url,
      link_url: adForm.link_url || null,
      sort_order: adForm.sort_order || 0,
      target_region: adForm.target_region || 'جميع المناطق',
      latitude: adForm.latitude,
      longitude: adForm.longitude,
      radius_km: adForm.radius_km
    }

    if (editAdId) {
      const { error } = await supabase.from('platform_ads').update(payload).eq('id', editAdId)
      if (error) {
        console.error('Error updating ad:', error)
        notifyError('حدث خطأ أثناء تعديل الإعلان: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('platform_ads').insert([payload])
      if (error) {
        console.error('Error inserting ad:', error)
        notifyError('حدث خطأ أثناء حفظ الإعلان: ' + error.message)
        return
      }
    }
    setShowAdForm(false)
    setEditAdId(null)
    setAdForm(emptyAdForm)
    fetchAdsTab()
    triggerRevalidate(null, 'home')
  }

  const handleEditAd = (ad: any) => {
    setEditAdId(ad.id)
    setAdForm({
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      sort_order: ad.sort_order || 0,
      target_region: ad.target_region || 'جميع المناطق',
      latitude: ad.latitude ?? null,
      longitude: ad.longitude ?? null,
      radius_km: ad.radius_km ?? null
    })
    setShowAdForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteAd = async (id: string) => {
    if (confirm('حذف هذا الإعلان؟')) {
      reportWriteResult(await supabase.from('platform_ads').delete().eq('id', id))
      fetchAdsTab()
      triggerRevalidate(null, 'home')
    }
  }

  const handleImpersonateOwner = (r: any) => {
    // Same host as the admin panel, because the login session cookie is per-host
    window.open(`/restaurant-panel/${r.id}`, '_blank')
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
            onClick={() => switchTab(key)}
            className={`dash-tab ${activeTab === key ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
            {key === 'orders' && pendingOrders > 0 && (
              <span className="bg-red-500 text-white text-sm font-black w-5 h-5 rounded-full flex items-center justify-center">
                {pendingOrders}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="dash-content">

        {/* ── Stats Row ── */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                  <p className="text-sm font-bold text-muted">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(loading || tabLoading) && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-muted">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            QR ANALYTICS TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'qr_analytics' && (
          <TabErrorBoundary tabName="إحصائيات الـ QR">
            <AdminQrAnalyticsTab restaurants={restaurants} />
          </TabErrorBoundary>
        )}

        {/* ══════════════════════════════════════
            BUSINESS TYPES TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'business_types' && (
          <AdminBusinessTypesTab businessTypes={businessTypes} onRefresh={fetchRestaurantsTab} />
        )}

        {/* ══════════════════════════════════════
            RESTAURANTS TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'restaurants' && (
          <div className="space-y-4">
            {/* Header & Controls Toolbar */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <Store className="text-brand" size={20} />
                    <span>المتاجر المسجلة</span>
                    <span className="text-sm font-black bg-orange-50 text-brand px-2.5 py-0.5 rounded-full border border-orange-100">
                      {restaurants.length} متجر
                    </span>
                  </h2>
                  <p className="text-sm text-muted font-medium mt-0.5">
                    إدارة بيانات المتاجر، الاشتراكات، ساعات العمل، وحسابات الدخول
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setResViewMode('grid')}
                      className={`p-2 rounded-xl text-sm font-bold flex items-center gap-1  cursor-pointer ${
                        resViewMode === 'grid'
                          ? 'bg-white text-slate-900  font-black'
                          : 'text-muted hover:text-slate-800'
                      }`}
                      title="عرض بطاقات مضغوطة"
                    >
                      <GridIcon size={15} />
                      <span className="hidden sm:inline">بطاقات</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResViewMode('table')}
                      className={`p-2 rounded-xl text-sm font-bold flex items-center gap-1  cursor-pointer ${
                        resViewMode === 'table'
                          ? 'bg-white text-slate-900  font-black'
                          : 'text-muted hover:text-slate-800'
                      }`}
                      title="عرض جدول سريع"
                    >
                      <List size={15} />
                      <span className="hidden sm:inline">جدول سريع</span>
                    </button>
                  </div>

                  <button
                    onClick={() => { setShowResForm(!showResForm); setEditResId(null); setSelectedCatIds([]); setResForm(emptyRes) }}
                    className="btn btn-primary text-sm font-black py-2.5 px-4 rounded-2xl flex items-center gap-1.5"
                  >
                    <Plus size={16} />
                    <span>متجر جديد</span>
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="ابحث باسم المتجر، الرابط (Slug)، أو رقم الهاتف..."
                    value={resSearchQuery}
                    onChange={e => setResSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-9 pl-3 py-2 text-sm font-bold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-orange-500"
                  />
                  {resSearchQuery && (
                    <button
                      onClick={() => setResSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200 text-sm font-bold">
                  <button
                    type="button"
                    onClick={() => setResFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-xl  cursor-pointer ${
                      resFilterStatus === 'all' ? 'bg-white text-slate-900 font-black ' : 'text-muted hover:text-slate-800'
                    }`}
                  >
                    الكل ({restaurants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResFilterStatus('active')}
                    className={`px-3 py-1.5 rounded-xl  cursor-pointer flex items-center gap-1 ${
                      resFilterStatus === 'active' ? 'bg-emerald-500 text-white font-black ' : 'text-muted hover:text-emerald-600'
                    }`}
                  >
                    <span>نشط</span>
                    <span className="text-sm opacity-80">({restaurants.filter(r => r.is_subscription_active !== false).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResFilterStatus('inactive')}
                    className={`px-3 py-1.5 rounded-xl  cursor-pointer flex items-center gap-1 ${
                      resFilterStatus === 'inactive' ? 'bg-rose-500 text-white font-black ' : 'text-muted hover:text-rose-600'
                    }`}
                  >
                    <span>معلق</span>
                    <span className="text-sm opacity-80">({restaurants.filter(r => r.is_subscription_active === false).length})</span>
                  </button>
                </div>

                {/* Store Type Filter */}
                {businessTypes.length > 0 && (
                  <select
                    value={resFilterType}
                    onChange={e => setResFilterType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-orange-500 cursor-pointer"
                  >
                    <option value="all">جميع أنواع الأنشطة (الكل)</option>
                    {businessTypes.map(bt => (
                      <option key={bt.id} value={bt.slug}>
                        {bt.icon} {bt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Restaurant Form */}
            {showResForm && (
              <FormSheet
                title={editResId ? `تعديل ${resForm.name || 'المتجر'}` : 'إضافة متجر جديد'}
                wide
                onClose={() => { setShowResForm(false); setEditResId(null) }}
                footer={
                  <div className="grid grid-cols-[2fr_1fr] gap-2">
                    <button type="submit" form="store-form" disabled={savingRes} className="btn btn-primary">
                      {savingRes ? 'جاري الحفظ...' : editResId ? 'حفظ التعديلات' : 'إضافة المتجر'}
                    </button>
                    <button type="button" onClick={() => { setShowResForm(false); setEditResId(null) }} className="btn btn-secondary">إلغاء</button>
                  </div>
                }
              >
                  <form id="store-form" onSubmit={handleResSubmit} className="space-y-6">
                    {/* What gets used most comes first; rarely changed settings stay folded away */}
                    <section className="space-y-3">
                      <h3 className="section-title">بيانات المتجر</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="f-label">اسم المتجر *</label>
                          <input type="text" required value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="f-input" placeholder="مثال: سوبر ماركت الخير" />
                        </div>
                        <div>
                          <label className="f-label">نوع النشاط *</label>
                          <select
                            value={resForm.store_type || (businessTypes[0]?.slug || 'restaurant')}
                            onChange={e => setResForm({ ...resForm, store_type: e.target.value })}
                            className="f-input font-bold"
                          >
                            {businessTypes.map(bt => (
                              <option key={bt.id} value={bt.slug}>{bt.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="f-label">رقم صاحب المتجر (للدخول والبوت)</label>
                          <PhoneInput value={resForm.owner_phone} onChange={owner_phone => setResForm({ ...resForm, owner_phone })} />
                        </div>
                        <div>
                          <label className="f-label">رقم واتساب الطلبات *</label>
                          <PhoneInput required value={resForm.whatsapp_number} onChange={whatsapp_number => setResForm({ ...resForm, whatsapp_number })} />
                        </div>
                      </div>
                    </section>

                    <section className="space-y-3 border-t border-line pt-5">
                      <h3 className="section-title">الظهور للزبائن</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                        <CheckRow label="ظاهر في الرئيسية" checked={resForm.show_on_home !== false} onChange={checked => setResForm({ ...resForm, show_on_home: checked })} />
                        <CheckRow label="زر كل المتاجر في المنيو" checked={resForm.show_stores_button === true} onChange={checked => setResForm({ ...resForm, show_stores_button: checked })} />
                        <CheckRow label="المنيو منشور" checked={resForm.is_menu_active !== false} onChange={checked => setResForm({ ...resForm, is_menu_active: checked })} />
                        <CheckRow label="الاشتراك نشط" checked={resForm.is_subscription_active !== false} onChange={checked => setResForm({ ...resForm, is_subscription_active: checked })} />
                      </div>
                    </section>

                    <section className="space-y-3 border-t border-line pt-5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h3 className="section-title">الموقع والتوصيل</h3>
                        <button type="button" onClick={() => {
                          if (!navigator.geolocation) return notifyError('المتصفح لا يدعم تحديد الموقع')
                          navigator.geolocation.getCurrentPosition(
                            (pos) => setResForm({ ...resForm, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }),
                            () => notifyError('تعذر تحديد الموقع')
                          )
                        }} className="btn btn-secondary btn-sm">
                          <MapPin size={14} /> موقعي الحالي
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="f-label">الإحداثيات</label>
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
                            className="f-input text-left" />
                          {resForm.latitude && resForm.longitude ? (
                            <a href={`https://www.google.com/maps?q=${resForm.latitude},${resForm.longitude}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-brand underline inline-flex items-center gap-1 mt-1">
                              <ExternalLink size={12} /> معاينة على الخريطة
                            </a>
                          ) : (
                            <p className="text-sm font-bold text-rose-700 mt-1">بدون موقع، لن يظهر المتجر للزبائن.</p>
                          )}
                        </div>
                        <div>
                          <label className="f-label">نطاق التوصيل (كم)</label>
                          <input type="number" min="1" max="100" step="0.5" value={resForm.delivery_radius_km}
                            onChange={e => setResForm({ ...resForm, delivery_radius_km: e.target.value })}
                            className="f-input" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <CheckRow label="يقدم خدمة التوصيل" checked={resForm.has_delivery} onChange={checked => setResForm({ ...resForm, has_delivery: checked })} />
                        <CheckRow label="يستقبل الطلبات على واتساب" checked={resForm.enable_whatsapp_orders !== false} onChange={checked => setResForm({ ...resForm, enable_whatsapp_orders: checked })} />
                      </div>
                    </section>

                    <section className="space-y-3 border-t border-line pt-5">
                      <h3 className="section-title">الدوام</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="f-label">يفتح الساعة</label>
                          <input type="time" value={resForm.opening_time} onChange={e => setResForm({ ...resForm, opening_time: e.target.value })} className="f-input text-center" />
                        </div>
                        <div>
                          <label className="f-label">يغلق الساعة</label>
                          <input type="time" value={resForm.closing_time} onChange={e => setResForm({ ...resForm, closing_time: e.target.value })} className="f-input text-center" />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="store-timezone" className="f-label">توقيت المتجر</label>
                        <select id="store-timezone" value={resForm.timezone} onChange={e => setResForm({ ...resForm, timezone: e.target.value })} className="f-input">
                          {[...STORE_TIMEZONES, ...(STORE_TIMEZONES.some(zone => zone.value === resForm.timezone) ? [] : [{ value: resForm.timezone, label: resForm.timezone }])].map(zone => (
                            <option key={zone.value} value={zone.value}>{zone.label} ({zoneOffsetLabel(zone.value)})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="f-label">أيام العطلة الأسبوعية</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => {
                            const current = resForm.days_off || []
                            return (
                              <button
                                key={day}
                                type="button"
                                aria-pressed={current.includes(day)}
                                onClick={() => setResForm({ ...resForm, days_off: current.includes(day) ? current.filter(d => d !== day) : [...current, day] })}
                                className="chip"
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <CheckRow label="مغلق مؤقتاً (عطلة)" checked={resForm.is_on_holiday} onChange={checked => setResForm({ ...resForm, is_on_holiday: checked })} />
                      {resForm.is_on_holiday && (
                        <div>
                          <label className="f-label">رسالة للزبائن أثناء الإغلاق</label>
                          <input type="text" value={resForm.holiday_message} onChange={e => setResForm({ ...resForm, holiday_message: e.target.value })} className="f-input" placeholder="مثال: نعود يوم السبت" />
                        </div>
                      )}
                    </section>

                    {platformCategories.length > 0 && (
                      <section className="space-y-3 border-t border-line pt-5">
                        <h3 className="section-title">التصنيفات</h3>
                        <div className="flex flex-wrap gap-2">
                          {platformCategories.map(c => (
                            <button key={c.id} type="button" aria-pressed={selectedCatIds.includes(c.id)} onClick={() => toggleCat(c.id)} className="chip">
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="space-y-3 border-t border-line pt-5">
                      <h3 className="section-title">الصور</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="f-label">الشعار (مربع، 500 × 500)</label>
                          <ImageUpload value={resForm.logo_url} onChange={(url) => setResForm({ ...resForm, logo_url: url })} />
                        </div>
                        <div>
                          <label className="f-label">الغلاف (عريض، 1200 × 675)</label>
                          <ImageUpload value={resForm.cover_url} onChange={(url) => setResForm({ ...resForm, cover_url: url })} />
                        </div>
                      </div>
                    </section>

                    {/* A new store has to choose its link, so this starts open there */}
                    <details open={!editResId} className="border-t border-line pt-5">
                      <summary className="section-title cursor-pointer">إعدادات إضافية</summary>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        <div>
                          <label className="f-label">رابط المتجر *</label>
                          <input type="text" required dir="ltr" value={resForm.slug} onChange={e => setResForm({ ...resForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="f-input text-left" placeholder="store-name" />
                        </div>
                        <div>
                          <label className="f-label">الحد الأقصى للعروض</label>
                          <input type="number" min="1" max="100" value={resForm.max_offers_limit} onChange={e => setResForm({ ...resForm, max_offers_limit: e.target.value })} className="f-input" placeholder="5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <label className="f-label">إعلان أعلى المنيو</label>
                            <span className="text-sm text-muted font-bold">{(resForm.menu_note || '').length} / 100</span>
                          </div>
                          <input type="text" maxLength={100} value={resForm.menu_note || ''} onChange={e => setResForm({ ...resForm, menu_note: e.target.value.slice(0, 100) })} className="f-input" placeholder="جملة قصيرة تظهر للزبون" />
                        </div>
                        <div>
                          <label className="f-label">ملاحظات الاشتراك</label>
                          <input type="text" value={resForm.subscription_notes || ''} onChange={e => setResForm({ ...resForm, subscription_notes: e.target.value })} className="f-input" placeholder="مثال: مدفوع حتى تاريخ..." />
                        </div>
                        <div>
                          <label className="f-label">اللون الأساسي</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={resForm.primary_color} onChange={e => setResForm({ ...resForm, primary_color: e.target.value })} className="w-12 h-12 rounded-xl border border-line cursor-pointer" />
                            <span dir="ltr" className="text-sm font-mono text-muted uppercase">{resForm.primary_color}</span>
                          </div>
                        </div>
                      </div>
                    </details>
                  </form>
              </FormSheet>
            )}

            {/* Restaurants Display (Grid or Table) */}
            {(() => {
              const filteredRestaurants = restaurants.filter(r => {
                const q = resSearchQuery.toLowerCase().trim()
                const phone = ownerPhoneMap[r.id] || r.owner_phone || ''
                const matchesQuery = !q ||
                  r.name?.toLowerCase().includes(q) ||
                  r.slug?.toLowerCase().includes(q) ||
                  r.whatsapp_number?.includes(q) ||
                  phone.includes(q)

                const matchesStatus =
                  resFilterStatus === 'all' ||
                  (resFilterStatus === 'active' && r.is_subscription_active !== false) ||
                  (resFilterStatus === 'inactive' && r.is_subscription_active === false)

                const matchesType =
                  resFilterType === 'all' || r.store_type === resFilterType

                return matchesQuery && matchesStatus && matchesType
              })

              if (filteredRestaurants.length === 0) {
                return (
                  <div className="c-card text-center py-16 bg-white rounded-3xl border border-slate-200/80">
                    <p className="text-4xl mb-2">🏪</p>
                    <p className="font-black text-slate-700 text-base">لا توجد متاجر مطابقة للبحث أو الفلتر</p>
                    <p className="text-sm text-muted mt-1">جرّب مسح كلمات البحث أو تغيير الفلتر</p>
                    {resSearchQuery && (
                      <button
                        onClick={() => { setResSearchQuery(''); setResFilterStatus('all'); setResFilterType('all') }}
                        className="mt-3 text-sm font-bold text-brand bg-orange-50 px-4 py-2 rounded-xl border border-orange-100 hover:bg-orange-100 cursor-pointer"
                      >
                        مسح الفلاتر ✕
                      </button>
                    )}
                  </div>
                )
              }

              if (resViewMode === 'table') {
                return (
                  <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="data-table w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-muted font-bold">
                            <th className="py-3 px-4 text-right">المتجر</th>
                            <th className="py-3 px-3 text-center">النشاط</th>
                            <th className="py-3 px-3 text-right">هاتف الدخول / واتساب</th>
                            <th className="py-3 px-3 text-center">اشتراك اللوحة</th>
                            <th className="py-3 px-3 text-center">منيو الزبائن</th>
                            <th className="py-3 px-3 text-center">الرئيسية</th>
                            <th className="py-3 px-3 text-center">حالة العمل</th>
                            <th className="py-3 px-4 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRestaurants.map(r => {
                            const status = getStoreStatus(r)
                            const bt = businessTypes.find(b => b.slug === r.store_type)
                            const storeTypeLabel = bt ? `${bt.icon} ${bt.name}` : (r.store_type === 'supermarket' ? '🛒 سوبرماركت' : r.store_type === 'clothing' ? '👗 ألبسة' : r.store_type === 'other' ? '🎁 متجر' : '🍔 مطعم')

                            return (
                              <tr key={r.id} className="hover:bg-slate-50/60">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shrink-0 overflow-hidden">
                                      {r.logo_url ? (
                                        <img src={r.logo_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{r.store_type === 'supermarket' ? '🛒' : r.store_type === 'clothing' ? '👗' : '🍔'}</span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="font-black text-slate-900 text-sm truncate">{r.name}</h4>
                                      <Link
                                        href={`${SITE_URL}/m/${r.slug}`}
                                        target="_blank"
                                        className="text-sm font-mono text-muted hover:text-orange-600 inline-flex items-center gap-0.5 dir-ltr"
                                      >
                                        <span>/m/{r.slug}</span>
                                        <ExternalLink size={10} />
                                      </Link>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <span className="badge badge-gray font-bold text-sm">
                                    {storeTypeLabel}
                                  </span>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="space-y-0.5 text-sm">
                                    <div className="font-mono text-slate-800 font-bold dir-ltr flex items-center gap-1 justify-end">
                                      <span>{formatPhoneDisplay(ownerPhoneMap[r.id] || r.owner_phone) || '-'}</span>
                                      <Phone size={11} className="text-brand" />
                                    </div>
                                    {r.whatsapp_number && (
                                      <div className="font-mono text-muted text-sm dir-ltr flex items-center gap-1 justify-end">
                                        <span>{formatPhoneDisplay(r.whatsapp_number)}</span>
                                        <span className="text-emerald-500 text-sm font-bold">WA</span>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRestaurantSubscription(r)}
                                    className={`px-2.5 py-1 rounded-xl text-sm font-black border  cursor-pointer  ${
                                      r.is_subscription_active !== false
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    }`}
                                  >
                                    {r.is_subscription_active !== false ? 'نشط ✅' : 'معلق ⛔'}
                                  </button>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRestaurantMenu(r)}
                                    className={`px-2.5 py-1 rounded-xl text-sm font-black border  cursor-pointer  ${
                                      r.is_menu_active !== false
                                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                    }`}
                                  >
                                    {r.is_menu_active !== false ? 'منشور 🟢' : 'معلق 🔴'}
                                  </button>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleRestaurantHome(r)}
                                    className={`px-2.5 py-1 rounded-xl text-sm font-black border  cursor-pointer  ${
                                      r.show_on_home !== false
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                    }`}
                                  >
                                    {r.show_on_home !== false ? 'ظاهر' : 'مخفي'}
                                  </button>
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full border text-sm font-black inline-flex items-center gap-1 ${status.badgeClass}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                    <span>{status.statusText}</span>
                                  </span>
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Link
                                      href={`/restaurant-panel/${r.id}`}
                                      className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black rounded-xl text-sm flex items-center gap-1"
                                      title="إدارة المنيو والعروض"
                                    >
                                      <Utensils size={13} />
                                      <span>المنيو</span>
                                    </Link>
                                    <button
                                      onClick={() => handleImpersonateOwner(r)}
                                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                                      title="دخول كصاحب متجر"
                                    >
                                      <Store size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleEditRes(r)}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-blue-600 rounded-xl"
                                      title="تعديل البيانات"
                                    >
                                      <Edit size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRes(r.id, r.name)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl"
                                      title="حذف المتجر"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRestaurants.map(r => {
                    const phone = formatPhoneDisplay(ownerPhoneMap[r.id] || r.owner_phone)
                    const switches = [
                      { label: 'الظهور بالرئيسية', on: r.show_on_home !== false, onText: 'ظاهر', offText: 'مخفي', toggle: toggleRestaurantHome },
                      { label: 'منيو الزبائن', on: r.is_menu_active !== false, onText: 'منشور', offText: 'مغلق', toggle: toggleRestaurantMenu },
                      { label: 'الاشتراك', on: r.is_subscription_active !== false, onText: 'نشط', offText: 'معلق', toggle: toggleRestaurantSubscription },
                    ]
                    // The card only mentions these when something needs noticing
                    const warnings = switches.filter(item => !item.on).map(item => item.offText === 'مخفي' ? 'مخفي من الرئيسية' : item.offText === 'مغلق' ? 'المنيو مغلق' : 'الاشتراك معلق')
                    // Off is this button's normal state, so it isn't one of the warnings above
                    switches.splice(1, 0, { label: 'زر كل المتاجر', on: r.show_stores_button === true, onText: 'ظاهر', offText: 'مخفي', toggle: toggleRestaurantStoresButton })

                    return (
                      <div key={r.id} className="bg-white rounded-2xl p-4 border border-line flex flex-col gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-line flex items-center justify-center shrink-0 overflow-hidden">
                            {r.logo_url ? (
                              <img src={r.logo_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                              <Store size={20} className="text-muted" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black truncate">{r.name}</h3>
                            <p dir="ltr" className="text-sm text-muted truncate text-right">{phone || 'لا يوجد رقم'}</p>
                          </div>
                        </div>

                        {/* Reserved height keeps every card in a row the same, with or without a warning */}
                        <p className={`min-h-5 text-sm font-bold ${warnings.length ? 'text-rose-700' : 'text-whatsapp'}`}>
                          {warnings.length ? warnings.join(' · ') : 'يعمل بشكل طبيعي'}
                        </p>

                        <div className="mt-auto flex items-center gap-2">
                          <Link href={`/restaurant-panel/${r.id}`} className="btn btn-dark flex-1 min-w-0 whitespace-nowrap">
                            <Utensils size={16} className="shrink-0" />
                            <span>لوحة المتجر</span>
                          </Link>
                          <button onClick={() => handleEditRes(r)} className="btn btn-secondary shrink-0 whitespace-nowrap">
                            <Edit size={16} className="shrink-0" />
                            <span>تعديل</span>
                          </button>
                          <details className="relative shrink-0">
                            <summary aria-label={`المزيد عن ${r.name}`} className="btn btn-secondary list-none cursor-pointer [&::-webkit-details-marker]:hidden">
                              <MoreHorizontal size={18} />
                            </summary>
                            <div className="absolute left-0 top-full mt-2 z-20 w-64 max-w-[calc(100vw-3rem)] bg-white border border-line rounded-2xl p-2 shadow-lg space-y-1">
                              {switches.map(({ label, on, onText, offText, toggle }) => (
                                <button
                                  key={label}
                                  type="button"
                                  role="switch"
                                  aria-checked={on}
                                  onClick={() => toggle(r)}
                                  className="w-full min-h-11 px-2 rounded-xl flex items-center justify-between gap-2 text-sm font-bold hover:bg-slate-50 cursor-pointer"
                                >
                                  <span>{label}</span>
                                  <span className={on ? 'text-whatsapp' : 'text-rose-700'}>{on ? onText : offText}</span>
                                </button>
                              ))}
                              <div className="border-t border-line my-1" />
                              <Link href={`${SITE_URL}/m/${r.slug}`} target="_blank" className="w-full min-h-11 px-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-slate-50">
                                <ExternalLink size={15} />
                                <span>فتح صفحة المتجر</span>
                              </Link>
                              <button onClick={() => handleDeleteRes(r.id, r.name)} className="w-full min-h-11 px-2 rounded-xl flex items-center gap-2 text-sm font-bold text-rose-700 hover:bg-rose-50 cursor-pointer">
                                <Trash2 size={15} />
                                <span>حذف المتجر</span>
                              </button>
                            </div>
                          </details>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* ══════════════════════════════════════
            MAP TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'map' && (
          <div className="">
            <AdminInteractiveMap
              restaurants={restaurants}
              platformAds={platformAds}
            />
          </div>
        )}

        {/* ══════════════════════════════════════
            CATEGORIES TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'categories' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">تصنيفات المنصة</h2>
                <p className="text-sm text-muted font-medium mt-0.5">{platformCategories.length} تصنيف مضاف</p>
              </div>
              <button onClick={() => setShowCatForm(!showCatForm)} className="btn btn-primary">
                <Plus size={16} /> تصنيف جديد
              </button>
            </div>

            {showCatForm && (
              <div className="c-card mb-5">
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
                <div className="text-center py-12 text-muted">
                  <p className="text-4xl mb-2">🗂️</p>
                  <p className="font-bold">لا توجد تصنيفات بعد</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {platformCategories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">{cat.icon}</div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{cat.name}</p>
                          <p className="text-sm text-muted">{Object.values(restaurantCategoryMap).filter(ids => ids.includes(cat.id)).length} مطعم</p>
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
        {!loading && !tabLoading && activeTab === 'ads' && (
          <div className="">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">الإعلانات والسلايدر</h2>
                <p className="text-sm text-muted font-medium mt-0.5">{platformAds.length} إعلان نشط</p>
              </div>
              <button
                onClick={() => {
                  setEditAdId(null)
                  setAdForm(emptyAdForm)
                  setShowAdForm(!showAdForm)
                }}
                className="btn btn-primary"
              >
                <Plus size={16} /> إعلان جديد
              </button>
            </div>

            {showAdForm && (
              <div className="c-card mb-6">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800">{editAdId ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h3>
                  <button onClick={() => { setShowAdForm(false); setEditAdId(null) }} className="btn btn-ghost btn-sm"><X size={16} /></button>
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
                        <label className="f-label mb-1">استهداف العرض (GPS / عام)</label>
                        <select
                          value={adForm.latitude !== null && adForm.longitude !== null && adForm.radius_km !== null ? 'gps' : 'all'}
                          onChange={e => {
                            if (e.target.value === 'all') {
                              setAdForm({ ...adForm, target_region: 'جميع المناطق', latitude: null, longitude: null, radius_km: null })
                            } else {
                              setAdForm({ ...adForm, target_region: 'GPS Geofence', latitude: adForm.latitude || 40.825378, longitude: adForm.longitude || 29.384052, radius_km: adForm.radius_km || 15 })
                            }
                          }}
                          className="f-input mb-3"
                        >
                          <option value="all">🌐 عام (يظهر لجميع الزبائن والمناطق)</option>
                          <option value="gps">📍 استهداف جغرافي بالـ GPS (إحداثيات ونصف قطر كم)</option>
                        </select>

                        {/* GPS Geofence Settings */}
                        {adForm.latitude !== null && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 text-sm font-bold text-slate-800">
                            <div>
                              <label className="block text-sm text-muted mb-1">
                                🔗 لصق الإحداثيات مباشرة أو رابط Google Maps
                              </label>
                              <input
                                type="text"
                                dir="ltr"
                                placeholder="40.82537830733318, 29.38405265291033"
                                onChange={e => {
                                  const val = e.target.value
                                  const match = val.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
                                  if (match) {
                                    setAdForm(prev => ({ ...prev, latitude: parseFloat(match[1]), longitude: parseFloat(match[2]) }))
                                  }
                                }}
                                className="f-input text-left"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-sm text-muted mb-1">خط العرض Lat</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={adForm.latitude ?? ''}
                                  onChange={e => setAdForm({ ...adForm, latitude: parseFloat(e.target.value) || null })}
                                  className="f-input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-muted mb-1">خط الطول Lng</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={adForm.longitude ?? ''}
                                  onChange={e => setAdForm({ ...adForm, longitude: parseFloat(e.target.value) || null })}
                                  className="f-input"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-muted mb-1">نصف القطر (كم)</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  placeholder="15"
                                  value={adForm.radius_km ?? ''}
                                  onChange={e => setAdForm({ ...adForm, radius_km: parseFloat(e.target.value) || null })}
                                  className="f-input"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                    <div className="w-28">
                      <label className="f-label">الترتيب</label>
                      <input type="number" value={adForm.sort_order} onChange={e => setAdForm({ ...adForm, sort_order: parseInt(e.target.value) || 0 })} className="f-input" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setShowAdForm(false); setEditAdId(null) }} className="btn btn-ghost">إلغاء</button>
                      <button type="submit" className="btn btn-dark">
                        {editAdId ? '💾 حفظ التعديلات' : '💾 حفظ الإعلان'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {platformAds.length === 0 ? (
              <div className="c-card text-center py-16">
                <p className="text-5xl mb-3">📣</p>
                <p className="font-bold text-muted">لا توجد إعلانات حتى الآن</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platformAds.map(ad => (
                  <div key={ad.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 aspect-[21/9]">
                    <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 text-white text-sm font-black px-2.5 py-1 rounded-full border border-white/20 z-10">
                      📍 {ad.latitude !== null && ad.longitude !== null ? `موقع جغرافي (${ad.radius_km || 15} كم)` : (ad.target_region || 'جميع المناطق')}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 z-20">
                      <button
                        onClick={() => handleEditAd(ad)}
                        className="btn btn-ghost btn-sm text-blue-600 bg-white hover:bg-slate-100 font-bold border-0"
                      >
                        <Edit size={16} /> تعديل
                      </button>
                      <button onClick={() => deleteAd(ad.id)} className="btn btn-danger btn-sm">
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
            OFFERS TAB (Super Admin Platform Offers Management & Reordering)
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'offers' && (
          <div className="space-y-5">
            {/* Header & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>🔥</span> قسم العروض والتخفيضات بالمنصة
                </h2>
                <p className="text-sm text-muted font-medium mt-0.5">
                  إجمالي {allOffers.length} عرض بالمنصة — التحكم بالأولوية لـ {allOffers.filter(o => o.is_active).length} عرض نشط
                </p>
              </div>

              {/* Search Input */}
              <div className="w-full sm:w-72">
                <input
                  type="text"
                  placeholder="ابحث بـ اسم العرض أو المتجر..."
                  value={offerSearchQuery}
                  onChange={e => setOfferSearchQuery(e.target.value)}
                  className="f-input"
                />
              </div>
            </div>

            {/* Notice Banner */}
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-sm font-bold flex items-center gap-2">
              <span className="text-lg">💡</span>
              <div>
                <strong>الترتيب المباشر للسوبر أدمن:</strong>
                <p className="font-normal text-amber-700/90 mt-0.5">
                  الرقم الأصغر في حقل (الأولوية) يعطي العرض أولوية الظهور في العارض الترويجي بالصفحة الرئيسية للمنصة (الـ 10 عروض الأولى). التحديث فوري ومباشر!
                </p>
              </div>
            </div>

            {/* Offers List Table / Cards */}
            {allOffers.filter(o => !offerSearchQuery || o.title.toLowerCase().includes(offerSearchQuery.toLowerCase()) || o.restaurants?.name?.toLowerCase().includes(offerSearchQuery.toLowerCase())).length === 0 ? (
              <div className="c-card text-center py-16">
                <p className="text-5xl mb-3">🏷️</p>
                <p className="font-bold text-muted">لا توجد عروض ترويجية مطابقة للبحث</p>
              </div>
            ) : (
              <div className="c-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>أولوية الترتيب</th>
                        <th>بطاقة العرض</th>
                        <th>المتجر التابع له</th>
                        <th>السعر النهائي</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOffers
                        .filter(o => !offerSearchQuery || o.title.toLowerCase().includes(offerSearchQuery.toLowerCase()) || o.restaurants?.name?.toLowerCase().includes(offerSearchQuery.toLowerCase()))
                        .map((offer, idx) => {
                          const store = offer.restaurants
                          return (
                            <tr key={offer.id}>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => movePlatformOfferToRank(offer.id, idx)}
                                    className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none"
                                    title="ترتيب للأعلى"
                                  >
                                    ▲
                                  </button>
                                  <select
                                    value={offer.sort_order || (idx + 1)}
                                    onChange={e => movePlatformOfferToRank(offer.id, parseInt(e.target.value))}
                                    className="bg-amber-50 border border-amber-300 font-black text-brand text-center py-1 px-2 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
                                  >
                                    {allOffers.map((_, i) => (
                                      <option key={i + 1} value={i + 1}>
                                        الترتيب #{i + 1}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={idx === allOffers.length - 1}
                                    onClick={() => movePlatformOfferToRank(offer.id, idx + 2)}
                                    className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-sm flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none"
                                    title="ترتيب للأسفل"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className="flex items-center gap-3">
                                  <SmartOfferImage
                                    primaryImage={offer.primary_item?.image_url}
                                    bonusImage={offer.bonus_item?.image_url}
                                    item3Image={offer.item3?.image_url}
                                    item4Image={offer.item4?.image_url}
                                    customImage={offer.image_url}
                                    minQuantity={offer.min_quantity}
                                    bonusQuantity={offer.bonus_quantity}
                                    className="w-12 h-12 rounded-xl shrink-0 border border-slate-200"
                                  />
                                  <div>
                                    <h4 className="font-black text-sm text-slate-900 line-clamp-1">{offer.title}</h4>
                                    <span className="text-sm text-muted font-medium">
                                      {offer.min_quantity > 1 ? `${offer.min_quantity}X ` : ''}{offer.primary_item?.name || 'منتج'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="font-black text-sm text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  {store?.name || 'غير معروف'}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-black text-brand text-sm">{offer.offer_price} ₺</span>
                                  {offer.original_price && (
                                    <span className="text-sm text-muted line-through">{offer.original_price} ₺</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <button
                                  onClick={() => togglePlatformOfferActive(offer)}
                                  className={`badge cursor-pointer  ${offer.is_active ? 'badge-green' : 'badge-red'}`}
                                >
                                  {offer.is_active ? 'نشط' : 'معطّل'}
                                </button>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  {store?.slug && (
                                    <a
                                      href={`${SITE_URL}/m/${store.slug}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-ghost btn-sm text-slate-600 hover:text-orange-600 p-1.5"
                                      title="معاينة المتجر"
                                    >
                                      <ExternalLink size={14} />
                                    </a>
                                  )}
                                  {store?.id && (
                                    <Link
                                      href={`/restaurant-panel/${store.id}`}
                                      className="btn btn-ghost btn-sm text-blue-600 p-1.5"
                                      title="إدارة متجر العرض"
                                    >
                                      <Edit size={14} />
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => deletePlatformOffer(offer.id, offer.title)}
                                    className="btn btn-danger btn-sm p-1.5"
                                    title="حذف العرض"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            ORDERS TAB
        ══════════════════════════════════════ */}
        {!loading && !tabLoading && activeTab === 'orders' && (
          <div className="">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-800">الطلبات الواردة</h2>
              <p className="text-sm text-muted font-medium mt-0.5">{orders.length} طلب — {pendingOrders} بانتظار التأكيد</p>
            </div>
            <div className="c-card overflow-hidden">
              {orders.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">📦</p>
                  <p className="font-bold text-muted">لا توجد طلبات حتى الآن</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>المتجر / النشاط</th>
                        <th>المنتجات والطلبات</th>
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
                            <span className="font-mono text-sm text-muted bg-slate-100 px-2 py-1 rounded-lg">
                              {order.id.split('-')[0].toUpperCase()}
                            </span>
                          </td>
                          <td className="font-black text-slate-900">{order.restaurants?.name}</td>
                          <td>
                            <ul className="space-y-0.5 text-sm text-slate-600">
                              {order.items.map((item: any, i: number) => (
                                <li key={i}>
                                  <span className="badge badge-gray">{item.quantity}x</span> {item.name}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td>
                            <span className="font-black text-brand">{order.total_price?.toFixed(2)} ₺</span>
                          </td>
                          <td>
                            {order.location_url ? (
                              <a href={order.location_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm text-blue-600 border-blue-100 bg-blue-50">
                                <MapPin size={12} /> خريطة
                              </a>
                            ) : (
                              <span className="text-sm font-bold text-muted bg-slate-100 px-2 py-1 rounded-lg">
                                غير مرفق
                              </span>
                            )}
                          </td>
                          <td className="text-sm text-muted font-medium">
                            {new Date(order.created_at).toLocaleString('ar-SA', { hour12: true })}
                          </td>
                          <td>
                            <button
                              onClick={async () => {
                                if (order.status === 'completed') return
                                // Optimistic update: change locally first, no page reload
                                setOrders(prev => prev.map(o =>
                                  o.id === order.id ? { ...o, status: 'completed' } : o
                                ))
                                reportWriteResult(await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id))
                              }}
                              className={`badge cursor-pointer  ${order.status === 'completed' ? 'badge-green' : 'badge-amber hover:bg-amber-100'}`}
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

        {activeTab === 'legal' && (
          <div className="tab-content">
            <AdminLegalPagesTab />
          </div>
        )}
      </div>
    </div>
  )
}
