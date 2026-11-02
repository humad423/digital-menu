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

  if (error || data?.user?.app_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" dir="rtl">
      {/* ── Header ── */}
      <header className="dash-header">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" />
          <span className="badge badge-gray hidden sm:inline-flex">الإدارة</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted font-medium hidden md:block">{data.user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="btn btn-secondary btn-sm">
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
