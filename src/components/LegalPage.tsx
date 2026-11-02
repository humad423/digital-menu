import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Footer from '@/components/Footer'

/** Renders the text saved from the admin panel, or the built-in text when there is none. */
export default function LegalPage({
  title,
  content,
  fallback,
}: {
  title: string
  content: string | null
  fallback: React.ReactNode
}) {
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

      <main className="page-narrow py-6 flex-1 space-y-4 leading-relaxed">
        <h1 className="text-2xl font-black">{title}</h1>

        {content
          ? content.split('\n\n').map((paragraph, index) => {
              if (paragraph.startsWith('### ')) return <h3 key={index} className="text-lg font-black pt-2">{paragraph.replace('### ', '')}</h3>
              if (paragraph.startsWith('## ')) return <h2 key={index} className="section-title pt-2">{paragraph.replace('## ', '')}</h2>
              if (paragraph.startsWith('---')) return <hr key={index} className="border-line" />
              return <p key={index} className="whitespace-pre-line">{paragraph}</p>
            })
          : fallback}
      </main>

      <Footer />
    </div>
  )
}
