/** True when the page is open as the installed app rather than in the browser. */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || iPadOs
}
