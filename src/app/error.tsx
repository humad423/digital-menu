'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main dir="rtl" className="min-h-screen bg-page page-narrow flex flex-col items-center justify-center text-center gap-3 py-10">
      <h1 className="text-2xl font-black">حدث خطأ</h1>
      <p className="text-muted font-medium">تأكد من اتصالك بالإنترنت وحاول مرة أخرى.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-sm mt-2">
        <button onClick={reset} className="btn btn-primary">حاول مرة أخرى</button>
        <Link href="/" className="btn btn-secondary">الرئيسية</Link>
      </div>
    </main>
  )
}
