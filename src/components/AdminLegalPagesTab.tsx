'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ShieldCheck, FileText, Info, Save, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { triggerRevalidate } from '@/utils/revalidate'
import { SITE_URL } from '@/config/site'

export default function AdminLegalPagesTab() {
  const supabase = createClient()
  const [activeSubTab, setActiveSubTab] = useState<'privacy' | 'terms' | 'about'>('privacy')
  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [termsOfService, setTermsOfService] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchLegalSettings = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('privacy_policy, terms_of_service')
          .eq('id', 'main')
          .maybeSingle()

        if (data) {
          setPrivacyPolicy(data.privacy_policy || '')
          setTermsOfService(data.terms_of_service || '')
        }
      } catch (e: any) {
        console.error('Error fetching legal pages:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchLegalSettings()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          privacy_policy: privacyPolicy,
          terms_of_service: termsOfService
        })
        .eq('id', 'main')

      if (error) throw error

      triggerRevalidate(null, 'legal')
      setSuccessMsg('تم حفظ محتوى الصفحات القانونية بنجاح 🚀')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (e: any) {
      console.error('Error saving legal pages:', e)
      setErrorMsg(e?.message || 'حدث خطأ أثناء حفظ الصفحات')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-900/60 rounded-3xl border border-gray-800 dir-rtl text-white">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-bold text-muted">جاري تحميل محرر الصفحات القانونية...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 dir-rtl text-white">
      {/* Header Banner */}
      <div className="bg-ink border border-gray-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck size={20} />
            </span>
            <h2 className="text-xl font-black text-white">إدارة الصفحات القانونية والتعريفية (CMS)</h2>
          </div>
          <p className="text-sm text-muted font-medium">
            تعديل سياسة الخصوصية والشروط والأحكام وصفحة عن المنصة مع التنسيق المباشر.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={16} />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-sm font-bold flex items-center gap-2.5">
          <CheckCircle size={18} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-sm font-bold flex items-center gap-2.5">
          <AlertCircle size={18} className="shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sub Tabs Selection */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('privacy')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2  cursor-pointer shrink-0 ${
            activeSubTab === 'privacy'
              ? 'bg-emerald-600 text-white  '
              : 'bg-gray-900 text-muted hover:text-white hover:bg-gray-800'
          }`}
        >
          <ShieldCheck size={16} />
          <span>سياسة الخصوصية (`/privacy`)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('terms')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2  cursor-pointer shrink-0 ${
            activeSubTab === 'terms'
              ? 'bg-amber-600 text-white  '
              : 'bg-gray-900 text-muted hover:text-white hover:bg-gray-800'
          }`}
        >
          <FileText size={16} />
          <span>الشروط والأحكام (`/terms`)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('about')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm flex items-center gap-2  cursor-pointer shrink-0 ${
            activeSubTab === 'about'
              ? 'bg-blue-600 text-white  '
              : 'bg-gray-900 text-muted hover:text-white hover:bg-gray-800'
          }`}
        >
          <Info size={16} />
          <span>عن المنصة (`/about`)</span>
        </button>
      </div>

      {/* Tab 1: Privacy Policy Editor */}
      {activeSubTab === 'privacy' && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>محتوى سياسة الخصوصية</span>
            </h3>
            <Link
              href={`${SITE_URL}/privacy`}
              target="_blank"
              className="text-sm font-bold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>معاينة الصفحة الحية</span>
              <ExternalLink size={14} />
            </Link>
          </div>
          <textarea
            rows={16}
            value={privacyPolicy}
            onChange={e => setPrivacyPolicy(e.target.value)}
            placeholder="اكتب محتوى سياسة الخصوصية هنا..."
            className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm font-mono text-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none leading-relaxed"
          />
        </div>
      )}

      {/* Tab 2: Terms of Service Editor */}
      {activeSubTab === 'terms' && (
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <FileText size={18} className="text-brand" />
              <span>محتوى الشروط والأحكام</span>
            </h3>
            <Link
              href={`${SITE_URL}/terms`}
              target="_blank"
              className="text-sm font-bold text-brand hover:underline flex items-center gap-1"
            >
              <span>معاينة الصفحة الحية</span>
              <ExternalLink size={14} />
            </Link>
          </div>
          <textarea
            rows={16}
            value={termsOfService}
            onChange={e => setTermsOfService(e.target.value)}
            placeholder="اكتب محتوى الشروط والأحكام هنا..."
            className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm font-mono text-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none leading-relaxed"
          />
        </div>
      )}

      {/* Tab 3: About Us Editor */}
    </div>
  )
}
