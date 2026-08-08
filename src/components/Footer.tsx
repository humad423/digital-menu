import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800/80 text-gray-400 py-10 dir-rtl">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-gray-800/60">
          <div className="flex flex-col items-center md:items-start text-center md:text-right">
            <BrandLogo size="md" variant="light" className="mb-2" />
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              منصة ألف سوق (Alfsouq) - المنيو الرقمي السريع والطلبات الذكية في المنطقة.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-gray-300">
            <Link href="/privacy" className="hover:text-emerald-400 transition">
              سياسة الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-emerald-400 transition">
              الشروط والأحكام
            </Link>
            <Link href="/about" className="hover:text-emerald-400 transition">
              عن المنصة
            </Link>
            <Link href="/dashboard" className="hover:text-emerald-400 transition">
              بوابة الشركاء
            </Link>
            <a
              href="https://wa.me/905352574134"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>واتساب الدعم</span>
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-medium text-center">
          <p>© {new Date().getFullYear()} منصة ألف سوق Alfsouq. جميع الحقوق محفوظة.</p>
          <p className="text-[11px] text-gray-600">محمية وفق معايير الأمان وواجهة Meta Cloud API</p>
        </div>
      </div>
    </footer>
  )
}
