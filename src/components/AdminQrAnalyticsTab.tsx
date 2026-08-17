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
  BarChart3
} from 'lucide-react'
import { getMainDomainMenuUrl } from '@/utils/url'

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
        const lastScan = scans.find(s => s.restaurant_id === r.id)?.created_at || null
        return {
          ...r,
          scanCount: count,
          percentage: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0,
          lastScan,
        }
      })
      .sort((a, b) => b.scanCount - a.scanCount)

    return {
      totalScans,
      mobileCount,
      tabletCount,
      desktopCount,
      topStore,
      maxScans,
      storeBreakdown,
      dailyMap,
    }
  }, [scans, restaurants, restaurantMap])

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

        {/* Active Stores Ratio */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-slate-400">المتاجر التي تم مسحها</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Store size={18} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none mb-1">
              {loading ? '...' : stats.storeBreakdown.filter(s => s.scanCount > 0).length}
            </h3>
            <p className="text-[11px] font-bold text-purple-600">
              من أصل {restaurants.length} متجر مسجل
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
          {chartDays.map((d, i) => {
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
              <span>ترتيب المتاجر حسب مسحات الـ QR</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">{restaurants.length} متجر</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black text-slate-400">
                  <th className="py-2.5 px-3">المتجر</th>
                  <th className="py-2.5 px-3 text-center">عدد المسحات</th>
                  <th className="py-2.5 px-3 text-center">النسبة</th>
                  <th className="py-2.5 px-3">آخر مسح</th>
                  <th className="py-2.5 px-3 text-center">معاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {stats.storeBreakdown.slice(0, 15).map(r => (
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

                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl">
                        {r.scanCount}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
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

    </div>
  )
}
