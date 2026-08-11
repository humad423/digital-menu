'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  BarChart3, 
  Smartphone, 
  Eye, 
  MousePointerClick, 
  Globe, 
  Sparkles, 
  Loader2, 
  Store,
  Share2,
  Calendar,
  Clock,
  UserCheck,
  UserPlus,
  Users,
  Filter,
  RefreshCw,
  Repeat
} from 'lucide-react'

export default function AdminAnalyticsTab({ restaurants = [] }: { restaurants?: any[] }) {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<any[]>([])

  // Filter States
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom'>('7days')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all')

  const supabase = createClient()

  const fetchAnalytics = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('analytics_events')
      .select('id, event_type, store_id, store_slug, ad_id, referrer, utm_source, device_type, visitor_id, session_id, session_duration_seconds, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (data) setEvents(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // ── Date & Store Filtering Logic ─────────────────────────────
  const filteredEvents = useMemo(() => {
    if (!events.length) return []

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000)
    const sevenDaysAgo = todayStart - (6 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = todayStart - (29 * 24 * 60 * 60 * 1000)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    return events.filter(e => {
      // Store filter
      if (selectedStoreId !== 'all' && e.store_id !== selectedStoreId) {
        return false
      }

      // Date filter
      const eventTime = new Date(e.created_at).getTime()
      if (isNaN(eventTime)) return true

      if (datePreset === 'today') {
        return eventTime >= todayStart
      } else if (datePreset === 'yesterday') {
        return eventTime >= yesterdayStart && eventTime < todayStart
      } else if (datePreset === '7days') {
        return eventTime >= sevenDaysAgo
      } else if (datePreset === '30days') {
        return eventTime >= thirtyDaysAgo
      } else if (datePreset === 'this_month') {
        return eventTime >= startOfCurrentMonth
      } else if (datePreset === 'custom') {
        if (customStartDate) {
          const startMs = new Date(customStartDate + 'T00:00:00').getTime()
          if (eventTime < startMs) return false
        }
        if (customEndDate) {
          const endMs = new Date(customEndDate + 'T23:59:59').getTime()
          if (eventTime > endMs) return false
        }
        return true
      }

      return true // 'all'
    })
  }, [events, datePreset, customStartDate, customEndDate, selectedStoreId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 size={32} className="animate-spin text-orange-500" />
        <span className="font-bold text-sm">جاري تحميل وتمرير البيانات الإحصائية...</span>
      </div>
    )
  }

  // ── Metrics Calculation ──────────────────────────────────────
  const pwaInstalls = filteredEvents.filter(e => e.event_type === 'pwa_install').length
  const menuViews   = filteredEvents.filter(e => e.event_type === 'menu_view').length
  const adClicks    = filteredEvents.filter(e => e.event_type === 'ad_click').length
  const pageViews   = filteredEvents.filter(e => e.event_type === 'page_view').length

  // Visitor Repeat & Loyalty Analysis (Using visitor_id or user_agent fallback)
  const visitorStats = (() => {
    const visitorMap: Record<string, { count: number; events: any[] }> = {}

    filteredEvents.forEach(e => {
      // Key: visitor_id if present, else user_agent
      const key = e.visitor_id || (e.user_agent ? `ua_${e.user_agent.slice(0, 40)}` : 'anon')
      if (!visitorMap[key]) {
        visitorMap[key] = { count: 0, events: [] }
      }
      visitorMap[key].count += 1
      visitorMap[key].events.push(e)
    })

    const totalUniqueVisitors = Object.keys(visitorMap).length
    let repeatVisitorsCount = 0
    let newVisitorsCount = 0

    Object.values(visitorMap).forEach(v => {
      // Classified as repeat if they have multiple events or visits
      if (v.count > 1) {
        repeatVisitorsCount += 1
      } else {
        newVisitorsCount += 1
      }
    })

    const repeatRate = totalUniqueVisitors > 0
      ? Math.round((repeatVisitorsCount / totalUniqueVisitors) * 100)
      : 0

    return {
      totalUniqueVisitors,
      repeatVisitorsCount,
      newVisitorsCount,
      repeatRate,
      visitorMap
    }
  })()

  // Duration & Session Time Calculations
  const durationStats = (() => {
    const eventsWithDuration = filteredEvents.filter(e => Number(e.session_duration_seconds) > 0)
    const totalDurationSeconds = eventsWithDuration.reduce((acc, e) => acc + Number(e.session_duration_seconds), 0)
    
    // Average session duration in seconds
    const avgDurationSeconds = eventsWithDuration.length > 0
      ? Math.round(totalDurationSeconds / eventsWithDuration.length)
      : 0

    const formatTime = (secs: number) => {
      if (secs <= 0) return '0 ثانية'
      const mins = Math.floor(secs / 60)
      const remainSecs = secs % 60
      if (mins === 0) return `${remainSecs} ثانية`
      if (remainSecs === 0) return `${mins} دقيقة`
      return `${mins} د ور ${remainSecs} ث`
    }

    // Average duration per store
    const storeDurations: Record<string, { totalSecs: number; count: number }> = {}
    eventsWithDuration.forEach(e => {
      if (e.store_id) {
        if (!storeDurations[e.store_id]) storeDurations[e.store_id] = { totalSecs: 0, count: 0 }
        storeDurations[e.store_id].totalSecs += Number(e.session_duration_seconds)
        storeDurations[e.store_id].count += 1
      }
    })

    return {
      avgDurationSeconds,
      avgDurationFormatted: formatTime(avgDurationSeconds),
      totalDurationFormatted: formatTime(totalDurationSeconds),
      storeDurations,
      formatTime
    }
  })()

  // Stores lookup map
  const storeMap = new Map(restaurants.map(r => [r.id, r]))

  // Aggregate menu views and time per store
  const storeMetricsMap: Record<string, { views: number; totalSecs: number; durationCount: number }> = {}
  filteredEvents.filter(e => e.store_id).forEach(e => {
    if (!storeMetricsMap[e.store_id]) {
      storeMetricsMap[e.store_id] = { views: 0, totalSecs: 0, durationCount: 0 }
    }
    if (e.event_type === 'menu_view') {
      storeMetricsMap[e.store_id].views += 1
    }
    if (Number(e.session_duration_seconds) > 0) {
      storeMetricsMap[e.store_id].totalSecs += Number(e.session_duration_seconds)
      storeMetricsMap[e.store_id].durationCount += 1
    }
  })

  const topStores = Object.entries(storeMetricsMap)
    .map(([id, m]) => ({
      store: storeMap.get(id),
      views: m.views,
      avgDurationSecs: m.durationCount > 0 ? Math.round(m.totalSecs / m.durationCount) : 0
    }))
    .filter(x => x.store)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Traffic sources breakdown
  const sourcesCount: Record<string, number> = {}
  filteredEvents.forEach(e => {
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
  filteredEvents.forEach(e => {
    const dev = e.device_type || 'mobile'
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1
  })

  const totalFilteredCount = filteredEvents.length || 1

  return (
    <div className="space-y-6 dir-rtl animate-fade-in">
      
      {/* ── HEADER BADGE & CONTROLS ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-xl flex items-center gap-2 text-white">
            <BarChart3 className="text-orange-400" size={24} />
            <span>مركز تحليل النمو وسلوك الزوار 📊</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">
            متابعة دقيقة للزوار المكررين، مدد البقاء في الصفحة، ومصادر الحركات التفاعلية مع خيارات الفلترة الزمنية.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="self-start md:self-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className="text-orange-400" />
          <span>تحديث الإحصائيات 🔄</span>
        </button>
      </div>

      {/* ── FILTERING BAR (Date Presets + Custom Range + Store Filter) ── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1 ml-1">
              <Calendar size={15} className="text-orange-500" />
              <span>الفترة الزمنية:</span>
            </span>

            {[
              { key: '7days', label: 'آخر 7 أيام 📆' },
              { key: 'today', label: 'اليوم ☀️' },
              { key: 'yesterday', label: 'أمس ⏪' },
              { key: '30days', label: 'آخر 30 يوماً 🗓️' },
              { key: 'this_month', label: 'هذا الشهر 📅' },
              { key: 'all', label: 'كل الأوقات ⚡' },
              { key: 'custom', label: 'تحديد مخصص ⚙️' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 border ${
                  datePreset === p.key
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filter by Store Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedStoreId}
              onChange={e => setSelectedStoreId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black px-3 py-1.5 rounded-xl outline-none cursor-pointer hover:border-slate-300"
            >
              <option value="all">جميع المتاجر ({restaurants.length})</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Custom Date Inputs if Custom Selected */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3 flex-wrap text-xs animate-slide-down">
            <span className="font-bold text-slate-500">من تاريخ:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
            />
            <span className="font-bold text-slate-500">إلى تاريخ:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
            />
            <span className="text-[11px] text-slate-400 font-medium">({filteredEvents.length} سجل مطابق)</span>
          </div>
        )}
      </div>

      {/* ── METRIC CARDS GRID ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* 1. Menu Views */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Eye size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">زيارات المنيو 🍔</span>
            <span className="text-2xl font-black text-slate-900">{menuViews}</span>
          </div>
        </div>

        {/* 2. PWA Installs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <Smartphone size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">تثبيتات التطبيق 📲</span>
            <span className="text-2xl font-black text-slate-900">{pwaInstalls}</span>
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

      {/* ── ADVANCED SECTION 1: REPEAT VISITORS & SESSION DURATION ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Repeat / Returning Visitors Analysis */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600" size={20} />
              <span>تحليل الزوار الجدد والمكررين 🔄</span>
            </h3>
            <span className="text-xs font-black bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
              نسبة التكرار: %{visitorStats.repeatRate}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي الزوار</span>
              <span className="text-lg font-black text-slate-900">{visitorStats.totalUniqueVisitors}</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-center">
              <span className="text-[10px] text-emerald-700 font-bold block mb-1 flex items-center justify-center gap-0.5">
                <UserPlus size={12} /> زوار جدد
              </span>
              <span className="text-lg font-black text-emerald-800">{visitorStats.newVisitorsCount}</span>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-2xl text-center">
              <span className="text-[10px] text-indigo-700 font-bold block mb-1 flex items-center justify-center gap-0.5">
                <Repeat size={12} /> مكررو الزيارة
              </span>
              <span className="text-lg font-black text-indigo-900">{visitorStats.repeatVisitorsCount}</span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>زوار مكررين (%{visitorStats.repeatRate})</span>
              <span>زوار جدد (%{100 - visitorStats.repeatRate})</span>
            </div>
            <div className="w-full h-3 bg-emerald-100 rounded-full overflow-hidden flex dir-ltr">
              <div
                className="bg-indigo-600 h-full transition-all duration-500"
                style={{ width: `${visitorStats.repeatRate}%` }}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${100 - visitorStats.repeatRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Average Time Spent / Session Duration */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Clock className="text-amber-500" size={20} />
              <span>مدد البقاء والتصفح في المنيو ⏱️</span>
            </h3>
            <span className="text-xs font-black bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">
              متوسط التصفح: {durationStats.avgDurationFormatted}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                ⌛
              </div>
              <div>
                <span className="text-[11px] text-amber-900 font-bold block">متوسط وقت البقاء</span>
                <span className="text-base font-black text-amber-950">{durationStats.avgDurationFormatted}</span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                🌐
              </div>
              <div>
                <span className="text-[11px] text-blue-900 font-bold block">إجمالي وقت التصفح</span>
                <span className="text-base font-black text-blue-950">{durationStats.totalDurationFormatted}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            ℹ️ يتم احتساب وقت البقاء تلقائياً في الخلفية أثناء قيام الزبائن باستعراض الوجبات والأقسام في المنيو.
          </p>
        </div>

      </div>

      {/* ── TWO COLUMN LAYOUT: Top Stores & Traffic Sources ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Column 1: Most Viewed Stores */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="text-orange-500" size={18} />
            <span>المتاجر والمنيوهات الأكثر زيارة وبقاءً 🔥</span>
          </h3>

          {topStores.length === 0 ? (
            <p className="text-xs text-slate-400 font-bold py-6 text-center">لا توجد زيارات مسجلة حتى الآن للفترة المحددة.</p>
          ) : (
            <div className="space-y-3">
              {topStores.map(({ store, views, avgDurationSecs }, index) => {
                const percentage = Math.round((views / (menuViews || 1)) * 100)
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
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block truncate">{store.name}</span>
                        {avgDurationSecs > 0 && (
                          <span className="text-[10px] text-amber-600 font-bold block">
                            ⏱️ متوسط البقاء: {durationStats.formatTime(avgDurationSecs)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                        <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                      <span className="font-black text-slate-900 text-left">{views} زيارة</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column 2: Traffic Sources */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Share2 className="text-blue-500" size={18} />
            <span>مصادر الزيارات والعملاء 🔗</span>
          </h3>

          <div className="space-y-3">
            {Object.entries(sourcesCount)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => {
                const pct = Math.round((count / totalFilteredCount) * 100)
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
              <span className="font-black text-slate-900">{Math.round((deviceCounts.mobile / totalFilteredCount) * 100)}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[11px] text-slate-400">💻 الكمبيوتر</span>
              <span className="font-black text-slate-900">{Math.round((deviceCounts.desktop / totalFilteredCount) * 100)}%</span>
            </div>
            <div className="text-center">
              <span className="block text-[11px] text-slate-400">الأجهزة اللوحية</span>
              <span className="font-black text-slate-900">{Math.round((deviceCounts.tablet / totalFilteredCount) * 100)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── RECENT LIVE ACTIVITY STREAM ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="text-amber-500" size={18} />
          <span>سجل الزيارات والنشاط اللحظي ⚡</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="data-table text-xs">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>نوع الحدث</th>
                <th>المتجر</th>
                <th>نوع الزائر</th>
                <th>المصدر</th>
                <th>الجهاز</th>
                <th>مدة البقاء</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.slice(0, 15).map(e => {
                const store = storeMap.get(e.store_id)
                const isRepeat = e.visitor_id && visitorStats.visitorMap[e.visitor_id]?.count > 1
                return (
                  <tr key={e.id}>
                    <td className="text-slate-400 font-mono">
                      {new Date(e.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${
                        e.event_type === 'pwa_install' ? 'bg-orange-100 text-orange-700' :
                        e.event_type === 'menu_view' ? 'bg-emerald-100 text-emerald-700' :
                        e.event_type === 'ad_click' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {e.event_type === 'pwa_install' ? 'تثبيت تطبيق 📲' :
                         e.event_type === 'menu_view' ? 'زيارة منيو 🍔' :
                         e.event_type === 'ad_click' ? 'نقر إعلان 🎯' : 'تصفح 🌐'}
                      </span>
                    </td>
                    <td className="font-bold text-slate-800">{store?.name || e.store_slug || '-'}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        isRepeat ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isRepeat ? 'زائر مكرر 🔄' : 'زائر جديد ✨'}
                      </span>
                    </td>
                    <td className="text-slate-600 font-bold">{sourceLabels[e.utm_source] || e.utm_source || 'direct'}</td>
                    <td className="text-slate-500 font-medium">{e.device_type || 'mobile'}</td>
                    <td className="font-mono text-slate-700 font-bold">
                      {e.session_duration_seconds > 0 ? durationStats.formatTime(e.session_duration_seconds) : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
