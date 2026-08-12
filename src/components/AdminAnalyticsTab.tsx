'use client'

import { 
  BarChart3, 
  ExternalLink, 
  CheckCircle2, 
  Zap, 
  Smartphone, 
  Eye, 
  ShoppingBag, 
  Globe, 
  ShieldCheck, 
  Sparkles,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react'

export default function AdminAnalyticsTab({ restaurants = [] }: { restaurants?: any[] }) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-24MTPCGDE7'

  return (
    <div className="space-y-6 dir-rtl animate-fade-in">
      
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black px-3 py-1 rounded-full">
            <CheckCircle2 size={14} />
            <span>متصل ومربوط بـ Google Analytics 4 بنجاح</span>
          </div>
          <h2 className="font-black text-2xl text-white flex items-center gap-2.5">
            <BarChart3 className="text-orange-400" size={28} />
            <span>مركز تحليلات جوجل أناليتكس M-GA4 📊</span>
          </h2>
          <p className="text-xs text-slate-300 font-medium max-w-xl leading-relaxed">
            تم تحويل كافة إحصائيات المنصة (الزيارات، تثبيتات التطبيق، طلبات الواتساب، والتصفح) بالكامل إلى Google Analytics 4 لتوفير استهلاك السيرفرات وقواعد البيانات 100%.
          </p>
        </div>

        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 px-5 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition cursor-pointer active:scale-95 shrink-0 border border-orange-400/30"
        >
          <span>فتح لوحة Google Analytics المباشرة</span>
          <ArrowUpRight size={16} />
        </a>
      </div>

      {/* ── GA4 STATUS & SAVINGS STATS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-0.5">معرّف التتبع النشط GA4</span>
            <span className="text-base font-black font-mono text-slate-900">{measurementId}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-0.5">تأثير الاستهلاك على Supabase</span>
            <span className="text-base font-black text-emerald-600">0 MB (استهلاك صفري ✅)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-0.5">سعة استقبال الزوار</span>
            <span className="text-base font-black text-blue-900">غير محدودة (مجاني 100%)</span>
          </div>
        </div>

      </div>

      {/* ── GA4 FEATURES EXPLANATION CARDS ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-5">
        <h3 className="font-black text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sparkles className="text-amber-500" size={20} />
          <span>أين تجد الإحصائيات داخل لوحة Google Analytics؟ 📍</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Feature 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Eye size={16} />
              </div>
              <span>1. الزيارات اللحظية وتصفح المتاجر (`menu_view`)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pr-9">
              تظهر في لوحة جوجل تحت قسم <strong>Realtime (الوقت الفعلي)</strong> و قسم <strong>Pages and screens</strong> حيث ستشاهد أسماء المتاجر والمسارات الأكثر زيارة.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <Smartphone size={16} />
              </div>
              <span>2. تثبيتات التطبيقات (`pwa_install`)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pr-9">
              يتم تتبع أي زبون يقوم بتثبيت تطبيق المنيو كـ PWA وتظهر الإحصائية تحت حدث <strong>Events ➔ pwa_install</strong>.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShoppingBag size={16} />
              </div>
              <span>3. إضافة الوجبات والطلبات (`add_to_cart` & `generate_lead`)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pr-9">
              يتم تسجيل الوجبات المضافة للسلة والطلبات المحولة للواتساب تحت قسم <strong>Monetization ➔ E-commerce purchases</strong> في لوحة جوجل.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Globe size={16} />
              </div>
              <span>4. الخريطة الجغرافية ومصادر الدخول (Geo & Tech)</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pr-9">
              تظهر كافة الدول والمدن وأنواع الأجهزة ومصادر الدخول (واتساب، إنستغرام، فيسبوك) تحت تبويبات <strong>User Attributes</strong> و <strong>Tech</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* ── ACTION BUTTON CARD ── */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-right">
          <h4 className="font-black text-sm text-orange-950">هل ترغب في استعراض التحليلات والتقارير الآن؟</h4>
          <p className="text-xs text-orange-800 font-medium">انقر على الزر أدناه للانتقال المباشر إلى لوحة حسابك الرسمية في Google Analytics.</p>
        </div>

        <a
          href="https://analytics.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl inline-flex items-center gap-2 transition cursor-pointer active:scale-95 shrink-0 shadow-md"
        >
          <span>الانتقال إلى Google Analytics 📊</span>
          <ExternalLink size={14} />
        </a>
      </div>

    </div>
  )
}
