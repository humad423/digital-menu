'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, 
  Smartphone, 
  Eye, 
  MousePointerClick, 
  Globe, 
  TrendingUp, 
  Sparkles, 
  Loader2, 
  Store,
  Share2
} from 'lucide-react'

export default function AdminAnalyticsTab({ restaurants = [] }: { restaurants?: any[] }) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      const { data } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000)

      if (data) setEvents(data)
      setLoading(false)
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 size={32} className="animate-spin text-orange-500" />
        <span className="font-bold text-sm">جاري تحميل إحصائيات المنصة...</span>
      </div>
    )
  }

  // Calculate metrics
  const pwaInstalls = events.filter(e => e.event_type === 'pwa_install').length
  const menuViews   = events.filter(e => e.event_type === 'menu_view').length
  const adClicks    = events.filter(e => e.event_type === 'ad_click').length
  const pageViews   = events.filter(e => e.event_type === 'page_view').length

  // Stores lookup map
  const storeMap = new Map(restaurants.map(r => [r.id, r]))

  // Aggregate menu views per store
  const storeViewCounts: Record<string, number> = {}
  events.filter(e => e.event_type === 'menu_view' && e.store_id).forEach(e => {
    storeViewCounts[e.store_id] = (storeViewCounts[e.store_id] || 0) + 1
  })

  const topStores = Object.entries(storeViewCounts)
    .map(([id, count]) => ({
      store: storeMap.get(id),
      count
    }))
    .filter(x => x.store)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Traffic sources breakdown
  const sourcesCount: Record<string, number> = {}
  events.forEach(e => {
    const src = e.utm_source || 'direct'
    sourcesCount[src] = (sourcesCount[src] || 0) + 1
  })

  const sourceLabels: Record<string, string> = {
    whatsapp: 'واتساب WhatsApp 💬',
    instagram: 'إنستغرام Instagram 📸',
    facebook: 'فيسبوك Facebook 📘',
    google: 'بحث جوجل Google 🔍',
    tiktok: 'تيك توك TikTok 🎵',
    direct: 'رابط مباشر Direct 🔗',
    referral: 'مواقع أخرى Referral 🌐'
  }

  // Device breakdown
  const deviceCounts: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 }
  events.forEach(e => {
    const dev = e.device_type || 'mobile'
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1
  })

  const totalEventsCount = events.length || 1

  return (
    <div className="space-y-6 dir-rtl animate-fade-in">
      
      {/* ── HEADER BADGE ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 border border-slate-700/80 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-xl flex items-center gap-2 text-white">
            <BarChart3 className="text-orange-400" size={24} />
            <span>إحصائيات النمو والأداء 📊</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">
            متابعة دقيقة ولحظية لتثبيتات التطبيق، زيارات المنيو، ونشاط الزوار عبر جميع القنوات.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-4 py-2 rounded-2xl text-xs font-black text-amber-400">
          <Sparkles size={16} />
          <span>تتبع حي وسريع (0% تأثير على السرعة)</span>
        </div>
      </div>

      {/* ── METRIC CARDS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* 1. PWA Installs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <Smartphone size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">تثبيتات التطبيق 📲</span>
            <span className="text-2xl font-black text-slate-900">{pwaInstalls}</span>
          </div>
        </div>

        {/* 2. Menu Views */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">زيارات المنيو 🍔</span>
            <span className="text-2xl font-black text-slate-900">{menuViews}</span>
          </div>
        </div>

        {/* 3. Slider Ad Clicks */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <MousePointerClick size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">نقرات الإعلانات 🎯</span>
            <span className="text-2xl font-black text-slate-900">{adClicks}</span>
          </div>
        </div>

        {/* 4. Total Page Views */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Globe size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">إجمالي تصفح المنصة 🌐</span>
            <span className="text-2xl font-black text-slate-900">{pageViews}</span>
          </div>
        </div>

      </div>

      {/* ── TWO COLUMN LAYOUT: Top Stores & Traffic Sources ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Column 1: Most Viewed Stores */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="text-orange-500" size={18} />
            <span>المتاجر والمنيوهات الأكثر زيارة 🔥</span>
          </h3>

          {topStores.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-6 text-center">لا توجد زيارات مسجلة حتى الآن.</p>
          ) : (
            <div className="space-y-3">
              {topStores.map(({ store, count }, index) => {
                const percentage = Math.round((count / (menuViews || 1)) * 100)
                return (
                  <div key={store.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-black text-slate-600 flex items-center justify-center shrink-0 text-[10px]">
                        {index + 1}
                      </span>
                      {store.logo_url ? (
                        <img src={store.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 font-black flex items-center justify-center shrink-0 text-[10px]">
                          🏪
                        </div>
                      )}
                      <span className="font-bold text-slate-800 truncate">{store.name}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="font-black text-slate-900 w-10 text-left">{count} زيارة</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column 2: Traffic Sources */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Share2 className="text-blue-500" size={18} />
            <span>مصادر الزيارات والعملاء 🔗</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(sourcesCount)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => {
                const pct = Math.round((count / totalEventsCount) * 100)
                return (
                  <div key={src} className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{sourceLabels[src] || src}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">{pct}%</span>
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-900 font-black">{count}</span>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Device breakdown Footer */}
          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-around text-xs font-bold text-slate-600">
            <div className="text-center">
              <span className="block text-[11px] text-slate-400">📱 الهواتف</span>
              <span className="font-black text-slate-900">{Math.round((deviceCounts.mobile / totalEventsCount) * 100)}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[11px] text-slate-400">💻 الكمبيوتر</span>
              <span className="font-black text-slate-900">{Math.round((deviceCounts.desktop / totalEventsCount) * 100)}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[11px] text-slate-400">الأجهزة اللوحية</span>
              <span className="font-black text-slate-900">{Math.round((deviceCounts.tablet / totalEventsCount) * 100)}%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
