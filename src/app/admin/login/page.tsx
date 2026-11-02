'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

import BrandLogo from '@/components/BrandLogo'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('بيانات الدخول غير صحيحة')
      setLoading(false)
    } else if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut()
      setError('هذا الحساب لا يملك صلاحية الإدارة')
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center p-4" dir="rtl">
      <div className="card p-5 w-full max-w-md space-y-5">
        <div className="space-y-2">
          <BrandLogo />
          <h1 className="section-title">دخول الإدارة</h1>
        </div>
        {error && <p className="notice notice-bad">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="field-label">البريد الإلكتروني</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field text-left"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="field-label">كلمة المرور</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field text-left"
              required
              dir="ltr"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </main>
  )
}
