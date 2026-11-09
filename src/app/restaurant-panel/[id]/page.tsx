'use client'

import { use, useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ExternalLink, LogOut, QrCode, Settings } from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import CategoriesTab from '@/components/panel/CategoriesTab'
import DeliveryTab from '@/components/panel/DeliveryTab'
import ItemsTab from '@/components/panel/ItemsTab'
import OffersTab from '@/components/panel/OffersTab'
import StoreStats from '@/components/panel/StoreStats'
import TemporaryChanges from '@/components/panel/TemporaryChanges'
import type { PanelStore } from '@/components/panel/shared'
import InstallAppButton from '@/components/pwa/InstallAppButton'
import { supabase } from '@/lib/supabase'
import { notifyError } from '@/utils/notify'
import { getMainDomainMenuUrl } from '@/utils/url'

// Rarely opened and heavy, so they load only when used
const StoreSettingsModal = dynamic(() => import('@/components/StoreSettingsModal'))
const StoreQrModal = dynamic(() => import('@/components/StoreQrModal'))

type PanelTab = 'items' | 'offers' | 'categories' | 'delivery'

export default function RestaurantOwnerPanel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [access, setAccess] = useState<'admin' | 'owner' | null>(null)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [offers, setOffers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<PanelTab>('items')
  const [showSettings, setShowSettings] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const refresh = useCallback(async () => {
    const [restaurantResult, categoriesResult, offersResult] = await Promise.all([
      supabase
        .from('restaurants')
        .select(
          'id, name, slug, primary_color, whatsapp_number, phone, logo_url, cover_url, ' +
          'latitude, longitude, delivery_radius_km, delivery_tiers, has_delivery, ' +
          'enable_whatsapp_orders, is_on_holiday, holiday_message, opening_time, closing_time, timezone, days_off, delivery_from, delivery_until, special_days, delivery_paused_until, closed_until, store_type, ' +
          'max_offers_limit, menu_note, is_subscription_active, is_menu_active'
        )
        .eq('id', id)
        .maybeSingle() as any,
      supabase
        .from('categories')
        .select('id, name, sort_order, restaurant_id')
        .eq('restaurant_id', id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('offers')
        .select('id, title, description, original_price, offer_price, image_url, images, is_active, sort_order, created_at, restaurant_id, primary_item_id, bonus_item_id, item3_id, item4_id, min_quantity, bonus_quantity, item3_quantity, item4_quantity')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false }),
    ])

    if (restaurantResult.error || categoriesResult.error || offersResult.error) {
      notifyError('تعذر تحميل بيانات المتجر. تأكد من اتصالك وحاول مرة أخرى.')
      return
    }

    const categoryRows = categoriesResult.data || []
    const { data: items } = categoryRows.length > 0
      ? await supabase
          .from('menu_items')
          .select('id, name, description, price, original_price, image_url, images, is_available, is_hidden, out_of_stock_until, is_offer, offer_title, unit, sizes, colors, allow_custom_amount, category_id, created_at')
          .in('category_id', categoryRows.map(c => c.id))
          .order('created_at', { ascending: true })
      : { data: [] }

    setRestaurant(restaurantResult.data)
    setCategories(categoryRows)
    setMenuItems(items || [])
    setOffers(offersResult.data || [])
  }, [id])

  // Roles live in app_metadata, which only the server can write. RLS enforces the
  // same rules on every query, so this check only decides what to show.
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const meta = user?.app_metadata
      if (meta?.role === 'admin') {
        setAccess('admin')
      } else if (meta?.role === 'restaurant_owner' && meta.restaurant_id === id) {
        setAccess('owner')
      } else {
        window.location.href = window.location.hostname.includes('alfsouq.com')
          ? 'https://partner.alfsouq.com/dashboard'
          : '/dashboard'
        return
      }
      await refresh()
      setLoading(false)
    })
  }, [id, refresh])

  const isSuspended = restaurant?.is_subscription_active === false && access !== 'admin'
  const isSupermarket = restaurant?.store_type === 'supermarket'

  const canEdit = () => {
    if (isSuspended) notifyError('اشتراك متجرك متوقف. تواصل مع الإدارة لتجديده.')
    return !isSuspended
  }

  const logout = async () => {
    // An admin visiting a store keeps their session and returns to the admin panel
    if (access === 'admin') {
      router.push('/admin')
      return
    }
    await supabase.auth.signOut()
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-page flex items-center justify-center p-4">
        <p className="font-bold">جاري التحميل...</p>
      </main>
    )
  }

  const store: PanelStore = { restaurantId: id, restaurant, categories, menuItems, offers, refresh, canEdit }

  const tabs: { key: PanelTab; label: string }[] = [
    { key: 'items', label: isSupermarket ? 'العروض' : 'المنتجات' },
    ...(isSupermarket ? [] : [{ key: 'offers' as const, label: 'البكجات' }]),
    { key: 'categories', label: 'الأقسام' },
    { key: 'delivery', label: 'التوصيل' },
  ]

  return (
    <div dir="rtl" className="min-h-screen bg-page pb-10">
      <header className="site-header">
        <div className="page-narrow py-3 flex items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <button onClick={logout} className="btn btn-secondary btn-sm">
            <LogOut size={16} />
            <span>{access === 'admin' ? 'عودة للإدارة' : 'خروج'}</span>
          </button>
        </div>
      </header>

      <main className="page-narrow py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-black leading-snug">{restaurant?.name}</h1>
        </div>

        {access === 'admin' && <p className="notice notice-info">أنت تعدّل هذا المتجر بصلاحية الإدارة.</p>}
        {isSuspended && (
          <p className="notice notice-bad">اشتراك متجرك متوقف ولا يظهر للزبائن. تواصل مع الإدارة لتجديده.</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => canEdit() && setShowSettings(true)} className="btn btn-secondary">
            <Settings size={18} className="shrink-0" />
            <span>إعدادات المتجر</span>
          </button>
          {restaurant && (
            <a href={getMainDomainMenuUrl(restaurant.slug)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <ExternalLink size={18} className="shrink-0" />
              <span>صفحة متجري</span>
            </a>
          )}
          <button onClick={() => setShowQr(true)} className="btn btn-secondary">
            <QrCode size={18} className="shrink-0" />
            <span>رمز QR</span>
          </button>
          <InstallAppButton variant="tile" appName="لوحة الشريك" label="ثبّت التطبيق" />
        </div>

        <StoreStats restaurantId={id} />

        <TemporaryChanges store={store} />

        <div role="tablist" className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 py-1">
          {tabs.map(item => (
            <button
              key={item.key}
              role="tab"
              aria-selected={tab === item.key}
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
              className="chip flex-1"
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'items' && <ItemsTab store={store} onGoToCategories={() => setTab('categories')} />}
        {tab === 'offers' && !isSupermarket && <OffersTab store={store} />}
        {tab === 'categories' && <CategoriesTab store={store} />}
        {tab === 'delivery' && <DeliveryTab store={store} />}
      </main>

      {showSettings && restaurant && (
        <StoreSettingsModal restaurant={restaurant} isOpen onClose={() => setShowSettings(false)} onSaveSuccess={refresh} />
      )}
      {showQr && restaurant && <StoreQrModal isOpen onClose={() => setShowQr(false)} restaurant={restaurant} />}
    </div>
  )
}
