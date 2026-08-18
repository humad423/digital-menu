'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  QrCode, 
  Calendar, 
  TrendingUp, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Store, 
  Filter, 
  RefreshCw, 
  Download, 
  Clock, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  BarChart3,
  Flame,
  Check,
  X
} from 'lucide-react'
import { getMainDomainMenuUrl } from '@/utils/url'
import { 
  parseRestaurantMultiplier, 
  encodeRestaurantMultiplier, 
  getEffectiveVisits, 
  MULTIPLIER_PRESETS 
} from '@/utils/visitsHelper'

interface AdminQrAnalyticsTabProps {
  restaurants: any[]
}

type PeriodType = 'today' | '7d' | '30d' | 'month' | 'all' | 'custom'

export default function AdminQrAnalyticsTab({ restaurants }: AdminQrAnalyticsTabProps) {
  const [period, setPeriod] = useState<PeriodType>('7d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<any[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Multiplier editing state
  const [activeModalStore, setActiveModalStore] = useState<any | null>(null)
  const [selectedMultiplier, setSelectedMultiplier] = useState<number>(1)
  const [customMultiplierInput, setCustomMultiplierInput] = useState<string>('1')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [savingMultiplier, setSavingMultiplier] = useState(false)

  const supabase = createClient()

  // Compute start and end timestamps based on selected period
  const dateRange = useMemo(() => {
    const now = new Date()
    let start: Date | null = null
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    if (period === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    } else if (period === '7d') {
      start = new Date()
      start.setDate(now.getDate() - 6)
      start.setHours(0, 0, 0, 0)
    } else if (period === '30d') {
      start = new Date()
      start.setDate(now.getDate() - 29)
      start.setHours(0, 0, 0, 0)
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    } else if (period === 'custom') {
      if (startDate) {
        start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
      }
      if (endDate) {
        end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
      }
    } else {
      start = null // All time
    }

    return { start, end }
  }, [period, startDate, endDate])

  // Fetch scans from Supabase
  useEffect(() => {
    async function fetchScans() {
      try {
        setLoading(true)
        let query = supabase
          .from('qr_scans')
          .select('id, restaurant_id, source, device_type, created_at, user_agent')
          .order('created_at', { ascending: false })

        if (dateRange.start) {
          query = query.gte('created_at', dateRange.start.toISOString())
        }
        if (dateRange.end && period !== 'all') {
          query = query.lte('created_at', dateRange.end.toISOString())
        }
        if (selectedRestaurantId !== 'all') {
          query = query.eq('restaurant_id', selectedRestaurantId)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching QR scans:', error)
          setScans([])
        } else {
          setScans(data || [])
        }
      } catch (err) {
        console.error('Fetch scans error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchScans()
  }, [dateRange, selectedRestaurantId, refreshTrigger])

  // Map restaurant lookup
  const restaurantMap = useMemo(() => {
    const map = new Map<string, any>()
    restaurants.forEach(r => map.set(r.id, r))
    return map
  }, [restaurants])

  // Aggregated Statistics
  const stats = useMemo(() => {
    const totalScans = scans.length

    // Devices count
    let mobileCount = 0
    let tabletCount = 0
    let desktopCount = 0

    // Store counts
    const storeCountMap: Record<string, number> = {}

    // Daily distribution map
    const dailyMap: Record<string, number> = {}

    // Today's date string (YYYY-MM-DD)
    const todayDateStr = new Date().toISOString().slice(0, 10)
    const todayCountMap: Record<string, number> = {}
    let todayTotalScans = 0

    scans.forEach(s => {
      // Device
      if (s.device_type === 'mobile') mobileCount++
      else if (s.device_type === 'tablet') tabletCount++
      else desktopCount++

      // Store
      storeCountMap[s.restaurant_id] = (storeCountMap[s.restaurant_id] || 0) + 1

      // Day (YYYY-MM-DD)
      const dayKey = s.created_at ? s.created_at.slice(0, 10) : 'unknown'
      dailyMap[dayKey] = (dailyMap[dayKey] || 0) + 1

      if (dayKey === todayDateStr) {
        todayCountMap[s.restaurant_id] = (todayCountMap[s.restaurant_id] || 0) + 1
        todayTotalScans++
      }
    })

    // Top Store
    let topStoreId: string | null = null
    let maxScans = 0
    Object.entries(storeCountMap).forEach(([rid, count]) => {
      if (count > maxScans) {
        maxScans = count
        topStoreId = rid
      }
    })

    const topStore = topStoreId ? restaurantMap.get(topStoreId) : null

    // Store breakdown list sorted by scans count
    const storeBreakdown = restaurants
      .map(r => {
        const count = storeCountMap[r.id] || 0
        const todayReal = todayCountMap[r.id] || 0
        const { multiplier, note } = parseRestaurantMultiplier(r.subscription_notes)
        const todayBoosted = getEffectiveVisits(todayReal, multiplier)
        const totalBoosted = getEffectiveVisits(count, multiplier)
        const lastScan = scans.find(s => s.restaurant_id === r.id)?.created_at || null
        return {
          ...r,
          scanCount: count,
          todayReal,
          todayBoosted,
          multiplier,
          note,
          totalBoosted,
          percentage: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0,
          lastScan,
        }
      })
      .sort((a, b) => b.scanCount - a.scanCount)

    return {
      totalScans,
      todayTotalScans,
      mobileCount,
      tabletCount,
      desktopCount,
      topStore,
      maxScans,
      storeBreakdown,
      dailyMap,
    }
  }, [scans, restaurants, restaurantMap])

  const openMultiplierModal = (store: any) => {
    setActiveModalStore(store)
    const { multiplier } = parseRestaurantMultiplier(store.subscription_notes)
    setSelectedMultiplier(multiplier)
    setCustomMultiplierInput(multiplier.toString())
    const isPreset = MULTIPLIER_PRESETS.some(p => p.value === multiplier)
    setIsCustomMode(!isPreset)
  }

  const handleSaveMultiplier = async () => {
    if (!activeModalStore) return
    const finalMult = isCustomMode 
      ? Math.max(1, parseFloat(customMultiplierInput) || 1)
      : selectedMultiplier

    try {
      setSavingMultiplier(true)
      const { note } = parseRestaurantMultiplier(activeModalStore.subscription_notes)
      const encoded = encodeRestaurantMultiplier(note, finalMult)

      const { error } = await supabase
        .from('restaurants')
        .update({ subscription_notes: encoded })
        .eq('id', activeModalStore.id)

      if (error) {
        alert('خطأ في حفظ المضاعف: ' + error.message)
      } else {
        // Mutate in local array
        activeModalStore.subscription_notes = encoded
        const matched = restaurants.find(r => r.id === activeModalStore.id)
        if (matched) matched.subscription_notes = encoded
        setRefreshTrigger(prev => prev + 1)
        setActiveModalStore(null)
      }
    } catch (err: any) {
      alert('خطأ: ' + err?.message)
    } finally {
      setSavingMultiplier(false)
    }
  }

  // Daily Chart Days
  const chartDays = useMemo(() => {
    const days: { dateStr: string; label: string; count: number }[] = []
    const numDays = period === 'today' ? 1 : (period === '7d' ? 7 : (period === '30d' ? 14 : 7))
    const now = new Date()

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(now.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' })
      days.push({
        dateStr: iso,
        label,
        count: stats.dailyMap[iso] || 0,
      })
    }
    return days
  }, [period, stats.dailyMap])

  const maxDailyCount = Math.max(...chartDays.map(d => d.count), 1)

  // Export to CSV
  const handleExportCsv = () => {
    if (scans.length === 0) return

    const headers = ['ID', 'المتجر', 'نوع الجهاز', 'التاريخ والوقت', 'معرف المتجر']
    const rows = scans.map(s => {
      const r = restaurantMap.get(s.restaurant_id)
      return [
        s.id,
        r ? `"${r.name}"` : 'غير معروف',
        s.device_type || 'mobile',
        new Date(s.created_at).toLocaleString('ar-EG'),
        s.restaurant_id,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `QR_Scans_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* ── Top Filter & Header Bar ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Header Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <QrCode size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>إحصائيات وتحليلات الـ QR</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  تتبع مباشر ⚡
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">متابعة دقيقة لعدد الزبائن الذين دخلوا وتصفحوا المنيو عبر مسح الـ QR</p>
            </div>
          </div>

          {/* Quick Actions (Refresh & Export) */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تحديث البيانات"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={scans.length === 0}
              className="px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-2xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تصدير تقرير المسحات إلى ملف Excel/CSV"
            >
              <Download size={14} />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Controls Row */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {[
              { key: 'today', label: 'اليوم' },
              { key: '7d', label: 'آخر 7 أيام' },
              { key: '30d', label: 'آخر 30 يوماً' },
              { key: 'month', label: 'هذا الشهر' },
              { key: 'all', label: 'كل الأوقات' },
              { key: 'custom', label: 'فترة مخصصة 📅' },
            ].map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key as PeriodType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer shrink-0 ${
                  period === p.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Store Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-black text-slate-500 shrink-0 flex items-center gap-1">
              <Store size={14} className="text-orange-500" />
              <span>المتجر:</span>
            </label>
            <select
              value={selectedRestaurantId}
              onChange={e => setSelectedRestaurantId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-orange-500 cursor-pointer min-w-[180px]"
            >
              <option value="all">جميع المتاجر ({restaurants.length})</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Custom Date Range Picker Input Row */}
        {period === 'custom' && (
          <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-950">من تاريخ:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-white border border-orange-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-950">إلى تاريخ:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-white border border-orange-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              />
            </div>
          </div>
        )}

      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Scans */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400">إجمالي عمليات المسح</span>
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <QrCode size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mb-1">
              {loading ? '...' : stats.totalScans}
            </h3>
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>{period === 'today' ? 'مسحات اليوم' : 'ضمن الفترة المختارة'}</span>
            </p>
          </div>
        </div>

        {/* Today's Real Visits */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400">زيارات اليوم (المنصة ككل)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mb-1">
              {loading ? '...' : stats.todayTotalScans}
            </h3>
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>تحديث مباشر لليوم ⚡</span>
            </p>
          </div>
        </div>

        {/* Top Store */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400">المتجر الأكثر مسحاً</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 truncate leading-snug mb-1">
              {loading ? '...' : (stats.topStore?.name || 'لا يوجد بيانات')}
            </h3>
            <p className="text-[11px] font-bold text-amber-600">
              {stats.maxScans > 0 ? `${stats.maxScans} عملية مسح` : 'لا توجد مسحات'}
            </p>
          </div>
        </div>

        {/* Mobile Visitors Percentage */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400">زوار الهواتف المحمولة</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mb-1">
              {loading ? '...' : (stats.totalScans > 0 ? `${Math.round((stats.mobileCount / stats.totalScans) * 100)}%` : '0%')}
            </h3>
            <p className="text-[11px] font-bold text-slate-400">
              {stats.mobileCount} هاتف • {stats.desktopCount} كمبيوتر
            </p>
          </div>
        </div>

      </div>

      {/* ── Visual Trend Chart ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BarChart3 size={16} className="text-orange-500" />
            <span>حركة المسحات اليومية (Daily Trend)</span>
          </h3>
          <span className="text-xs text-slate-400 font-bold">تحديث تلقائي</span>
        </div>

        {/* Bar Chart Representation */}
        <div className="flex items-end gap-2 sm:gap-3 h-40 pt-4 px-2 border-b border-slate-100">
          {chartDays.map((d) => {
            const heightPercent = Math.max(Math.round((d.count / maxDailyCount) * 100), 4)
            return (
              <div key={d.dateStr} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <span className="text-[10px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition">
                  {d.count}
                </span>
                <div
                  className="w-full rounded-xl bg-gradient-to-t from-orange-500 to-amber-400 group-hover:from-orange-600 group-hover:to-amber-500 transition-all duration-300 min-h-[6px]"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate max-w-full text-center mt-1">
                  {d.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main Two Columns: Store Table & Live Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Store Performance Breakdown Table (Col 2) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Store size={16} className="text-orange-500" />
              <span>ترتيب المتاجر وتحكم مضاعف الزيارات</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">{restaurants.length} متجر</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400">
                  <th className="py-2.5 px-3">المتجر</th>
                  <th className="py-2.5 px-3 text-center">مسحات الفترة</th>
                  <th className="py-2.5 px-3 text-center">زيارات اليوم (الفعلي / للشريك)</th>
                  <th className="py-2.5 px-3 text-center">مضاعف التسويق 🚀</th>
                  <th className="py-2.5 px-3 text-center">النسبة</th>
                  <th className="py-2.5 px-3">آخر مسح</th>
                  <th className="py-2.5 px-3 text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {stats.storeBreakdown.slice(0, 25).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {r.logo_url ? (
                          <img src={r.logo_url} alt="" className="w-8 h-8 rounded-xl object-contain border border-slate-100 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0" style={{ background: r.primary_color || '#F97316' }}>
                            {r.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-black text-slate-900">{r.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{r.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Scan Count in selected period */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl">
                        {r.scanCount}
                      </span>
                    </td>

                    {/* Today's Visits: Real vs Boosted */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1">
                          <span className="text-emerald-600 font-black">{r.todayReal}</span>
                          <span className="text-slate-300 font-normal">/</span>
                          <span className="text-amber-600 font-black" title="الرقم الظاهر لصاحب المتجر">
                            {r.todayBoosted} 👁️
                          </span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {r.multiplier > 1 ? `(مضروب بـ ${r.multiplier}x)` : '(حقيقي)'}
                        </span>
                      </div>
                    </td>

                    {/* Marketing Multiplier Control Button */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => openMultiplierModal(r)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-black border transition cursor-pointer active:scale-95 flex items-center gap-1 mx-auto ${
                          r.multiplier > 1
                            ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-orange-700 border-orange-300 hover:border-orange-400 shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                        }`}
                        title="تعديل مضاعف الزيارات لهذا المتجر"
                      >
                        <Flame size={12} className={r.multiplier > 1 ? 'text-orange-500' : 'text-slate-400'} />
                        <span>×{r.multiplier}</span>
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-10 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${r.percentage}%` }} />
                        </div>
                        <span className="font-bold text-slate-600 text-[11px]">{r.percentage}%</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px] font-medium">
                      {r.lastScan ? (
                        <span className="flex items-center gap-1 text-slate-600 font-bold">
                          <Clock size={11} className="text-slate-400" />
                          {new Date(r.lastScan).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({new Date(r.lastScan).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-300">لم يُمسح بعد</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <a
                        href={getMainDomainMenuUrl(r.slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center transition"
                        title="فتح المنيو"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Scans Feed (Col 1) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles size={16} className="text-amber-500" />
              <span>آخر عمليات المسح الحية</span>
            </h3>
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live
            </span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {scans.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-bold">
                لا توجد عمليات مسح مسجلة في هذه الفترة
              </div>
            ) : (
              scans.slice(0, 20).map(s => {
                const r = restaurantMap.get(s.restaurant_id)
                return (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-100/70 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                        {s.device_type === 'desktop' ? <Monitor size={14} /> : (s.device_type === 'tablet' ? <Tablet size={14} /> : <Smartphone size={14} />)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-black text-xs text-slate-900 truncate">{r?.name || 'متجر'}</h4>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {s.device_type === 'desktop' ? 'حاسوب' : (s.device_type === 'tablet' ? 'جهاز لوحي' : 'هاتف ذكي')}
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <p className="text-[10px] font-black text-slate-700 dir-ltr">
                        {new Date(s.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold">
                        {new Date(s.created_at).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

      {/* ── Multiplier Control Modal ── */}
      {activeModalStore && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget && !savingMultiplier) setActiveModalStore(null)
          }}
        >
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-base shadow-sm">
                  🚀
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">مضاعف الزيارات للتسويق</h3>
                  <p className="text-[11px] text-slate-400 font-medium truncate max-w-[240px]">
                    {activeModalStore.name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => !savingMultiplier && setActiveModalStore(null)}
                disabled={savingMultiplier}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1">
                <p className="font-black flex items-center gap-1.5 text-amber-900">
                  <span>💡 كيف تعمل هذه الميزة؟</span>
                </p>
                <p className="font-medium text-[11px] leading-relaxed text-amber-800">
                  يتم ضرب عدد الزيارات الفعلية بالقيمة المحددة أدناه لتظهر في لوحة تحكم صاحب المتجر، بينما تظل الأرقام الحقيقية محفوظة ومتاحة لك كمسؤول بكل دقة.
                </p>
              </div>

              {/* Preset Multipliers */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-700">اختر المضاعف التسويقي:</label>
                <div className="grid grid-cols-3 gap-2">
                  {MULTIPLIER_PRESETS.map(p => {
                    const isSelected = !isCustomMode && selectedMultiplier === p.value
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setSelectedMultiplier(p.value)
                          setIsCustomMode(false)
                        }}
                        className={`p-2.5 rounded-2xl text-xs font-black border transition cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="text-sm font-black">{p.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Custom Multiplier Option */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700">أو حدد قيمة مخصصة:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={`text-[11px] font-bold underline cursor-pointer ${
                      isCustomMode ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    تفعيل القيمة المخصصة
                  </button>
                </div>

                {isCustomMode && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-sm font-black text-slate-700">×</span>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      value={customMultiplierInput}
                      onChange={e => setCustomMultiplierInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none focus:border-orange-500"
                      placeholder="مثال: 1.7 أو 4"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Box */}
              {(() => {
                const currentVal = isCustomMode
                  ? Math.max(1, parseFloat(customMultiplierInput) || 1)
                  : selectedMultiplier
                const sampleReal = 10
                const sampleBoosted = Math.round(sampleReal * currentVal)
                return (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                    <span className="font-bold text-slate-500 text-[11px]">معاينة حية للمتجر:</span>
                    <div className="flex items-center justify-between font-black text-slate-800">
                      <span>إذا كانت الزيارات الفعلية {sampleReal}</span>
                      <span className="text-orange-600 text-sm">ستظهر له: {sampleBoosted} زيارة 👁️</span>
                    </div>
                  </div>
                )
              })()}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSaveMultiplier}
                  disabled={savingMultiplier}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-2xl shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingMultiplier ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>حفظ المضاعف فوراً</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalStore(null)}
                  disabled={savingMultiplier}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-2xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

