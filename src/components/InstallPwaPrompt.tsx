'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X, Share, Sparkles, Loader2 } from 'lucide-react'

export default function InstallPwaPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const deferredRef = useRef<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // 1. Strictly ONLY show on Homepage (/)
    if (pathname !== '/') {
      setShowPrompt(false)
      return
    }

    // 2. Check if already installed in standalone mode
    const isStandaloneApp = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )

    if (isStandaloneApp) {
      setIsStandalone(true)
      return
    }

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.update()
      }).catch(() => {})
    }

    // 4. Check if early captured beforeinstallprompt exists
    if (typeof window !== 'undefined' && (window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt)
      deferredRef.current = (window as any).deferredPwaPrompt
    }

    // 5. Detect iOS Safari
    const ua = window.navigator.userAgent
    const isIosDevice = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    setIsIos(isIosDevice)

    // Check if dismissed in this session
    const sessionDismissed = typeof window !== 'undefined' ? sessionStorage.getItem('alfsouq_pwa_dismissed') : null
    if (sessionDismissed) {
      return
    }

    // Show prompt banner after 1 second on Homepage
    const timer = setTimeout(() => {
      setShowPrompt(true)
    }, 1000)

    // 6. Listen for late beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      ;(window as any).deferredPwaPrompt = e
      deferredRef.current = e
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setShowPrompt(false)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [pathname])

  const handleInstallClick = async () => {
    setInstalling(true)

    let promptObj = (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null) || deferredPrompt || deferredRef.current

    if (!promptObj) {
      // Wait up to 2 seconds for beforeinstallprompt
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 100))
        promptObj = (typeof window !== 'undefined' ? (window as any).deferredPwaPrompt : null) || deferredRef.current
        if (promptObj) break
      }
    }

    if (promptObj) {
      try {
        await promptObj.prompt()
        const { outcome } = await promptObj.userChoice
        if (outcome === 'accepted') {
          setShowPrompt(false)
          setIsStandalone(true)
        }
      } catch (err) {
        console.log('Install prompt error:', err)
      } finally {
        setInstalling(false)
        setDeferredPrompt(null)
        deferredRef.current = null
        if (typeof window !== 'undefined') (window as any).deferredPwaPrompt = null
      }
    } else {
      setInstalling(false)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('alfsouq_pwa_dismissed', 'true')
  }

  // Hide completely if NOT on Homepage (/) OR running in native standalone app
  if (pathname !== '/' || isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto dir-rtl animate-slide-up">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 border border-slate-700/80 shadow-2xl relative overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-orange-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
          title="إغلاق"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 shadow-md shrink-0 flex items-center justify-center text-white font-black text-xl">
            📲
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <h4 className="font-black text-sm text-white flex items-center gap-1.5 mb-0.5">
              <span>ثبّت تطبيق "ألف سوق"</span>
              <Sparkles size={14} className="text-amber-400" />
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              تصفح أسرع، وصول بنقرة واحدة من شاشة الهاتف، ودعم تصفح بدون إنترنت.
            </p>

            {/* iOS Instructions */}
            {isIos ? (
              <div className="mt-3 bg-slate-800/80 rounded-2xl p-2.5 border border-slate-700 text-[11px] font-bold text-slate-200 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Share size={13} />
                  <span>لتثبيت التطبيق على آيفون:</span>
                </div>
                <p className="text-slate-300">
                  اضغط على زر المشاركة <Share size={12} className="inline mx-0.5 text-orange-400" /> بالأسفل ثم اختر <span className="text-white underline font-extrabold">"إضافة إلى الشاشة الرئيسية ➕"</span>.
                </p>
              </div>
            ) : (
              /* Android Direct 1-Click Install Button */
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="mt-3 w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs py-2.5 px-4 rounded-2xl shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer disabled:opacity-75"
              >
                {installing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>جاري فتح نافذة التثبيت...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>تثبيت التطبيق بنقرة واحدة 📲</span>
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
