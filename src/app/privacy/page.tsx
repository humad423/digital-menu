import React from 'react'
import { createPublicClient } from '@/utils/supabase/server'
import { ShieldCheck, PhoneCall, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'

export const revalidate = false
export const dynamic = 'force-static'

async function getPrivacyContent() {
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('platform_settings')
      .select('privacy_policy')
      .eq('id', 'main')
      .maybeSingle()
    return data?.privacy_policy || null
  } catch (e) {
    return null
  }
}

export default async function PrivacyPolicyPage() {
  const customPolicy = await getPrivacyContent()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col dir-rtl selection:bg-emerald-500 selection:text-white">
      {/* Header Bar */}
      <header className="border-b border-gray-800/80 bg-gray-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <BrandLogo size="md" variant="light" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-emerald-400 transition bg-gray-800/60 px-3.5 py-2 rounded-xl border border-gray-700/50"
          >
            <ArrowRight size={16} />
            <span>العودة للرئيسية</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
        {/* Title Banner */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-gray-900 to-gray-900 border border-emerald-500/20 rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">سياسة الخصوصية وحماية البيانات</h1>
          <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
            تلتزم منصة <strong className="text-emerald-400">ألف سوق (Alfsouq)</strong> بحماية معلوماتك وشريحة بياناتك بأعلى درجات الأمان والسرية، ووفق معايير الحماية العالمية واللوائح المعتمدة.
          </p>
          <div className="mt-4 flex items-center gap-3 text-xs text-gray-500 font-medium">
            <span>آخر تحديث: 2026</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">موثق ومعتمد</span>
          </div>
        </div>

        {/* Policy Content Card */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 shadow-xl leading-relaxed space-y-6 text-gray-300">
          {customPolicy ? (
            <div className="prose prose-invert max-w-none prose-headings:text-white prose-emerald prose-p:leading-relaxed">
              {customPolicy.split('\n\n').map((paragraph: string, index: number) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl font-bold text-white pt-4 pb-1 border-b border-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>{paragraph.replace('### ', '')}</span>
                    </h3>
                  )
                }
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-black text-emerald-400 pt-2 pb-2">
                      {paragraph.replace('## ', '')}
                    </h2>
                  )
                }
                if (paragraph.startsWith('---')) {
                  return <hr key={index} className="border-gray-800 my-6" />
                }
                return (
                  <p key={index} className="text-sm font-normal text-gray-300 leading-relaxed whitespace-pre-line">
                    {paragraph}
                  </p>
                )
              })}
            </div>
          ) : (
            <div className="space-y-6 text-sm">
              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  <span>1. البيانات التي نجمعها</span>
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  نجمع البيانات الضرورية فقط لتقديم خدمة المنيو الرقمي والطلبات:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-400 pr-2">
                  <li><strong>رقم الهاتف:</strong> يُستخدم حصرياً لتسجيل الدخول وإرسال رمز التحقق الأمني (OTP) عبر الواتساب.</li>
                  <li><strong>الموقع الجغرافي (Geofencing):</strong> يتم طلب الإذن للتأكد من وجودك ضمن نطاق الخدمة وعرض أقرب المطاعم المتاحة.</li>
                  <li><strong>تفاصيل الطلب:</strong> المنتجات المختارة والعنوان لإيصال الطلب بنجاح.</li>
                </ul>
              </section>

              <hr className="border-gray-800" />

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  <span>2. كيفية استخدام البيانات</span>
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  تُستخدم معلوماتك لإدارة حسابك وتأكيد دخولك عبر إشعارات الواتساب الرسمية، وتأكيد طلبات الوجبات وإيصالها بمرونة وتوفير خدمة الدعم الفني.
                </p>
              </section>

              <hr className="border-gray-800" />

              <section className="space-y-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                  <span>3. مشاركة البيانات وحمايتها</span>
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  نلتزم بعدم بيع أو مشاركة بياناتك الشخصية مع أي أطراف ثالثة لأغراض تسويقية. يتم التفاعل الأمني عبر واجهة Meta WhatsApp Cloud API الرسمية المشفرة.
                </p>
              </section>
            </div>
          )}

          {/* WhatsApp Support Direct Box */}
          <div className="mt-10 p-6 bg-gradient-to-r from-emerald-950/40 to-gray-900 border border-emerald-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <PhoneCall size={22} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">هل لديك استفسار بخصوص الخصوصية؟</h4>
                <p className="text-xs text-gray-400">فريق الدعم الفني متواجد لمساعدتك عبر الواتساب</p>
              </div>
            </div>
            <a
              href="https://wa.me/905352574134"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>تواصل مع الدعم عبر الواتساب</span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
