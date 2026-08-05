import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center dir-rtl">
      <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-3xl flex items-center justify-center text-3xl font-black mb-6">
        404
      </div>
      <h1 className="text-2xl font-black mb-2">الصفحة غير موجودة</h1>
      <p className="text-gray-400 font-medium text-xs max-w-xs mb-8 leading-relaxed">
        عذراً، الرابط الذي تحاول الوصول إليه غير موجود أو تم نقله.
      </p>
      <Link
        href="/"
        className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition"
      >
        العودة للرئيسية 🏠
      </Link>
    </div>
  )
}
