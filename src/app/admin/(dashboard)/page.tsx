'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { triggerRevalidate } from '@/utils/revalidate'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'
import SmartOfferImage from '@/components/SmartOfferImage'
import StoreSettingsModal from '@/components/StoreSettingsModal'
import AdminBusinessTypesTab, { BusinessType } from '@/components/AdminBusinessTypesTab'
import AdminLegalPagesTab from '@/components/AdminLegalPagesTab'
import AdminQrAnalyticsTab from '@/components/AdminQrAnalyticsTab'
import TabErrorBoundary from '@/components/TabErrorBoundary'
import { getStoreStatus } from '@/utils/storeStatus'
import dynamicImport from 'next/dynamic'
import { Plus, Edit, Settings, Trash2, LayoutGrid, Image as ImageIcon, Store, ClipboardList, CheckCircle, X, ExternalLink, MapPin, Phone, Flame, Utensils, Map as MapIcon, Tag, ShieldCheck, QrCode } from 'lucide-react'

const AdminInteractiveMap = dynamicImport(() => import('@/components/AdminInteractiveMap'), { ssr: false })

const TABS = [
  { key: 'restaurants', label: 'المتاجر', Icon: Store },
  { key: 'qr_analytics', label: 'إحصائيات الـ QR 📊', Icon: QrCode },
  { key: 'offers', label: 'العروض والتخفيضات', Icon: Flame },
  { key: 'business_types', label: 'أنواع الأنشطة 🏷️', Icon: Tag },
  { key: 'legal', label: 'الخصوصية والشروط 📜', Icon: ShieldCheck },
  { key: 'map', label: 'الخريطة التفاعلية 🗺️', Icon: MapIcon },
  { key: 'categories', label: 'التصنيفات الفرعية', Icon: LayoutGrid },
  { key: 'zones', label: 'المناطق الجغرافية', Icon: MapPin },
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
  const [serviceZones, setServiceZones] = useState<any[]>([])
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('restaurants')
  const [selectedStoreForSettings, setSelectedStoreForSettings] = useState<any>(null)

  const [allOffers, setAllOffers] = useState<any[]>([])
  const [offerSearchQuery, setOfferSearchQuery] = useState('')

  const supabase = createClient()

  const [ownerPhoneMap, setOwnerPhoneMap] = useState<Record<string, string>>({})

  const fetchData = async () => {
    setLoading(true)
    const [resRes, catRes, adsRes, relRes, ordRes, zonesRes, profRes, offersRes, bTypesRes] = await Promise.all([
      supabase
        .from('restaurants')
        .select(
          'id, name, slug, primary_color, whatsapp_number, logo_url, cover_url, store_type, ' +
          'has_delivery, is_on_holiday, opening_time, closing_time, days_off, ' +
          'latitude, longitude, delivery_radius_km, delivery_tiers, max_offers_limit, ' +
          'enable_whatsapp_orders, is_subscription_active, is_menu_active, subscription_notes, created_at'
        )
        .order('created_at', { ascending: false }),
      supabase.from('platform_categories').select('id, name, icon, sort_order, created_at').order('created_at', { ascending: true }),
      supabase.from('platform_ads').select('id, title, image_url, link_url, sort_order, is_active, created_at').order('sort_order', { ascending: true }),
      supabase.from('restaurant_platform_categories').select('restaurant_id, platform_category_id'),
      supabase.from('orders').select('id, restaurant_id, total_price, status, created_at, items, location_url, restaurants(name)').order('created_at', { ascending: false }),
      supabase.from('service_zones').select('id, name, polygon, is_active, created_at').order('created_at', { ascending: true }),
      supabase.from('profiles').select('restaurant_id, phone').eq('role', 'restaurant_owner'),
      supabase.from('offers').select('id, title, is_active, sort_order, created_at, restaurant_id, primary_item_id, bonus_item_id, item3_id, item4_id, restaurants(id, name, slug), primary_item:menu_items!primary_item_id(name, image_url), bonus_item:menu_items!bonus_item_id(name, image_url), item3:menu_items!item3_id(name, image_url), item4:menu_items!item4_id(name, image_url)').order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
      supabase.from('business_types').select('id, name, slug, icon, sort_order, is_active').order('sort_order', { ascending: true })
    ])
    if (resRes.data) setRestaurants(resRes.data)
    if (catRes.data) setPlatformCategories(catRes.data)
    if (adsRes.data) setPlatformAds(adsRes.data)
    if (bTypesRes.data && bTypesRes.data.length > 0) setBusinessTypes(bTypesRes.data)
    if (offersRes.data) {
      const sorted = [...offersRes.data].sort((a, b) => {
        const orderA = (a.sort_order && a.sort_order > 0) ? a.sort_order : 999999
        const orderB = (b.sort_order && b.sort_order > 0) ? b.sort_order : 999999
        if (orderA !== orderB) return orderA - orderB
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      })
      const normalized = sorted.map((off, idx) => ({ ...off, sort_order: idx + 1 }))
      setAllOffers(normalized)
    }
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
    if (ordRes.data) setOrders(ordRes.data)
    if (zonesRes.data) setServiceZones(zonesRes.data)
    setLoading(false)
  }

  const movePlatformOfferToRank = async (targetOfferId: string, targetRank: number) => {
    let list = [...allOffers].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const currentIndex = list.findIndex(o => o.id === targetOfferId)
    if (currentIndex === -1) return

    const [movedOffer] = list.splice(currentIndex, 1)
    const clampedRank = Math.max(1, Math.min(targetRank, list.length + 1))
    list.splice(clampedRank - 1, 0, movedOffer)

    const updatedList = list.map((off, idx) => ({ ...off, sort_order: idx + 1 }))
    setAllOffers(updatedList)

    await Promise.all(
      updatedList.map(off =>
        supabase.from('offers').update({ sort_order: off.sort_order }).eq('id', off.id)
      )
    )
    // Offers reordered: refresh offers page and home
    triggerRevalidate(null, 'offers')
  }

  const togglePlatformOfferActive = async (offer: any) => {
    const newStatus = !offer.is_active
    setAllOffers(prev => prev.map(o => o.id === offer.id ? { ...o, is_active: newStatus } : o))
    await supabase.from('offers').update({ is_active: newStatus }).eq('id', offer.id)
  }

  const deletePlatformOffer = async (offerId: string, title: string) => {
    if (confirm(`هل أنت متأكد من حذف العرض "${title}" من المنصة بالكامل؟`)) {
      setAllOffers(prev => prev.filter(o => o.id !== offerId))
      await supabase.from('offers').delete().eq('id', offerId)
    }
  }

  const toggleRestaurantSubscription = async (r: any) => {
    const newVal = r.is_subscription_active === false ? true : false
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, is_subscription_active: newVal } : item))
    await supabase.from('restaurants').update({ is_subscription_active: newVal }).eq('id', r.id)
    triggerRevalidate(r.slug, 'all')
  }

  const toggleRestaurantMenu = async (r: any) => {
    const newVal = r.is_menu_active === false ? true : false
    setRestaurants(prev => prev.map(item => item.id === r.id ? { ...item, is_menu_active: newVal } : item))
    await supabase.from('restaurants').update({ is_menu_active: newVal }).eq('id', r.id)
    triggerRevalidate(r.slug, 'all')
  }

  useEffect(() => { fetchData() }, [])

  // ── Restaurants ─────────────────────────────────────────────────
  const [showResForm, setShowResForm] = useState(false)
  const [editResId, setEditResId] = useState<string | null>(null)
  const emptyRes = {
    name: '', slug: '', primary_color: '#ea580c', whatsapp_number: '', owner_phone: '',
    logo_url: '', cover_url: '', latitude: '', longitude: '', delivery_radius_km: '5',
    max_offers_limit: '5', store_type: 'restaurant', has_delivery: true,
    opening_time: '09:00', closing_time: '23:00', days_off: [] as string[], is_on_holiday: false,
    is_subscription_active: true, is_menu_active: true, subscription_notes: ''
  }
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
      max_offers_limit: resForm.max_offers_limit ? parseInt(resForm.max_offers_limit) : 5,
      store_type: resForm.store_type || 'restaurant',
      has_delivery: resForm.has_delivery,
      opening_time: resForm.opening_time || '09:00',
      closing_time: resForm.closing_time || '23:00',
      days_off: resForm.days_off || [],
      is_on_holiday: resForm.is_on_holiday || false,
      is_subscription_active: resForm.is_subscription_active !== false,
      is_menu_active: resForm.is_menu_active !== false,
      subscription_notes: resForm.subscription_notes || null,
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
    // Invalidate public pages: restaurant edit affects menu + home listing
    triggerRevalidate(resForm.slug, 'menu')
    triggerRevalidate(null, 'home')
  }

  const handleEditRes = (r: any) => {
    setEditResId(r.id)
    const currentOwnerPhone = ownerPhoneMap[r.id] || r.owner_phone || ''
    setResForm({
      name: r.name, slug: r.slug, primary_color: r.primary_color || '#ea580c',
      whatsapp_number: r.whatsapp_number || '', owner_phone: currentOwnerPhone,
      logo_url: r.logo_url || '', cover_url: r.cover_url || '',
      latitude: r.latitude?.toString() || '', longitude: r.longitude?.toString() || '',
      delivery_radius_km: r.delivery_radius_km?.toString() || '5',
      max_offers_limit: r.max_offers_limit?.toString() || '5',
      store_type: r.store_type || 'restaurant',
      has_delivery: r.has_delivery !== false,
      opening_time: r.opening_time || '09:00',
      closing_time: r.closing_time || '23:00',
      days_off: Array.isArray(r.days_off) ? r.days_off : [],
      is_on_holiday: !!r.is_on_holiday,
      is_subscription_active: r.is_subscription_active !== false,
      is_menu_active: r.is_menu_active !== false,
      subscription_notes: r.subscription_notes || '',
    })
    setSelectedCatIds(restaurantCategoryMap[r.id] || [])
    setShowResForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRes = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف مطعم "${name}"؟`)) {
      await supabase.from('restaurants').delete().eq('id', id)
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
    if (editCatId) await supabase.from('platform_categories').update(catForm).eq('id', editCatId)
    else await supabase.from('platform_categories').insert([catForm])
    setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '' }); fetchData()
  }

  const deleteCat = async (id: string) => {
    if (confirm('حذف التصنيف؟')) { await supabase.from('platform_categories').delete().eq('id', id); fetchData() }
  }

  // ── Service Zones ────────────────────────────────────────────────
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [editZoneId, setEditZoneId] = useState<string | null>(null)
  const emptyZone = { name: '', latitude: '', longitude: '', radius_km: '15', is_active: true }
  const [zoneForm, setZoneForm] = useState(emptyZone)
  const [savingZone, setSavingZone] = useState(false)

  const handleZoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingZone(true)
    const payload = {
      name: zoneForm.name.trim(),
      latitude: parseFloat(zoneForm.latitude),
      longitude: parseFloat(zoneForm.longitude),
      radius_km: parseFloat(zoneForm.radius_km) || 15,
      is_active: zoneForm.is_active
    }
    if (editZoneId) {
      await supabase.from('service_zones').update(payload).eq('id', editZoneId)
    } else {
      await supabase.from('service_zones').insert([payload])
    }
    setSavingZone(false)
    setShowZoneForm(false)
    setEditZoneId(null)
    setZoneForm(emptyZone)
    fetchData()
  }

  const handleEditZone = (z: any) => {
    setEditZoneId(z.id)
    setZoneForm({
      name: z.name,
      latitude: z.latitude.toString(),
      longitude: z.longitude.toString(),
      radius_km: z.radius_km.toString(),
      is_active: z.is_active
    })
    setShowZoneForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteZone = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المنطقة الجغرافية "${name}"؟`)) {
      await supabase.from('service_zones').delete().eq('id', id)
      fetchData()
    }
  }

  const toggleZoneActive = async (z: any) => {
    await supabase.from('service_zones').update({ is_active: !z.is_active }).eq('id', z.id)
    fetchData()
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
    if (!adForm.image_url) return alert('الصورة مطلوبة')

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
        alert('حدث خطأ أثناء تعديل الإعلان: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('platform_ads').insert([payload])
      if (error) {
        console.error('Error inserting ad:', error)
        alert('حدث خطأ أثناء حفظ الإعلان: ' + error.message)
        return
      }
    }
    setShowAdForm(false)
    setEditAdId(null)
    setAdForm(emptyAdForm)
    fetchData()
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
    if (confirm('حذف هذا الإعلان؟')) { await supabase.from('platform_ads').delete().eq('id', id); fetchData() }
  }

  const handleImpersonateOwner = (r: any) => {
    localStorage.setItem('restaurant_owner_session', JSON.stringify({
      restaurant_id: r.id,
      restaurant_name: r.name,
      role: 'admin'
    }))

    const partnerUrl = typeof window !== 'undefined' && window.location.hostname.includes('alfsouq.com')
      ? `https://partner.alfsouq.com/restaurant-panel/${r.id}?auth=admin`
      : `/restaurant-panel/${r.id}?auth=admin`

    window.open(partnerUrl, '_blank')
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
            QR ANALYTICS TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'qr_analytics' && (
          <TabErrorBoundary tabName="إحصائيات الـ QR">
            <AdminQrAnalyticsTab restaurants={restaurants} />
          </TabErrorBoundary>
        )}

        {/* ══════════════════════════════════════
            BUSINESS TYPES TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'business_types' && (
          <AdminBusinessTypesTab businessTypes={businessTypes} onRefresh={fetchData} />
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
                        <label className="f-label">اسم النشاط / المحل *</label>
                        <input type="text" required value={resForm.name} onChange={e => setResForm({ ...resForm, name: e.target.value })} className="f-input" placeholder="مثال: سوبرماركت الخير" />
                      </div>
                      <div>
                        <label className="f-label">نوع النشاط التجاري *</label>
                        <select
                          value={resForm.store_type || (businessTypes[0]?.slug || 'restaurant')}
                          onChange={e => setResForm({ ...resForm, store_type: e.target.value })}
                          className="f-input font-bold"
                        >
                          {businessTypes.map(bt => (
                            <option key={bt.id} value={bt.slug}>
                              {bt.icon} {bt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="f-label">الرابط (Slug) *</label>
                        <input type="text" required dir="ltr" value={resForm.slug} onChange={e => setResForm({ ...resForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="f-input text-left" placeholder="alalkhair-market" />
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
                      <div>
                        <label className="f-label">📱 رقم هاتف المحل/المالك (لتسجيل الدخول)</label>
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
                        <label className="f-label mb-1">لوجو المطعم / المتجر 🖼️</label>
                        <p className="text-[10px] text-slate-400 font-bold mb-2">
                          💡 المقاس المثالي: <span className="text-orange-600">500 × 500 بكسل</span> (نسبة 1:1 مربع)
                        </p>
                        <ImageUpload value={resForm.logo_url} onChange={(url) => setResForm({ ...resForm, logo_url: url })} />
                      </div>
                      <div>
                        <label className="f-label mb-1">صورة الغلاف 🏙️</label>
                        <p className="text-[10px] text-slate-400 font-bold mb-2">
                          💡 المقاس المثالي: <span className="text-orange-600">1200 × 675 بكسل</span> (نسبة 16:9 عريض)
                        </p>
                        <ImageUpload value={resForm.cover_url} onChange={(url) => setResForm({ ...resForm, cover_url: url })} />
                      </div>
                    </div>

                    {/* Delivery Option Toggle */}
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <input
                        type="checkbox"
                        id="has_delivery"
                        checked={resForm.has_delivery}
                        onChange={e => setResForm({ ...resForm, has_delivery: e.target.checked })}
                        className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                      />
                      <label htmlFor="has_delivery" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        🛵 يقدّم خدمة التوصيل للمنازل (عند إلغاء التفعيل سيظهر كـ "استلام من الفرع / تصفح فقط")
                      </label>
                    </div>

                    {/* Subscription & Menu Status Controls */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 space-y-3 border border-slate-700 shadow-sm">
                      <h4 className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                        <span>🛡️</span> حالة الاشتراك وإتاحة المنيو للزبائن
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Subscription Active Toggle */}
                        <div className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                          resForm.is_subscription_active !== false
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        }`}>
                          <div className="min-w-0">
                            <h5 className="font-black text-xs">اشتراك لوحة التحكم</h5>
                            <p className="text-[10px] opacity-75">
                              {resForm.is_subscription_active !== false ? '✅ نشط (يسمح بالتعديل)' : '⛔ معلق (يمنع التعديل)'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={resForm.is_subscription_active !== false}
                            onChange={e => setResForm({ ...resForm, is_subscription_active: e.target.checked })}
                            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                          />
                        </div>

                        {/* 2. Menu Active Toggle */}
                        <div className={`p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                          resForm.is_menu_active !== false
                            ? 'bg-blue-950/40 border-blue-500/40 text-blue-300'
                            : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        }`}>
                          <div className="min-w-0">
                            <h5 className="font-black text-xs">منيو الزبائن العام</h5>
                            <p className="text-[10px] opacity-75">
                              {resForm.is_menu_active !== false ? '🟢 منشور ومتاح' : '🔴 معلق ومخفي'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={resForm.is_menu_active !== false}
                            onChange={e => setResForm({ ...resForm, is_menu_active: e.target.checked })}
                            className="w-5 h-5 accent-blue-500 rounded cursor-pointer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-300 mb-1 block">ملاحظات الاشتراك (اختياري)</label>
                        <input
                          type="text"
                          value={resForm.subscription_notes || ''}
                          onChange={e => setResForm({ ...resForm, subscription_notes: e.target.value })}
                          placeholder="مثال: اشتراك شهري مدفوع حتى تاريخ..."
                          className="f-input bg-slate-950 text-white border-slate-700 text-xs placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Working Hours & Days Off */}
                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-sm text-slate-800 flex items-center gap-1.5">
                          <span>⏰</span> ساعات العمل وأيام العطلة الرسمية
                        </h4>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-900">
                          <input
                            type="checkbox"
                            checked={resForm.is_on_holiday}
                            onChange={e => setResForm({ ...resForm, is_on_holiday: e.target.checked })}
                            className="w-4 h-4 accent-amber-600 rounded"
                          />
                          <span>🌴 إغلاق مؤقت / في عطلة</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="f-label">وقت الفتح ⏰</label>
                          <input
                            type="time"
                            value={resForm.opening_time}
                            onChange={e => setResForm({ ...resForm, opening_time: e.target.value })}
                            className="f-input text-center font-bold bg-white"
                          />
                        </div>
                        <div>
                          <label className="f-label">وقت الإغلاق 🌙</label>
                          <input
                            type="time"
                            value={resForm.closing_time}
                            onChange={e => setResForm({ ...resForm, closing_time: e.target.value })}
                            className="f-input text-center font-bold bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="f-label mb-1">أيام العطلة الأسبوعية (اختياري)</label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => {
                            const isSelected = (resForm.days_off || []).includes(day)
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const current = resForm.days_off || []
                                  const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
                                  setResForm({ ...resForm, days_off: next })
                                }}
                                className={`px-3 py-1 rounded-xl text-xs font-black transition-all border ${
                                  isSelected
                                    ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {isSelected ? '✓ ' : ''}{day}
                              </button>
                            )
                          })}
                        </div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        <div>
                          <label className="f-label">الحد الأقصى للعروض</label>
                          <input type="number" min="1" max="100" value={resForm.max_offers_limit}
                            onChange={e => setResForm({ ...resForm, max_offers_limit: e.target.value })}
                            className="f-input bg-white font-black text-orange-600" placeholder="5" />
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
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black text-base text-slate-900">{r.name}</h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">/m/{r.slug}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="badge badge-gray font-bold">
                              {(() => {
                                const bt = businessTypes.find(b => b.slug === r.store_type)
                                return bt ? `${bt.icon} ${bt.name}` : (r.store_type === 'supermarket' ? '🛒 سوبرماركت' : r.store_type === 'clothing' ? '👗 ألبسة' : r.store_type === 'other' ? '🎁 متجر' : '🍔 مطعم')
                              })()}
                            </span>
                            {(() => {
                              const status = getStoreStatus(r)
                              return (
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black inline-flex items-center gap-1 ${status.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                                  <span>{status.statusText}</span>
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                        {cats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {cats.map((c: any) => (
                              <span key={c.id} className="badge badge-gray">{c.icon} {c.name}</span>
                            ))}
                          </div>
                        )}
                        {/* Login Phone & WhatsApp Details */}
                        <div className="space-y-1.5 mb-3 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl text-xs">
                          <div className="flex items-center justify-between gap-1 text-slate-800 font-bold">
                            <span className="flex items-center gap-1">
                              <Phone size={11} className="text-amber-600 shrink-0" />
                              هاتف دخول اللوحة:
                            </span>
                            <span dir="ltr" className="font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md text-[11px]">
                              {ownerPhoneMap[r.id] || r.owner_phone || 'غير مسجّل'}
                            </span>
                          </div>
                          {r.whatsapp_number && (
                            <div className="flex items-center justify-between gap-1 text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                <Phone size={11} className="text-emerald-500 shrink-0" />
                                واتساب الزبائن:
                              </span>
                              <span dir="ltr" className="font-mono text-slate-700">
                                {r.whatsapp_number}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Subscription & Menu Status Quick Controls */}
                        <div className="grid grid-cols-2 gap-1.5 mb-3 bg-slate-50 border border-slate-200/80 p-2 rounded-2xl">
                          {/* Subscription Status Toggle */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <span>💳</span> اشتراك اللوحة:
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRestaurantSubscription(r)}
                              className={`px-2 py-1 rounded-xl text-[11px] font-black border transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                r.is_subscription_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                              title="اضغط للتبديل الفوري لحالة الاشتراك"
                            >
                              <span>{r.is_subscription_active !== false ? 'نشط ✅' : 'معلق ⛔'}</span>
                              <span className="text-[9px] opacity-60">تبديل</span>
                            </button>
                          </div>

                          {/* Menu Status Toggle */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <span>🍽️</span> منيو الزبائن:
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRestaurantMenu(r)}
                              className={`px-2 py-1 rounded-xl text-[11px] font-black border transition flex items-center justify-between cursor-pointer active:scale-95 ${
                                r.is_menu_active !== false
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                              }`}
                              title="اضغط للتبديل الفوري لإتاحة المنيو للزبائن"
                            >
                              <span>{r.is_menu_active !== false ? 'منشور 🟢' : 'معلق 🔴'}</span>
                              <span className="text-[9px] opacity-60">تبديل</span>
                            </button>
                          </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-2">
                          <div className="grid grid-cols-2 gap-1.5">
                            <button onClick={() => handleEditRes(r)} className="btn btn-ghost btn-sm text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold">
                              <Edit size={13} /> تعديل البيانات ✏️
                            </button>
                            <button onClick={() => setSelectedStoreForSettings(r)} className="btn btn-ghost btn-sm text-orange-700 bg-orange-50 border border-orange-100 hover:bg-orange-100 font-bold">
                              <Settings size={13} /> الدوام والعطلات ⚙️
                            </button>
                          </div>
                          <div className="flex gap-1.5">
                            <Link href={`/admin/restaurant/${r.id}`} className="btn btn-sm flex-1 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 font-bold">
                              <Utensils size={14} /> إدارة عناصر المنيو والعروض
                            </Link>
                            <button onClick={() => handleDeleteRes(r.id, r.name)} className="btn btn-danger btn-sm shrink-0">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleImpersonateOwner(r)}
                            className="btn btn-sm bg-slate-900 text-slate-200 hover:bg-slate-800 w-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            <span>🏪 دخول كصاحب متجر</span>
                            <ExternalLink size={13} className="text-slate-400" />
                          </button>
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
            MAP TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'map' && (
          <div className="animate-fade-in-up">
            <AdminInteractiveMap
              restaurants={restaurants}
              serviceZones={serviceZones}
              platformAds={platformAds}
            />
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
            SERVICE ZONES TAB
        ══════════════════════════════════════ */}
        {!loading && activeTab === 'zones' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-slate-800">المناطق الجغرافية والمسميات</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{serviceZones.length} منطقة معرفة في النظام</p>
              </div>
              <button
                onClick={() => {
                  setEditZoneId(null)
                  setZoneForm(emptyZone)
                  setShowZoneForm(!showZoneForm)
                }}
                className="btn btn-primary"
              >
                <Plus size={16} /> منطقة جديدة
              </button>
            </div>

            {showZoneForm && (
              <div className="c-card mb-6 animate-slide-down">
                <div className="c-card-header">
                  <h3 className="font-black text-slate-800">{editZoneId ? 'تعديل منطقة جغرافية' : 'إضافة منطقة جغرافية جديدة'}</h3>
                  <button onClick={() => { setShowZoneForm(false); setEditZoneId(null) }} className="btn btn-ghost btn-sm"><X size={16} /></button>
                </div>
                <div className="c-card-body">
                  <form onSubmit={handleZoneSubmit} className="space-y-4">
                    <div>
                      <label className="f-label">اسم المنطقة بالعربية (يظهر للزبون)</label>
                      <input
                        type="text"
                        required
                        value={zoneForm.name}
                        onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                        className="f-input"
                        placeholder="مثال: شايروفا / كيبزة"
                      />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">
                          🔗 لصق الإحداثيات مباشرة أو رابط Google Maps
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          placeholder="40.8167, 29.3750"
                          onChange={e => {
                            const val = e.target.value
                            const match = val.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/)
                            if (match) {
                              setZoneForm(prev => ({ ...prev, latitude: match[1], longitude: match[2] }))
                            }
                          }}
                          className="f-input text-left"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="f-label">خط العرض (Lat)</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={zoneForm.latitude}
                            onChange={e => setZoneForm({ ...zoneForm, latitude: e.target.value })}
                            className="f-input"
                            placeholder="40.8167"
                          />
                        </div>
                        <div>
                          <label className="f-label">خط الطول (Lng)</label>
                          <input
                            type="number"
                            step="any"
                            required
                            value={zoneForm.longitude}
                            onChange={e => setZoneForm({ ...zoneForm, longitude: e.target.value })}
                            className="f-input"
                            placeholder="29.3750"
                          />
                        </div>
                        <div>
                          <label className="f-label">نصف القطر (كم)</label>
                          <input
                            type="number"
                            step="0.5"
                            required
                            min="0.5"
                            value={zoneForm.radius_km}
                            onChange={e => setZoneForm({ ...zoneForm, radius_km: e.target.value })}
                            className="f-input"
                            placeholder="15"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="zone_active"
                        checked={zoneForm.is_active}
                        onChange={e => setZoneForm({ ...zoneForm, is_active: e.target.checked })}
                        className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
                      />
                      <label htmlFor="zone_active" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                        تفعيل التغطية لهذه المنطقة
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => { setShowZoneForm(false); setEditZoneId(null) }} className="btn btn-ghost">إلغاء</button>
                      <button type="submit" disabled={savingZone} className="btn btn-dark">
                        {savingZone ? 'جاري الحفظ...' : editZoneId ? '💾 حفظ التعديلات' : '➕ إضافة المنطقة'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="c-card overflow-hidden">
              {serviceZones.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-4xl mb-2">📍</p>
                  <p className="font-bold">لا توجد مناطق جغرافية بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>اسم المنطقة</th>
                        <th>خط العرض والطول</th>
                        <th>نصف القطر</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceZones.map(zone => (
                        <tr key={zone.id}>
                          <td className="font-black text-slate-900">{zone.name}</td>
                          <td className="font-mono text-xs text-slate-600" dir="ltr">
                            {zone.latitude}, {zone.longitude}
                          </td>
                          <td>
                            <span className="badge badge-gray">{zone.radius_km} كم</span>
                          </td>
                          <td>
                            <button
                              onClick={() => toggleZoneActive(zone)}
                              className={`badge cursor-pointer transition ${zone.is_active ? 'badge-green' : 'badge-amber'}`}
                            >
                              {zone.is_active ? 'مفعّلة' : 'معطّلة'}
                            </button>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditZone(zone)}
                                className="btn btn-ghost btn-sm text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteZone(zone.id, zone.name)}
                                className="btn btn-danger btn-sm"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
              <div className="c-card mb-6 animate-slide-down">
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
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 animate-fade-in text-xs font-bold text-slate-800">
                            <div>
                              <label className="block text-[11px] text-slate-500 mb-1">
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
                                <label className="block text-[10px] text-slate-400 mb-1">خط العرض Lat</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={adForm.latitude ?? ''}
                                  onChange={e => setAdForm({ ...adForm, latitude: parseFloat(e.target.value) || null })}
                                  className="f-input"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">خط الطول Lng</label>
                                <input
                                  type="number"
                                  step="any"
                                  value={adForm.longitude ?? ''}
                                  onChange={e => setAdForm({ ...adForm, longitude: parseFloat(e.target.value) || null })}
                                  className="f-input"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-400 mb-1">نصف القطر (كم)</label>
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
                <p className="font-bold text-slate-400">لا توجد إعلانات حتى الآن</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {platformAds.map(ad => (
                  <div key={ad.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-[21/9]">
                    <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full border border-white/20 z-10">
                      📍 {ad.latitude !== null && ad.longitude !== null ? `موقع جغرافي (${ad.radius_km || 15} كم)` : (ad.target_region || 'جميع المناطق')}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
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
        {!loading && activeTab === 'offers' && (
          <div className="animate-fade-in-up space-y-5">
            {/* Header & Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-2xs">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>🔥</span> قسم العروض والتخفيضات بالمنصة
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
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
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-xs font-bold flex items-center gap-2 shadow-2xs">
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
                <p className="font-bold text-slate-400">لا توجد عروض ترويجية مطابقة للبحث</p>
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
                                    className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center transition disabled:opacity-20 disabled:pointer-events-none"
                                    title="ترتيب للأعلى"
                                  >
                                    ▲
                                  </button>
                                  <select
                                    value={offer.sort_order || (idx + 1)}
                                    onChange={e => movePlatformOfferToRank(offer.id, parseInt(e.target.value))}
                                    className="bg-amber-50 border border-amber-300 font-black text-orange-600 text-center py-1 px-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
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
                                    className="w-6 h-6 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] flex items-center justify-center transition disabled:opacity-20 disabled:pointer-events-none"
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
                                    <h4 className="font-black text-xs text-slate-900 line-clamp-1">{offer.title}</h4>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {offer.min_quantity > 1 ? `${offer.min_quantity}X ` : ''}{offer.primary_item?.name || 'منتج'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="font-black text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                                  {store?.name || 'غير معروف'}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-black text-orange-600 text-xs">{offer.offer_price} ₺</span>
                                  {offer.original_price && (
                                    <span className="text-[10px] text-slate-400 line-through">{offer.original_price} ₺</span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <button
                                  onClick={() => togglePlatformOfferActive(offer)}
                                  className={`badge cursor-pointer transition ${offer.is_active ? 'badge-green' : 'badge-red'}`}
                                >
                                  {offer.is_active ? 'نشط' : 'معطّل'}
                                </button>
                              </td>
                              <td>
                                <div className="flex items-center gap-1.5">
                                  {store?.slug && (
                                    <a
                                      href={`/m/${store.slug}`}
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
                                      href={`/admin/restaurant/${store.id}`}
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

        {activeTab === 'legal' && (
          <div className="tab-content">
            <AdminLegalPagesTab />
          </div>
        )}
      </div>
      <StoreSettingsModal
        restaurant={selectedStoreForSettings}
        isOpen={!!selectedStoreForSettings}
        onClose={() => setSelectedStoreForSettings(null)}
        onSaveSuccess={fetchData}
      />
    </div>
  )
}
