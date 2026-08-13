import React from 'react'
import { supabase } from '@/lib/supabase'
import { Info, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'

export const revalidate = false
export const dynamic = 'force-static'

async function getAboutContent() {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('about_us')
      .eq('id', 'main')
      .maybeSingle()
    return data?.about_us || null
  } catch (e) {
    return null
  }
}

export default async function AboutPage() {
  const customAbout = await getAboutContent()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col dir-rtl selection:bg-emerald-500 selection:text-white">
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

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10">
        <div className="bg-gradient-to-br from-emerald-950/40 via-gray-900 to-gray-900 border border-emerald-500/20 rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <Info size={30} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">عن منصة ألف سوق (Alfsouq)</h1>
          <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
            المنصة الذكية والأحدث للربط بين الزبائن وأفضل المطاعم والشركاء مع المنيو الرقمي السريع وتتبع الطلبات المباشر.
          </p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 shadow-xl leading-relaxed space-y-6 text-gray-300">
          {customAbout ? (
            <div className="prose prose-invert max-w-none prose-headings:text-white prose-emerald prose-p:leading-relaxed">
              {customAbout.split('\n\n').map((paragraph: string, index: number) => {
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
            <div className="text-sm space-y-4">
              <p>ألف سوق هي منصة المنيو الرقمي المتقدمة لتقديم تجربة طلبيات فريدة وسريعة عبر تقنيات تحديد المواقع والواتساب.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
