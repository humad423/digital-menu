'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Hide progress bar when route finishes changing
  useEffect(() => {
    setProgress(100)
    const timer = setTimeout(() => {
      setLoading(false)
      setProgress(0)
    }, 200)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  // Attach global click listener to internal links for 0ms instant click response
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.currentTarget as HTMLAnchorElement
      if (!target) return
      const href = target.getAttribute('href')

      // Only trigger for internal route navigation
      if (href && href.startsWith('/') && !href.startsWith('#') && target.target !== '_blank') {
        if (href !== window.location.pathname) {
          setLoading(true)
          setProgress(30)
          const interval = setInterval(() => {
            setProgress(prev => {
              if (prev >= 85) {
                clearInterval(interval)
                return 85
              }
              return prev + 15
            })
          }, 80)
        }
      }
    }

    const anchors = document.querySelectorAll('a[href]')
    anchors.forEach(anchor => anchor.addEventListener('click', handleAnchorClick as EventListener))

    // Use MutationObserver for dynamically added links
    const observer = new MutationObserver(() => {
      const currentAnchors = document.querySelectorAll('a[href]')
      currentAnchors.forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick as EventListener)
        anchor.addEventListener('click', handleAnchorClick as EventListener)
      })
    })

    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      anchors.forEach(anchor => anchor.removeEventListener('click', handleAnchorClick as EventListener))
      observer.disconnect()
    }
  }, [pathname])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[9999] pointer-events-none">
      <div
        className="h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 transition-all duration-200 ease-out shadow-sm"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0
        }}
      />
    </div>
  )
}
