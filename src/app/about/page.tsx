import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Footer from '@/components/Footer'
import { PARTNER_URL, supportWhatsappUrl } from '@/config/site'

export const metadata: Metadata = {
  title: 'عن ألف سوق',
  description: 'ألف سوق يعرض لك المتاجر القريبة منك ومنتجاتها وأسعارها، وتطلب من المتجر مباشرة عبر واتساب.',
}

const STEPS = [
  { title: 'اسمح بموقعك', text: 'نعرض لك المتاجر القريبة منك.' },
  { title: 'شاهد المنتجات والأسعار', text: 'تصفح ما يوجد حولك، بدون حساب وبدون كلمة مرور.' },
  { title: 'اطلب من المتجر مباشرة', text: 'يصل طلبك إلى المتجر على واتساب، وتتفق معه على الدفع والتوصيل.' },
]

export default function AboutPage() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col bg-page">
      <header className="site-header">
        <div className="page-narrow py-3">
          <Link href="/" className="btn btn-secondary btn-sm">
            <ArrowRight size={18} />
            <span>الرئيسية</span>
          </Link>
        </div>
      </header>

      <main className="page-narrow py-6 flex-1 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-black leading-snug">شو في حواليك؟</h1>
          <p className="text-lg leading-relaxed">
            ألف سوق مكان واحد تشوف فيه المتاجر القريبة منك، ومنتجاتها وأسعارها.
          </p>
          <p className="notice notice-info">
            ألف سوق ليس وسيطاً: لا نستلم الطلبات ولا المدفوعات. طلبك يصل إلى المتجر مباشرة.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="section-title">كيف يعمل؟</h2>
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="card p-4 flex gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand text-white font-black text-lg flex items-center justify-center shrink-0">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black text-lg leading-snug">{step.title}</h3>
                  <p className="text-muted font-medium">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href="/" className="btn btn-primary btn-lg btn-block">شاهد المتاجر القريبة منك</Link>
        </section>

        <section className="space-y-3">
          <h2 className="section-title">هل عندك متجر؟</h2>
          <p className="leading-relaxed">
            أضف منتجاتك وأسعارك ليراها الناس القريبون منك، وتصلك طلباتهم على واتساب مباشرة.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={supportWhatsappUrl('مرحباً، أرغب في إضافة متجري إلى منصة ألف سوق')}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              تواصل معنا على واتساب
            </a>
            <a href={`${PARTNER_URL}/dashboard`} className="btn btn-secondary">دخول أصحاب المتاجر</a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
