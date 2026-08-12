import React from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import Footer from '@/components/Footer'

export const dynamic = 'force-dynamic'

async function getTermsContent() {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('terms_of_service')
      .eq('id', 'main')
      .maybeSingle()
    return data?.terms_of_service || null
  } catch (e) {
    return null
  }
}

export default async function TermsPage() {
  const customTerms = await getTermsContent()

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
        <div className="bg-gradient-to-br from-amber-950/40 via-gray-900 to-gray-900 border border-amber-500/20 rounded-3xl p-8 mb-8 shadow-xl relative overflow-hidden">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <FileText size={30} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">الشروط والأحكام الاستخدام</h1>
          <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
            الشروط والأحكام المنظمة لاستخدام منصة <strong className="text-amber-400">ألف سوق (Alfsouq)</strong> والخدمات الرقمية المتوفرة.
          </p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 shadow-xl leading-relaxed space-y-6 text-gray-300">
          {customTerms ? (
            <div className="prose prose-invert max-w-none prose-headings:text-white prose-amber prose-p:leading-relaxed">
              {customTerms.split('\n\n').map((paragraph: string, index: number) => {
                if (paragraph.startsWith('### ')) {
                  return (
                    <h3 key={index} className="text-xl font-bold text-white pt-4 pb-1 border-b border-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>{paragraph.replace('### ', '')}</span>
                    </h3>
                  )
                }
                if (paragraph.startsWith('## ')) {
                  return (
                    <h2 key={index} className="text-2xl font-black text-amber-400 pt-2 pb-2">
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
              <p>مرحباً بك في منصة ألف سوق. استخدامك للمنصة يعني موافقتك على الالتزام بكافة الشروط والأحكام المعمول بها.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
