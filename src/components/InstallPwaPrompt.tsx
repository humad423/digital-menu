'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X, Share, Sparkles, Loader2 } from 'lucide-react'
import { trackEvent } from '@/utils/analytics'

export default function InstallPwaPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const deferredRef = useRef<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installing, setInstalling] = useState(false)

  const isPartnerPage = pathname.startsWith('/dashboard') || pathname.startsWith('/restaurant-panel') || pathname.startsWith('/admin')
  const isEligiblePage = pathname === '/' || isPartnerPage

  useEffect(() => {
    // 1. Check if already installed in standalone mode
    const isStandaloneApp = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )

    if (isStandaloneApp) {
      setIsStandalone(true)
      return
    }

    // 2. Register Service Worker globally
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update()
      }).catch(() => {})
    }

    // 3. Detect iOS Safari vs Android
    const ua = window.navigator.userAgent
    const isIosDevice = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    setIsIos(isIosDevice)

    let timer: NodeJS.Timeout | null = null

    const scheduleShowPrompt = () => {
      if (isEligiblePage) {
        const dismissKey = isPartnerPage ? 'alfsouq_partner_pwa_dismissed' : 'alfsouq_pwa_dismissed'
        const sessionDismissed = sessionStorage.getItem(dismissKey)
        if (!sessionDismissed) {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            setShowPrompt(true)
          }, 4000)
        }
      }
    }

    // 4. Listen for beforeinstallprompt globally on ALL routes
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).deferredPwaPrompt = e
      deferredRef.current = e
      setDeferredPrompt(e)
      scheduleShowPrompt()
    }

    const handleAppInstalled = () => {
      if (timer) clearTimeout(timer)
      setShowPrompt(false)
      setIsStandalone(true)
      trackEvent({ event_type: 'pwa_install' })
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // 5. Check if early captured beforeinstallprompt exists
    if (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) {
      const earlyEvt = (window as any).deferredPwaPrompt
      setDeferredPrompt(earlyEvt)
      deferredRef.current = earlyEvt
      scheduleShowPrompt()
    }

    if (isEligiblePage && isIosDevice) {
      scheduleShowPrompt()
    }

    return () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [pathname, isEligiblePage, isPartnerPage])

  const handleInstallClick = async () => {
    const promptObj = (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null) || deferredPrompt || deferredRef.current

    if (promptObj) {
      setInstalling(true)
      try {
        await promptObj.prompt()
        const { outcome } = await promptObj.userChoice
        if (outcome === 'accepted') {
          setShowPrompt(false)
          setIsStandalone(true)
          trackEvent({ event_type: 'pwa_install' })
        }
      } catch (err) {
        console.log('PWA Prompt execution:', err)
      } finally {
        setInstalling(false)
      }
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    const dismissKey = isPartnerPage ? 'alfsouq_partner_pwa_dismissed' : 'alfsouq_pwa_dismissed'
    sessionStorage.setItem(dismissKey, 'true')
  }

  // Hide banner if NOT eligible page OR running in native standalone app
  if (!isEligiblePage || isStandalone || !showPrompt) return null

  const iconSrc = isPartnerPage ? '/partner-icon-192.png' : '/icon-192.png'
  const title = isPartnerPage ? 'ثبّت تطبيق لوحة الشريك' : 'ثبّت تطبيق "ألف سوق"'
  const description = isPartnerPage
    ? 'إدارة الطلبات، المنيو، وتلقي التنبيهات الفورية بنقرة واحدة من شاشة الهاتف.'
    : 'تصفح أسرع، وصول بنقرة واحدة من شاشة الهاتف، ودعم تصفح بدون إنترنت.'
  const borderStyle = isPartnerPage ? 'border-emerald-500/30' : 'border-orange-500/30'
  const glowStyle = isPartnerPage ? 'bg-emerald-500/20' : 'bg-orange-500/20'
  const buttonStyle = isPartnerPage
    ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600'
    : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto dir-rtl animate-slide-up">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        
        {/* Background glow */}
        <div className={`absolute -top-10 -right-10 w-28 h-28 ${glowStyle} rounded-full blur-2xl pointer-events-none`} />

        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
          title="إغلاق"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5">
          <div className={`w-13 h-13 rounded-2xl overflow-hidden shadow-lg border ${borderStyle} shrink-0 bg-slate-950 flex items-center justify-center`}>
            <img src={iconSrc} alt={title} className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="font-black text-sm text-white flex items-center gap-1.5 mb-0.5">
              <span>{title}</span>
              <Sparkles size={14} className={isPartnerPage ? 'text-emerald-400' : 'text-amber-400'} />
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              {description}
            </p>

            {/* iOS Instructions */}
            {isIos ? (
              <div className="mt-3 bg-slate-800/80 rounded-2xl p-2.5 border border-slate-700 text-[11px] font-bold text-slate-200 space-y-1">
                <div className={`flex items-center gap-1.5 ${isPartnerPage ? 'text-emerald-400' : 'text-amber-400'}`}>
                  <Share size={13} />
                  <span>لتثبيت التطبيق على آيفون:</span>
                </div>
                <p className="text-slate-300">
                  اضغط على زر المشاركة <Share size={12} className={`inline mx-0.5 ${isPartnerPage ? 'text-emerald-400' : 'text-orange-400'}`} /> بالأسفل ثم اختر <span className="text-white underline font-extrabold">"إضافة إلى الشاشة الرئيسية ➕"</span>.
                </p>
              </div>
            ) : (
              /* Android Direct 1-Click Install Button */
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className={`mt-3 w-full ${buttonStyle} text-white font-black text-xs py-2.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-75`}
              >
                {installing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>جاري التثبيت...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>ثبّت التطبيق الآن 📲</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
