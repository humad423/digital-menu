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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('بيانات الدخول غير صحيحة')
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decorative Blur */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />

      <div className="bg-slate-800/90 border border-slate-700/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md relative z-10 text-white">
        <div className="flex flex-col items-center mb-8 text-center">
          <BrandLogo size="lg" variant="light" className="mb-3" />
          <p className="text-xs text-orange-400 font-bold tracking-wider uppercase bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20 mt-2">
            لوحة الإدارة المركزية Super Admin
          </p>
        </div>
        {error && <div className="bg-red-500/20 border border-red-500/40 text-red-300 p-3.5 rounded-2xl mb-5 text-sm font-bold text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
              required
              dir="ltr"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold text-lg hover:bg-gray-800 transition disabled:opacity-70"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
