'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div dir="rtl" className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-black mb-2">حدث خطأ غير متوقع</h1>
      <p className="text-gray-400 font-medium text-xs max-w-xs mb-8 leading-relaxed">
        يرجى إعادة المحاولة، وإذا تكرر الخطأ تواصل معنا.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-orange-500 text-white font-black text-xs rounded-2xl active:scale-95 transition"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="px-6 py-3 bg-gray-800 text-white font-black text-xs rounded-2xl active:scale-95 transition"
        >
          الرئيسية
        </Link>
      </div>
    </div>
  )
}
