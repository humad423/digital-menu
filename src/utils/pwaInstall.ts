'use client'

import { useSyncExternalStore } from 'react'
import { trackEvent } from '@/utils/analytics'
import { isInstalledApp, isIos } from '@/utils/appMode'
import { visitEntry } from '@/utils/visitOrigin'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 'prompt': the browser can show its install dialog. 'ios': needs the manual Share steps.
export type InstallAvailability = 'none' | 'prompt' | 'ios'

let deferredPrompt: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(listener => listener())

// Listening at import time, because the browser can fire this before React hydrates.
// Stopping the default also stops Chrome's own install popup: we only offer it quietly.
if (typeof window !== 'undefined') {
  // Noted on the very first page of the visit, before any link is followed, so a QR visit is known later
  visitEntry()
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferredPrompt = null
    trackEvent({ event_type: 'pwa_install' })
    notify()
  })
}

function getAvailability(): InstallAvailability {
  if (installed || isInstalledApp()) return 'none'
  if (deferredPrompt) return 'prompt'
  return isIos() ? 'ios' : 'none'
}

export function useInstallAvailability(): InstallAvailability {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getAvailability,
    () => 'none'
  )
}

/** Shows the browser's install dialog. It can only be used once per event. */
export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return
  const event = deferredPrompt
  deferredPrompt = null
  notify()
  await event.prompt()
  await event.userChoice
}
