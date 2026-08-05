import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BrandLogo from '@/components/BrandLogo'
import Link from 'next/link'

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
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" variant="light" showSubtitle={false} />
          <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2.5 py-1 rounded-full border border-orange-500/30 hidden sm:block">
            Super Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium hidden md:block">{data.user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="btn btn-ghost text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white text-xs">
              خروج
            </button>
          </form>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
