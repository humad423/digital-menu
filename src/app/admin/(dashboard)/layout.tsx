import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      <header className="bg-gray-900 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">لوحة تحكم الإدارة</h1>
          <form action="/auth/signout" method="post">
            <button className="text-sm bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition">
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
