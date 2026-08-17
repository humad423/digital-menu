'use client'

import { useState } from 'react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'
import { 
  Store, 
  ShoppingBag, 
  QrCode, 
  MessageSquare, 
  TrendingUp, 
  MapPin, 
  ShieldCheck, 
  Smartphone, 
  Sparkles, 
  Zap, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft, 
  CheckCircle2, 
  FileText, 
  Layers, 
  Utensils, 
  Tag, 
  Percent, 
  Printer, 
  Compass, 
  HelpCircle,
  PhoneCall
} from 'lucide-react'

export default function LandingPageClient() {
  const [activeAudienceTab, setActiveAudienceTab] = useState<'merchants' | 'customers'>('merchants')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  const faqs = [
    {
      q: 'هل يحتاج الزبون إلى تحميل أي تطبيق لاستخدام المنيو أو الطلب؟',
      a: 'لا على الإطلاق! المنيو يعمل فوراً وسحابياً عبر متصفح أي هاتف بمجرد مسح رمز الـ QR أو الضغط على رابط المتجر، دون الحاجة لتحميل تطبيقات ثقيلة أو إنشاء حسابات معقدة.'
    },
    {
      q: 'كيف يستقبل صاحب المتجر طلبات الزبائن؟',
      a: 'تصل الطلبات منسقة بالكامل وبشكل فوري ومرتب إلى رقم الواتساب الرسمي للمتجر، متضمنة قائمة المنتجات المحددة، الكميات، السعر الإجمالي، اسم الزبون، ورابط موقعه الدقيق على الخريطة لتسهيل التوصيل.'
    },
    {
      q: 'هل يمكن لصاحب المتجر تعديل الأسعار وإضافة أطباق جديدة في أي وقت؟',
      a: 'نعم بكل تأكيد، من خلال لوحة تحكم الشريك السهلة، يمكنك إضافة المنتجات، تعديل الأسعار، إخفاء الوجبات النافذة، وإطلاق عروض التخفيضات بضغطة زر واحدة لتنعكس فورا على منيو الزبائن.'
    },
    {
      q: 'كيف أحصل على رمز QR مخصص لمتجري؟',
      a: 'توفر منصة ألف سوق مولد QR احترافي مدمج مجاناً داخل لوحة التاجر، يتيح لك تنزيل الرمز بدقة فائقة Ultra HD، أو طباعة ستاند طاولات فاخر جاهز يحمل شعار متجرك وهويتك فوراً.'
    },
    {
      q: 'كيف يتم احتساب تكلفة وأجرة التوصيل؟',
      a: 'تعتمد المنصة على نظام شرائح توصيل ذكي مرتبط بنظام الخرائط العالمي، حيث يحدد التاجر نطاق التوصيل والأسعار لكل مسافة (مثلاً: من 0 إلى 3 كم = 20 ليرة، من 3 إلى 6 كم = 35 ليرة)، ويتم حسابها تلقائياً عند طلب الزبون.'
    },
    {
      q: 'هل المنصة مخصصة للمطاعم فقط أم تناسب الأنشطة الأخرى؟',
      a: 'تدعم المنصة كافة الأنشطة التجارية: المطاعم، الكافيهات، السوبرماركت والمواد الغذائية، محلات الألبسة والأزياء، والأنشطة الخدمية والمتاجر المتنوعة مع تخصيص المسميات لكل نشاط.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500 selection:text-white flex flex-col" dir="rtl">
      
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="md" variant="light" />
          </Link>

          {/* Quick Nav Anchor Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#why-alfsouq" className="hover:text-orange-400 transition">لماذا ألف سوق؟</a>
            <a href="#for-merchants" className="hover:text-orange-400 transition">لأصحاب المتاجر</a>
            <a href="#for-customers" className="hover:text-orange-400 transition">للزبائن</a>
            <a href="#how-it-works" className="hover:text-orange-400 transition">كيف يعمل؟</a>
            <a href="#faq" className="hover:text-orange-400 transition">الأسئلة الشائعة</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Store size={14} className="text-orange-400" />
              <span>دخول التاجر</span>
            </Link>

            <Link
              href="/"
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition active:scale-95 flex items-center gap-1.5"
            >
              <ShoppingBag size={14} />
              <span>تصفح السوق 🛍️</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-orange-600/20 via-amber-500/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black shadow-sm animate-fade-in">
            <Sparkles size={14} className="text-amber-400 animate-pulse" />
            <span>المنصة الذكية الأحدث للمنيو الرقمي وإدارة الطلبات السريعة</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight max-w-4xl mx-auto">
            اربط متجرك بزبائنك مع <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500">منيو رقمي فائق السرعة</span> وطلبات واتساب ذكية
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            منصة <strong className="text-slate-200">ألف سوق (Alfsouq)</strong> تمنح أصحاب المطاعم والمتاجر حلاً رقمياً متكاملاً لزيادة المبيعات واستقبال الطلبات، وتوفر للزبائن تصفحاً ممتعاً وسريعاً بضغطة زر وبدون تطبيقات.
          </p>

          {/* Dual Primary Call-to-Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <Link
              href="/"
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/25 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <ShoppingBag size={18} />
              <span>تصفح المتاجر والعروض 🛍️</span>
            </Link>

            <a
              href="https://wa.me/905352574134?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A7%D9%86%D8%B6%D9%85%D8%A7%D9%85%20%D9%88%D8%AA%D8%B3%D8%AC%D9%8A%D9%84%20%D9%85%D8%AA%D8%AC%D8%B1%D9%8A%20%D9%81%D9%8A%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%A3%D9%84%D9%81%20%D8%8C%D8%B3%D9%88%D9%82"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 rounded-2xl font-black text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Store size={18} className="text-orange-400" />
              <span>انضم كشريك وسجل متجرك 🚀</span>
            </a>
          </div>

          {/* Quick Metrics & Badges Grid */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto text-right">
            {[
              { icon: Zap, title: 'سرعة فائقة (0s)', desc: 'تصفح فوري وخفيف بدون انتظار', color: '#f97316' },
              { icon: MessageSquare, title: 'طلبات واتساب فورية', desc: 'تصل منسقة مع الموقع الجغرافي', color: '#10b981' },
              { icon: QrCode, title: 'رمز QR مخصص للمتجر', desc: 'جاهز لطباعة ستاندات الطاولات', color: '#3b82f6' },
              { icon: MapPin, title: 'توصيل وخرائط ذكية', desc: 'حساب دقيق للمسافة وتكلفة التوصيل', color: '#a855f7' },
            ].map(item => (
              <div key={item.title} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg mb-2" style={{ background: item.color + '20', color: item.color }}>
                  <item.icon size={18} />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-white">{item.title}</h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── DUAL AUDIENCE VALUE SECTION (Interactive Tabs) ── */}
      <section id="why-alfsouq" className="py-16 px-4 sm:px-6 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-white">لماذا تختار منصة ألف سوق؟</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-xl mx-auto">
              صُممت المنصة لتلبي احتياجات طرفي المعادلة بأعلى معايير السهولة والاحترافية.
            </p>

            {/* Tab Selector Buttons */}
            <div className="inline-flex p-1.5 bg-slate-950 border border-slate-800 rounded-2xl mt-4">
              <button
                onClick={() => setActiveAudienceTab('merchants')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeAudienceTab === 'merchants'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store size={16} />
                <span>لأصحاب المتاجر والمطاعم 🏪</span>
              </button>

              <button
                onClick={() => setActiveAudienceTab('customers')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-2 cursor-pointer ${
                  activeAudienceTab === 'customers'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag size={16} />
                <span>للزبائن والمتسوقين 🛍️</span>
              </button>
            </div>
          </div>

          {/* TAB 1: FOR MERCHANTS */}
          {activeAudienceTab === 'merchants' && (
            <div id="for-merchants" className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-lg mb-3">
                    🍱
                  </div>
                  <h3 className="font-black text-base text-white">منيو إلكتروني فوري واحترافي</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    واجهة تفاعلية تبرز وجباتك ومنتجاتك بصور فائقة الجودة وتصنيفات مرتبة وأحجام وألوان متنوعة تجذب الزبائن وتزيد معدل الشراء.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-orange-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تحديث فوري دون أي تأخير</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg mb-3">
                    📱
                  </div>
                  <h3 className="font-black text-base text-white">رمز QR مخصص قابل للطباعة</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    أنشئ رمز QR مدمج بشعار متجرك وهويتك، واطبع ستاندات طاولات فاخرة فوراً بضغطة زر وبمقاسات جاهزة للمطابع دون الحاجة لمصممين.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-amber-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>توليد عالي الدقة (PNG / Print)</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                    💬
                  </div>
                  <h3 className="font-black text-base text-white">استقبال الطلبات على الواتساب</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    تصلك كل تفاصيل الطلب منسقة بوضوح في رسالة واتساب مع اسم الزبون، خيارات المنتجات، السعر الإجمالي، والموقع الجغرافي الدقيق.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>ربط فوري بدون وسيط</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg mb-3">
                    💸
                  </div>
                  <h3 className="font-black text-base text-white">توفير هائل في تكاليف الطباعة</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    وداعاً لتكاليف إعادة طباعة المنيو الورقي عند تغير الأسعار أو تبدل المواسم؛ عدّل أي سعر أو صنف بلحظة واحدة من هاتفك.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-blue-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>صفر تكلفة إضافية عند التعديل</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-lg mb-3">
                    🔥
                  </div>
                  <h3 className="font-black text-base text-white">محرك العروض والتخفيضات</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    أطلق عروضاً ترويجية حصرية وباقات تظهر تلقائياً في أعلى منصة ألف سوق لجذب آلاف الزبائن الجدد ومضاعفة المبيعات اليومية.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-rose-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>ظهور بارز ومميز في الصفحة الرئيسية</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-3">
                    📊
                  </div>
                  <h3 className="font-black text-base text-white">تحليلات وإحصائيات الزيارات</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    تابع عدد مرات مسح رمز الـ QR وزيارات المنيو عبر تقارير تفصيلية ورسوم بيانية تمكنك من اتخاذ قرارات تسويقية مدروسة.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-purple-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تتبع دقيق مع فلترة زمنية</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FOR CUSTOMERS */}
          {activeAudienceTab === 'customers' && (
            <div id="for-customers" className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-200">
              
              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-lg mb-3">
                    ⚡
                  </div>
                  <h3 className="font-black text-base text-white">تصفح فوري بدون تطبيق</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    افتح المنيو وتصفح آلاف الأطباق والمنتجات في ثوانٍ معدودة مباشرة من متصفح هاتفك، دون الحاجة لتنزيل أي تطبيقات تأخذ مساحة من هاتفك.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-orange-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>يعمل بسلاسة على كافة الأجهزة</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-lg mb-3">
                    💬
                  </div>
                  <h3 className="font-black text-base text-white">طلب مباشر بضغطة زر</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    أضف وجباتك إلى السلة واضغط "إرسال الطلب" لتنتقل فوراً إلى محادثة واتساب المطعم مع كافة التفاصيل جاهزة دون أي تعقيد.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تواصل مباشر مع المتجر</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-lg mb-3">
                    🎁
                  </div>
                  <h3 className="font-black text-base text-white">عروض وخصومات حصرية</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    استكشف أحدث العروض اليومية، باقات التوفير، والوجبات المخفضة في منطقتك واستمتع بأفضل الأسعار على مدار الساعة.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-rose-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>تخفيضات حقيقية ومتجددة</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-lg mb-3">
                    🛵
                  </div>
                  <h3 className="font-black text-base text-white">حساب دقيق لتكلفة التوصيل</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    تعرف على أجرة التوصيل الفعلية بدقة بناءً على موقعك الجغرافي والمسافة بينك وبين المطعم مع شفافية كاملة قبل تأكيد الطلب.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-blue-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>وضوح وشفافية في الأسعار</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-lg mb-3">
                    📍
                  </div>
                  <h3 className="font-black text-base text-white">مواقع المحلات على الخريطة</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    ابحث عن أقرب المطاعم والمحلات المحيطة بك، وتعرف على حالة عملها (مفتوح/مغلق)، وافتح موقعها فوراً على خرائط Google Maps.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-amber-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>سهولة الوصول وزيارة الفرع</span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-lg mb-3">
                    ⭐
                  </div>
                  <h3 className="font-black text-base text-white">تقييمات وتجارب حقيقية</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    اطلع على تجارب وتقييمات زبائن حقيقيين قاموا بالطلب من المتجر لتختار بكل ثقة وتستمتع بأفضل الوجبات.
                  </p>
                </div>
                <div className="pt-2 text-[11px] text-purple-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} />
                  <span>مجتمع تقييمات موثوق</span>
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

      {/* ── HOW IT WORKS (3 Simple Steps) ── */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-4xl font-black text-white">كيف تعمل المنصة؟</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">3 خطوات بسيطة للانطلاق سواء كنت تاجراً أو زبوناً</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Merchant Flow */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-7 rounded-3xl border border-orange-500/20 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">لأصحاب المتاجر والمطاعم</h3>
                  <p className="text-xs text-slate-400">انطلق بمنيو متجرك في 5 دقائق</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { step: '1', title: 'سجّل حساب متجرك وفعّل بياناتك', desc: 'أدخل اسم المطعم، شعاره، رقم الواتساب، وموقعك على الخريطة.' },
                  { step: '2', title: 'أضف منتجاتك واطبع رمز الـ QR', desc: 'أضف الوجبات والأسعار، واستخرج رمز الـ QR لطباعته على الطاولات.' },
                  { step: '3', title: 'استقبل الطلبات والزبائن فوراً', desc: 'تصلك طلبات الزبائن مباشرة على الواتساب جاهزة للتجهيز والتوصيل.' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Flow */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 sm:p-7 rounded-3xl border border-emerald-500/20 shadow-xl space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">للزبائن والمتسوقين</h3>
                  <p className="text-xs text-slate-400">طلب أسهل وأسرع في 3 خطوات</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { step: '1', title: 'امسح رمز الـ QR أو افتح الرابط', desc: 'وجّه كاميرا هاتفك نحو كود الطاولة أو افتح رابط المتجر مباشرة.' },
                  { step: '2', title: 'اختر وجباتك ومنتجاتك المفضلة', desc: 'تصفح الأصناف، الأحجام، والأسعار وأضف ما ترغب إلى سلة الطلب.' },
                  { step: '3', title: 'أرسل طلبك مباشرة إلى الواتساب', desc: 'اضغط تأكيد الطلب لتنتقل فورا إلى محادثة المتجر مع موقعك وحساب التوصيل.' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-slate-200">{item.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── FAQ SECTION (Interactive Accordion) ── */}
      <section id="faq" className="py-16 px-4 sm:px-6 bg-slate-900/40 border-t border-slate-800/80">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto mb-2 font-black">
              <HelpCircle size={22} />
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">الأسئلة الأكثر شيوعاً</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">كل ما تود معرفته عن منصة ألف سوق</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx

              return (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-right flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/40 transition"
                  >
                    <span className="font-black text-xs sm:text-sm text-slate-200">{faq.q}</span>
                    <span className="w-7 h-7 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 font-medium leading-relaxed border-t border-slate-900 animate-in fade-in duration-200">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* ── FINAL CALL TO ACTION BANNER ── */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center space-y-6">
          {/* Background overlay */}
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              جاهز لتطوير متجرك وتقديم تجربة منيو استثنائية لزبائنك؟
            </h2>
            <p className="text-xs sm:text-sm text-orange-100 font-medium leading-relaxed">
              انضم الآن لعائلة شركاء ألف سوق واستمتع بنظام منيو رقمي ذكي ومتكامل مع دعم فني مستمر.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/905352574134?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A7%D9%86%D8%B6%D9%85%D8%A7%D9%85%20%D9%88%D8%AA%D8%B3%D8%AC%D9%8A%D9%84%20%D9%85%D8%AA%D8%AC%D8%B1%D9%8A%20%D9%81%D9%8A%20%D9%85%D9%86%D8%B5%D8%A9%20%D8%A3%D9%84%D9%81%20%D8%B3%D9%88%D9%82"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black text-xs sm:text-sm shadow-xl transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>💬 تواصل معنا لتسجيل متجرك</span>
              </a>

              <Link
                href="/"
                className="w-full sm:w-auto px-8 py-3.5 bg-white/20 hover:bg-white/30 text-white border border-white/30 rounded-2xl font-black text-xs sm:text-sm backdrop-blur-md transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>تصفح المنصة والمتاجر 🏠</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />

    </div>
  )
}
