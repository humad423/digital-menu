import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <header className="bg-slate-900 text-white p-4 shadow-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="light" showSubtitle={false} />
            <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2.5 py-1 rounded-full border border-orange-500/30">
              إدارة المنصة
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition font-medium border border-slate-700">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
