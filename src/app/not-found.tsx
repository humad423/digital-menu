import Link from 'next/link'

export default function NotFound() {
  return (
    <main dir="rtl" className="min-h-screen bg-page page-narrow flex flex-col items-center justify-center text-center gap-3 py-10">
      <h1 className="text-2xl font-black">هذه الصفحة غير موجودة</h1>
      <p className="text-muted font-medium">ربما تغيّر الرابط أو لم يعد المتجر متاحاً.</p>
      <Link href="/" className="btn btn-primary mt-2">الذهاب إلى الرئيسية</Link>
    </main>
  )
}
