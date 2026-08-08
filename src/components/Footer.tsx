import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { ShieldCheck, FileText } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 py-8 px-5 dir-rtl w-full mt-auto">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Brand & Intro */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right pb-5 border-b border-slate-800">
          <div>
            <BrandLogo size="md" variant="light" className="justify-center sm:justify-start mb-1" />
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              منصة ألف سوق (Alfsouq) - المنيو الرقمي السريع والطلبات الذكية
            </p>
          </div>
          <a
            href="https://wa.me/905352574134"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold transition shrink-0"
          >
            💬 واتساب الدعم الفني
          </a>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-300 text-center">
          <Link
            href="/privacy"
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:text-orange-400 border border-slate-700/50 transition flex items-center justify-center gap-1.5"
          >
            <ShieldCheck size={14} className="text-orange-500" />
            <span>Privacy Policy</span>
          </Link>

          <Link
            href="/terms"
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:text-orange-400 border border-slate-700/50 transition flex items-center justify-center gap-1.5"
          >
            <FileText size={14} className="text-orange-500" />
            <span>Terms of Service</span>
          </Link>

          <Link
            href="/about"
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:text-orange-400 border border-slate-700/50 transition"
          >
            عن المنصة
          </Link>

          <Link
            href="/dashboard"
            className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:text-orange-400 border border-slate-700/50 transition"
          >
            بوابة الشركاء
          </Link>
        </div>

        {/* Copyright & Meta Note */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 text-center font-medium">
          <p>© {new Date().getFullYear()} Alfsouq Platform. All rights reserved.</p>
          <p className="text-slate-500">Secured via Meta WhatsApp Cloud API</p>
        </div>
      </div>
    </footer>
  )
}
