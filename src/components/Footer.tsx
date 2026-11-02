import Link from 'next/link'
import InstallAppButton from '@/components/pwa/InstallAppButton'
import { PARTNER_URL, supportWhatsappUrl } from '@/config/site'

const linkClass = 'font-bold text-ink underline underline-offset-4 py-2'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-line mt-8">
      <div className="page py-6 space-y-3 text-center">
        <p className="text-muted font-medium">
          ألف سوق يعرض المتاجر القريبة منك ومنتجاتها وأسعارها. طلبك يصل إلى المتجر مباشرة، ولا نستلم الطلبات أو المدفوعات.
        </p>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/about" className={linkClass}>عن ألف سوق</Link>
          <a href={supportWhatsappUrl()} target="_blank" rel="noopener noreferrer" className={linkClass}>تواصل معنا</a>
          <a href={`${PARTNER_URL}/dashboard`} className={linkClass}>لأصحاب المتاجر</a>
          <Link href="/privacy" className={linkClass}>الخصوصية</Link>
          <Link href="/terms" className={linkClass}>الشروط</Link>
        </nav>
        <div className="flex justify-center empty:hidden">
          <InstallAppButton variant="link" label="ثبّت ألف سوق على هاتفك" />
        </div>
      </div>
    </footer>
  )
}
